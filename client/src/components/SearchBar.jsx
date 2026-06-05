import React from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Search products or scan barcode...' }) {
  return (
    <div className="search-bar-container">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="barcode-icon" title="Barcode Scanner Enabled">📷</span>
    </div>
  );
}
