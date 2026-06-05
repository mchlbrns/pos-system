/**
 * @fileoverview Automatic Printer Detection Utility.
 *
 * Scans for connected printers across three transports:
 * 1. **USB** — enumerates USB devices and filters by printer device class
 * 2. **Network** — probes common POS printer ports (9100, 515) on the LAN
 * 3. **Serial** — lists available COM / tty ports
 *
 * Returns a unified array of detected printer descriptors.
 *
 * @module PrinterDetector
 */

'use strict';

const net = require('net');
const os  = require('os');

/**
 * @typedef {Object} DetectedPrinter
 * @property {'usb'|'network'|'serial'} type       - Connection type
 * @property {string}                   name       - Human-readable printer name
 * @property {string}                   address    - Address (IP, COM port, USB path)
 * @property {number}                   [port]     - TCP port for network printers
 * @property {number}                   [vendorId] - USB vendor ID
 * @property {number}                   [productId]- USB product ID
 * @property {'online'|'offline'|'unknown'} status - Printer availability
 */

/**
 * Printer auto-detection utility.
 */
class PrinterDetector {
  /**
   * @param {Object} [options]
   * @param {string[]} [options.networkSubnets]    - Subnets to scan (e.g. ['192.168.1'])
   * @param {number[]} [options.networkPorts]       - Ports to probe (default [9100, 515])
   * @param {number}   [options.networkTimeoutMs]   - TCP connect timeout (default 500)
   * @param {number}   [options.maxNetworkHosts]    - Max hosts per subnet to scan (default 254)
   * @param {boolean}  [options.scanUsb]            - Whether to scan USB (default true)
   * @param {boolean}  [options.scanNetwork]        - Whether to scan network (default true)
   * @param {boolean}  [options.scanSerial]         - Whether to scan serial (default true)
   */
  constructor(options = {}) {
    this.networkPorts     = options.networkPorts || [9100, 515];
    this.networkTimeoutMs = options.networkTimeoutMs || 500;
    this.maxNetworkHosts  = options.maxNetworkHosts || 254;
    this.scanUsb          = options.scanUsb !== false;
    this.scanNetwork      = options.scanNetwork !== false;
    this.scanSerial       = options.scanSerial !== false;

    // Auto-detect local subnets if none provided
    this.networkSubnets = options.networkSubnets || this._getLocalSubnets();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Run all configured scans and return detected printers.
   * @returns {Promise<DetectedPrinter[]>}
   */
  async detectPrinters() {
    /** @type {DetectedPrinter[]} */
    const results = [];

    const scans = [];
    if (this.scanUsb)     scans.push(this._scanUsb().then(r => results.push(...r)));
    if (this.scanSerial)  scans.push(this._scanSerial().then(r => results.push(...r)));
    if (this.scanNetwork) scans.push(this._scanNetwork().then(r => results.push(...r)));

    await Promise.allSettled(scans);
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  USB SCANNING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Scan for USB printers.
   * @private
   * @returns {Promise<DetectedPrinter[]>}
   */
  async _scanUsb() {
    /** @type {DetectedPrinter[]} */
    const printers = [];

    // Attempt 1: use escpos-usb to find ESC/POS printers
    try {
      const USB = require('escpos-usb');
      const devices = USB.findPrinter();
      if (devices && devices.length) {
        for (const dev of devices) {
          printers.push({
            type: 'usb',
            name: this._usbDeviceName(dev),
            address: `USB:${this._hex(dev.deviceDescriptor?.idVendor)}:${this._hex(dev.deviceDescriptor?.idProduct)}`,
            vendorId: dev.deviceDescriptor?.idVendor,
            productId: dev.deviceDescriptor?.idProduct,
            status: 'online',
          });
        }
      }
    } catch {
      // escpos-usb not available — try generic usb package
    }

    // Attempt 2: use generic `usb` package
    if (printers.length === 0) {
      try {
        const usb = require('usb');
        const devices = usb.getDeviceList ? usb.getDeviceList() : [];
        for (const dev of devices) {
          // USB printer class = 7
          const desc = dev.deviceDescriptor;
          if (!desc) continue;

          // Check interface descriptors for printer class
          let isPrinter = false;
          try {
            dev.open();
            for (let i = 0; i < (dev.interfaces?.length || 0); i++) {
              const iface = dev.interfaces[i];
              if (iface?.descriptor?.bInterfaceClass === 7) {
                isPrinter = true;
                break;
              }
            }
            dev.close();
          } catch {
            // Can't open — might be in use
          }

          if (isPrinter) {
            printers.push({
              type: 'usb',
              name: `USB Printer [${this._hex(desc.idVendor)}:${this._hex(desc.idProduct)}]`,
              address: `USB:${this._hex(desc.idVendor)}:${this._hex(desc.idProduct)}`,
              vendorId: desc.idVendor,
              productId: desc.idProduct,
              status: 'online',
            });
          }
        }
      } catch {
        // usb package not available
      }
    }

    if (printers.length === 0) {
      console.log('[PrinterDetector] No USB printers detected (usb/escpos-usb packages may not be installed).');
    }

    return printers;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  NETWORK SCANNING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Scan network subnets for printers listening on common POS ports.
   * @private
   * @returns {Promise<DetectedPrinter[]>}
   */
  async _scanNetwork() {
    /** @type {DetectedPrinter[]} */
    const printers = [];

    for (const subnet of this.networkSubnets) {
      const probes = [];
      for (let host = 1; host <= this.maxNetworkHosts; host++) {
        const ip = `${subnet}.${host}`;
        for (const port of this.networkPorts) {
          probes.push(this._probeHost(ip, port));
        }
      }

      const results = await Promise.allSettled(probes);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          printers.push(result.value);
        }
      }
    }

    return printers;
  }

  /**
   * Attempt a TCP connection to check for a printer.
   * @private
   * @param {string} ip
   * @param {number} port
   * @returns {Promise<DetectedPrinter|null>}
   */
  _probeHost(ip, port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(this.networkTimeoutMs);

      socket.connect(port, ip, () => {
        socket.destroy();
        resolve({
          type: 'network',
          name: `Network Printer @ ${ip}:${port}`,
          address: ip,
          port,
          status: 'online',
        });
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(null);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SERIAL SCANNING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Scan for serial (COM) ports that may have printers attached.
   * @private
   * @returns {Promise<DetectedPrinter[]>}
   */
  async _scanSerial() {
    /** @type {DetectedPrinter[]} */
    const printers = [];

    try {
      const { SerialPort } = require('serialport');
      const ports = await SerialPort.list();

      for (const port of ports) {
        // Filter for likely printer ports (manufacturer hint or generic COM)
        const name = port.manufacturer
          ? `${port.manufacturer} @ ${port.path}`
          : `Serial Port ${port.path}`;

        printers.push({
          type: 'serial',
          name,
          address: port.path,
          status: 'unknown', // Can't determine without opening the port
        });
      }
    } catch {
      // serialport package not installed — try listing COM ports on Windows
      if (process.platform === 'win32') {
        for (let i = 1; i <= 16; i++) {
          const comPath = `COM${i}`;
          try {
            // Quick existence check (will fail if port doesn't exist)
            const { execSync } = require('child_process');
            execSync(`mode ${comPath}`, { stdio: 'pipe', timeout: 1000 });
            printers.push({
              type: 'serial',
              name: `Serial Port ${comPath}`,
              address: comPath,
              status: 'unknown',
            });
          } catch {
            // Port doesn't exist or is busy
          }
        }
      }
    }

    return printers;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UTILITY
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get local IPv4 subnets from network interfaces.
   * @private
   * @returns {string[]} e.g. ['192.168.1']
   */
  _getLocalSubnets() {
    const subnets = new Set();
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const parts = iface.address.split('.');
          if (parts.length === 4) {
            subnets.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
          }
        }
      }
    }

    return Array.from(subnets);
  }

  /**
   * Format an integer as 0xHHHH.
   * @private
   * @param {number} n
   * @returns {string}
   */
  _hex(n) {
    if (n === undefined || n === null) return '0x0000';
    return '0x' + n.toString(16).padStart(4, '0');
  }

  /**
   * Try to extract a friendly device name from a USB device descriptor.
   * @private
   * @param {Object} dev
   * @returns {string}
   */
  _usbDeviceName(dev) {
    try {
      if (dev.deviceDescriptor) {
        const vid = this._hex(dev.deviceDescriptor.idVendor);
        const pid = this._hex(dev.deviceDescriptor.idProduct);
        return `USB Printer [${vid}:${pid}]`;
      }
    } catch { /* ignore */ }
    return 'USB Printer';
  }
}

module.exports = PrinterDetector;
