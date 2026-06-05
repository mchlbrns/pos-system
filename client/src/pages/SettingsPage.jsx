import React, { useState, useEffect } from 'react';
import api from '../services/api';
import useStore from '../store/useStore';

export default function SettingsPage() {
  const { currentBusiness, setCurrentBusiness } = useStore();
  const [name, setName] = useState(currentBusiness.name);
  const [address, setAddress] = useState(currentBusiness.address || '');
  const [tin, setTin] = useState(currentBusiness.tin || '');
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState('Trial');
  const [activePlugin, setActivePlugin] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 4000);
  };

  useEffect(() => {
    fetchLicense();
    fetchActivePlugin();
  }, []);

  const fetchActivePlugin = async () => {
    try {
      const res = await api.get('/settings/plugin');
      setActivePlugin(res.data.activePlugin || res.data.businessType || 'general');
    } catch (e) {}
  };

  const fetchLicense = async () => {
    try {
      const res = await api.get('/settings/license');
      setLicenseKey(res.data.key);
      setLicenseStatus(res.data.status);
    } catch (e) {}
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings', { name, address, tin });
      setCurrentBusiness({ name, address, tin });
      showSuccess('Settings updated successfully');
    } catch (e) {
      showError('Failed to save settings');
    }
  };

  const handleActivateLicense = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/settings/license', { key: licenseKey });
      setLicenseStatus(res.data.status);
      showSuccess(res.data.message);
    } catch (err) {
      showError(err.response?.data?.error || 'Invalid activation key');
    }
  };

  const handleSwitchPlugin = async (pluginKey) => {
    try {
      const res = await api.post('/settings/plugin', { activePlugin: pluginKey });
      setActivePlugin(pluginKey);
      setCurrentBusiness({ type: pluginKey });
      showSuccess(res.data.message || `Successfully switched to ${pluginKey}`);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to switch business type');
    }
  };

  return (
    <div className="settings-page animate-fade-in">
      <h3>POS Settings & Configurations</h3>

      {successMsg && (
        <div className="success-message alert alert-success animate-fade-in" role="alert" style={{ marginTop: '15px' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="error-message alert alert-danger animate-fade-in" role="alert" style={{ marginTop: '15px' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <form onSubmit={handleSaveSettings} className="glass-effect" style={{ padding: '20px' }}>
          <h4>Store Information</h4>
          <div className="form-group">
            <label>Business Name</label>
            <input type="text" className="form-control" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Store Address</label>
            <input type="text" className="form-control" value={address} onChange={e=>setAddress(e.target.value)} />
          </div>
          <div className="form-group">
            <label>TIN Number</label>
            <input type="text" className="form-control" value={tin} onChange={e=>setTin(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary">Save Information</button>
        </form>

        <div className="glass-effect" style={{ padding: '20px' }}>
          <h4>Software Licensing</h4>
          <div style={{ marginBottom: '15px' }}>
            <span>Status:</span>
            <span className={`badge ${licenseStatus === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: '10px' }}>
              {licenseStatus.toUpperCase()}
            </span>
          </div>

          <form onSubmit={handleActivateLicense}>
            <div className="form-group">
              <label>Enter License Activation Key</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="XXXX-XXXX-XXXX-XXXX" 
                value={licenseKey}
                onChange={e=>setLicenseKey(e.target.value.toUpperCase())}
                required 
              />
              <small style={{ color: 'var(--muted-color)', display: 'block', marginTop: '5px' }}>
                Activation format: 16-character alphanumeric key.
              </small>
            </div>
            <button type="submit" className="btn btn-success">Activate License</button>
          </form>
        </div>

        {/* Plugin / Business Type Settings Section */}
        <div className="glass-effect" style={{ padding: '20px' }} data-testid="plugin-settings">
          <h4>Business Type & Plugins</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted-color)', marginBottom: '15px' }}>
            Select your active business plugin to enable specialized features, receipt templates, and product configurations.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { key: 'waterstation', name: 'Water Station', desc: 'Manage refills, containers, and dispenser deposits.' },
              { key: 'laundry', name: 'Laundry Shop', desc: 'Track wash & fold weight (kg), services, and pickups.' },
              { key: 'motorepair', name: 'Motor Repair Shop', desc: 'Manage parts, vehicle plates, labor, and job orders.' }
            ].map(plugin => {
              const isActive = activePlugin === plugin.key;
              return (
                <button
                  key={plugin.key}
                  type="button"
                  data-testid={`plugin-${plugin.key}`}
                  data-plugin={plugin.key}
                  className={`btn ${isActive ? 'btn-primary active-plugin' : 'btn-outline'}`}
                  aria-selected={isActive ? 'true' : 'false'}
                  onClick={() => handleSwitchPlugin(plugin.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '12px',
                    textAlign: 'left',
                    width: '100%',
                    border: isActive ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                    background: isActive ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'inherit'
                  }}
                >
                  <strong style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    {plugin.name}
                    {isActive && <span style={{ color: 'var(--primary-color)' }}>✓ Active</span>}
                  </strong>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>{plugin.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
