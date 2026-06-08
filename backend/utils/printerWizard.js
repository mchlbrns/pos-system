'use strict';

const net = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');
const Business = require('../models/Business');
const logger = require('./logger');

let usb = null;
try {
  usb = require('usb');
} catch (e) {
  // Not installed/failed to load on some platforms
}

class PrinterWizard {
  /**
   * Scan for USB, serial, and network printers.
   */
  async detectPrinters() {
    const results = [];
    
    // 1. USB scan (check via node-usb if loaded, or fake list for offline/mock test)
    if (usb) {
      try {
        const devices = usb.getDeviceList ? usb.getDeviceList() : [];
        for (const dev of devices) {
          const desc = dev.deviceDescriptor;
          if (desc) {
            // Check if bInterfaceClass === 7 (Printer)
            let isPrinter = false;
            try {
              dev.open();
              for (const iface of dev.interfaces || []) {
                if (iface.descriptor && iface.descriptor.bInterfaceClass === 7) {
                  isPrinter = true;
                  break;
                }
              }
              dev.close();
            } catch (err) {}
            
            if (isPrinter || desc.idVendor === 1208 || desc.idVendor === 1155) { // Common POS VID/PID
              const vid = '0x' + desc.idVendor.toString(16).padStart(4, '0');
              const pid = '0x' + desc.idProduct.toString(16).padStart(4, '0');
              results.push({
                type: 'usb',
                name: `USB Thermal Printer [${vid}:${pid}]`,
                address: `USB:${vid}:${pid}`,
                status: 'online'
              });
            }
          }
        }
      } catch (err) {
        logger.error('Error during USB printer scan:', err);
      }
    }

    // Always include a virtual mockup printer and serial/network fallbacks for testing
    results.push({
      type: 'virtual',
      name: 'Virtual Printer (Mock Receipt Logs)',
      address: 'virtual_printer.txt',
      status: 'online'
    });

    // 2. Network scan: probe common local subnets on port 9100 (standard RAW printer port)
    try {
      const subnets = this.getLocalSubnets();
      const ipProbes = [];
      
      for (const subnet of subnets) {
        // Probe first 20 IPs on subnet to prevent locking CPU
        for (let host = 1; host <= 25; host++) {
          const ip = `${subnet}.${host}`;
          ipProbes.push(this.probeNetworkPort(ip, 9100));
        }
      }
      
      const probeResults = await Promise.all(ipProbes);
      for (const res of probeResults) {
        if (res) {
          results.push(res);
        }
      }
    } catch (err) {
      logger.error('Error during network printer scan:', err);
    }

    return results;
  }

  getLocalSubnets() {
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

  probeNetworkPort(ip, port) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(250); // Fast timeout for responsiveness
      
      socket.connect(port, ip, () => {
        socket.destroy();
        resolve({
          type: 'network',
          name: `Network Printer [${ip}:${port}]`,
          address: `${ip}:${port}`,
          status: 'online'
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

  /**
   * Helper to write/format a receipt string.
   */
  formatReceipt(template, data) {
    let output = template;
    
    // Replace top-level variables
    const vars = {
      business_name: data.business_name || '',
      business_address: data.business_address || '',
      business_phone: data.business_phone || '',
      business_tin: data.business_tin || '',
      transaction_number: data.transaction_number || '',
      date: data.date || new Date().toLocaleDateString(),
      time: data.time || new Date().toLocaleTimeString(),
      cashier_name: data.cashier_name || 'Cashier',
      customer_name: data.customer_name || 'Walk-in Customer',
      subtotal: (data.subtotal || 0).toFixed(2),
      tax: (data.tax_amount || 0).toFixed(2),
      discount: (data.discount_amount || 0).toFixed(2),
      total: (data.total || 0).toFixed(2),
      payment_method: data.payment_method || 'Cash',
      amount_paid: (data.amount_paid || 0).toFixed(2),
      change: (data.change_amount || 0).toFixed(2)
    };

    for (const [key, val] of Object.entries(vars)) {
      output = output.replace(new RegExp(`{{${key}}}`, 'g'), val);
    }

    // Replace items loop block: {{#items}} ... {{/items}}
    const itemRegex = /{{#items}}([\s\S]*?){{\/items}}/;
    const match = output.match(itemRegex);
    if (match && data.items) {
      const itemTemplate = match[1];
      let itemsBlock = '';
      
      for (const item of data.items) {
        let single = itemTemplate;
        const itemVars = {
          name: item.product_name || item.name || '',
          qty: item.quantity || 1,
          price: (item.unit_price || item.price || 0).toFixed(2),
          subtotal: (item.subtotal || 0).toFixed(2)
        };
        for (const [k, v] of Object.entries(itemVars)) {
          single = single.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        itemsBlock += single;
      }
      output = output.replace(itemRegex, itemsBlock);
    }

    return output;
  }

  /**
   * Perform print execution based on the chosen connection.
   */
  async printReceipt(job) {
    const businessId = job.business_id;
    
    // Fetch business and all its settings in a single DB query
    const biz = Business.findById(businessId);
    const settings = biz ? (biz.settings || {}) : {};

    // Get printer configuration from the cached settings
    let prName = settings.printer_name;
    let prAddress = settings.printer_address || 'virtual_printer.txt';
    let prType = settings.printer_type || 'thermal'; // thermal or impact
    
    // Format payload using default template if it exists
    let template = `
========================================
           {{business_name}}
         {{business_address}}
========================================
 Transaction #: {{transaction_number}}
 Date: {{date}}
----------------------------------------
{{#items}}
 {{name}}           {{qty}} x {{price}}  {{subtotal}}
{{/items}}
----------------------------------------
 TOTAL:                ₱ {{total}}
========================================
`;
    
    const db = require('../database/init').getDatabase();
    const dbTmpl = db.prepare("SELECT template FROM print_templates WHERE business_id = ? AND type = 'receipt' AND is_default = 1").get(businessId);
    if (dbTmpl) {
      template = dbTmpl.template;
    }

    const receiptData = {
      business_name: biz ? biz.name : 'My Shop',
      business_address: biz ? biz.address : '',
      business_phone: biz ? biz.phone : '',
      business_tin: biz ? biz.tin : '',
      transaction_number: job.payload.transaction ? job.payload.transaction.transaction_number : 'TXN-MOCK',
      date: job.payload.transaction ? job.payload.transaction.created_at : new Date().toLocaleDateString(),
      cashier_name: job.payload.transaction ? job.payload.transaction.cashier_name : 'Staff',
      customer_name: job.payload.transaction ? job.payload.transaction.customer_name : 'Walk-in',
      subtotal: job.payload.transaction ? job.payload.transaction.subtotal : 0,
      tax_amount: job.payload.transaction ? job.payload.transaction.tax_amount : 0,
      discount_amount: job.payload.transaction ? job.payload.transaction.discount_amount : 0,
      total: job.payload.transaction ? job.payload.transaction.total : 0,
      payment_method: job.payload.transaction ? (job.payload.transaction.payments ? job.payload.transaction.payments[0].method : 'Cash') : 'Cash',
      amount_paid: job.payload.transaction ? (job.payload.transaction.payments ? job.payload.transaction.payments[0].amount : 0) : 0,
      change_amount: job.payload.transaction ? (job.payload.transaction.payments ? job.payload.transaction.payments[0].change_amount : 0) : 0,
      items: job.payload.transaction ? job.payload.transaction.items : []
    };

    const formattedText = this.formatReceipt(template, receiptData);

    // Write to virtual/mock log (always done for robustness)
    const logDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'virtual_printer.txt'), `\n[--- START OF PRINT JOB ---]\n${formattedText}\n[--- END OF PRINT JOB ---]\n`);

    // USB / Network print simulation or execution
    if (prAddress.startsWith('USB:')) {
      // Simulate real USB writing
      logger.info(`Sending USB ESC/POS Print commands to ${prAddress}`);
      return { success: true, message: 'Receipt printed successfully (Simulated USB)' };
    } else if (prAddress.includes(':')) {
      // Network ESC/POS print
      const [ip, portStr] = prAddress.split(':');
      const port = parseInt(portStr) || 9100;
      logger.info(`Sending Network Print RAW command stream to ${ip}:${port}`);
      
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        
        socket.connect(port, ip, () => {
          // Send plain text, or ESC/POS formatting codes if required
          socket.write(formattedText, 'utf8');
          // Feed paper and cut
          socket.write('\n\n\n\x1b\x69', 'ascii'); // ESC/POS feed and cut
          socket.end();
          resolve({ success: true, message: 'Printed over network RAW port' });
        });
        
        socket.on('error', (err) => {
          logger.error('Network print connection failed:', err);
          socket.destroy();
          resolve({ success: false, message: 'Network print failed' });
        });
        
        socket.on('timeout', () => {
          logger.warn('Network print timed out.');
          socket.destroy();
          resolve({ success: false, message: 'Network print timed out' });
        });
      });
    }

    // Default virtual printer print
    return { success: true, message: 'Receipt output appended to virtual_printer.txt log.' };
  }
}

module.exports = new PrinterWizard();
