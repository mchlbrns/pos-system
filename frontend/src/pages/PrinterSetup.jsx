import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Printer, RefreshCw, Check, AlertCircle, Play } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PrinterSetup() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [printerType, setPrinterType] = useState('thermal'); // thermal or impact
  const [currentDefault, setCurrentDefault] = useState(null);
  
  const token = localStorage.getItem('token');
  const api = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    headers: { Authorization: `Bearer ${token}` }
  });

  const scanPrinters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/printer/list');
      if (res.data.success) {
        setPrinters(res.data.data);
        toast.success('Scanner finished');
      }
    } catch (e) {
      toast.error('Failed to scan printers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        const settings = res.data.data;
        if (settings.printer_address) {
          setCurrentDefault({
            name: settings.printer_name || 'POS-Printer',
            address: settings.printer_address,
            type: settings.printer_type || 'thermal'
          });
          setPrinterType(settings.printer_type || 'thermal');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    scanPrinters();
    fetchCurrentSettings();
  }, []);

  const handleTestPrint = async (printer) => {
    const target = printer || selectedPrinter;
    if (!target) {
      toast.error('Please select a printer to test');
      return;
    }
    const toastId = toast.loading('Sending test print command...');
    try {
      const res = await api.post('/printer/test', {
        name: target.name,
        address: target.address,
        type: printerType
      });
      if (res.data.success) {
        toast.success('Test receipt printed successfully!', { id: toastId });
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Test print failed. Check connection.', { id: toastId });
    }
  };

  const handleSaveDefault = async () => {
    if (!selectedPrinter) {
      toast.error('Please select a printer first');
      return;
    }
    try {
      const res = await api.post('/printer/set-default', {
        name: selectedPrinter.name,
        address: selectedPrinter.address,
        type: printerType
      });
      if (res.data.success) {
        toast.success('Printer set as default!');
        setCurrentDefault({
          name: selectedPrinter.name,
          address: selectedPrinter.address,
          type: printerType
        });
      }
    } catch (e) {
      toast.error('Failed to save printer settings');
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <div>
          <h2 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Printer style={{ width: 28, height: 28, color: 'var(--accent)' }} />
            Printer Setup Wizard
          </h2>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>
            Configure thermal receipt printers, impact drivers, or network systems.
          </p>
        </div>
        <button
          onClick={scanPrinters}
          disabled={loading}
          className="plugin-activate-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Scan Hardware
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-lg)' }}>
        {/* Settings & Info Card */}
        <div className="admin-card">
          <h3>Active Printer</h3>
          {currentDefault ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', position: 'relative' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{currentDefault.name}</p>
              <p style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 4 }}>{currentDefault.address}</p>
              <span className="type-badge" style={{ marginTop: 10, display: 'inline-block' }}>
                {currentDefault.type}
              </span>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: 'var(--space-lg)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', position: 'relative' }}>
              No default printer configured
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: 'var(--space-lg)', position: 'relative' }}>
            <p style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>Printer Family</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px', borderRadius: 'var(--radius-sm)', transition: 'background 0.15s' }}>
                <input
                  type="radio"
                  name="printerType"
                  value="thermal"
                  checked={printerType === 'thermal'}
                  onChange={(e) => setPrinterType(e.target.value)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Thermal Receipt (58mm/80mm)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px', borderRadius: 'var(--radius-sm)', transition: 'background 0.15s' }}>
                <input
                  type="radio"
                  name="printerType"
                  value="impact"
                  checked={printerType === 'impact'}
                  onChange={(e) => setPrinterType(e.target.value)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Impact Dot-Matrix</span>
              </label>
            </div>
          </div>
        </div>

        {/* List of Detected Hardware */}
        <div className="admin-card">
          <h3>Detected Hardware Devices</h3>

          {loading ? (
            <div className="loading-state" style={{ padding: 'var(--space-2xl)', position: 'relative' }}>
              <RefreshCw style={{ width: 32, height: 32, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              <p className="loading-text">Scanning USB and network ports...</p>
            </div>
          ) : printers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
              {printers.map((printer) => {
                const isSelected = selectedPrinter?.address === printer.address;
                return (
                  <div
                    key={printer.address}
                    onClick={() => setSelectedPrinter(printer)}
                    className="report-list-item"
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--accent)' : undefined,
                      background: isSelected ? 'var(--accent-bg)' : undefined,
                      boxShadow: isSelected ? '0 0 16px var(--accent-glow)' : undefined
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Printer style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                        {printer.name}
                      </p>
                      <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 3 }}>{printer.address}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestPrint(printer);
                        }}
                        className="cart-item-remove"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Print Test Receipt"
                      >
                        <Play style={{ width: 14, height: 14 }} />
                      </button>
                      {isSelected && (
                        <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '50%', padding: 4, display: 'flex' }}>
                          <Check style={{ width: 14, height: 14 }} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
              <AlertCircle style={{ width: 36, height: 36, marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: '0.82rem', fontWeight: 500 }}>No printers detected. Plug in your USB device.</p>
              <button onClick={scanPrinters} style={{ marginTop: 12, color: 'var(--accent-light)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none' }}>
                Scan again
              </button>
            </div>
          )}

          {selectedPrinter && (
            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-muted)', display: 'flex', gap: 12, justifyContent: 'flex-end', position: 'relative' }}>
              <button onClick={() => handleTestPrint(null)} className="admin-lock-btn" style={{ width: 'auto', padding: '9px 20px' }}>
                Test Printer
              </button>
              <button onClick={handleSaveDefault} className="plugin-activate-btn">
                Save Printer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
