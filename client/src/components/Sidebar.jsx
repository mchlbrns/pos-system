import React from 'react';
import { NavLink } from 'react-router-dom';
import useStore from '../store/useStore';

export default function Sidebar() {
  const { currentBusiness } = useStore();

  const menuItems = [
    { path: '/', label: 'Cashier POS', icon: '💰' },
    { path: '/products', label: 'Inventory', icon: '📦' },
    { path: '/transactions', label: 'Sales History', icon: '📝' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/reports', label: 'Reports', icon: '📈' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <aside className="sidebar glass-effect">
      <div className="sidebar-brand">
        <div className="brand-logo">🇵🇭</div>
        <div className="brand-name">
          <h4>{currentBusiness.name || 'Universal POS'}</h4>
          <span className="badge badge-primary">{currentBusiness.type || 'General'}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const testId = `nav-${item.path === '/' ? 'pos' : item.path.replace('/', '')}`;
          return (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid={testId}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="system-version">v1.0.0 (Offline-First)</div>
      </div>
    </aside>
  );
}
