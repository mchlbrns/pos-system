import React, { useEffect } from 'react';
import useStore from '../store/useStore';
import { offlineQueue } from '../services/offlineQueue';

export default function Header() {
  const { user, isOnline, setOnline } = useStore();

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      offlineQueue.syncQueue();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  const handleSyncClick = async () => {
    if (isOnline) {
      const result = await offlineQueue.syncQueue();
      if (result.success) {
        alert(`Synced ${result.count} offline orders!`);
      } else {
        alert('Sync issue: ' + result.reason);
      }
    } else {
      alert('Offline mode: Connect to internet to sync.');
    }
  };

  return (
    <header className="header glass-effect">
      <div className="header-left">
        <h2>Cashier Dashboard</h2>
      </div>

      <div className="header-right">
        <button 
          onClick={handleSyncClick}
          className="sync-btn"
          title="Force Sync Offline Transactions"
        >
          🔄 Sync
        </button>

        <div className="network-status">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
          <span className="status-label">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </div>

        <div className="user-profile">
          <div className="avatar">👤</div>
          <div className="user-info">
            <span className="user-name">{user ? user.full_name : 'Cashier'}</span>
            <span className="user-role">{user ? user.role : 'Staff'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
