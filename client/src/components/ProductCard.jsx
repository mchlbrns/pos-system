import React from 'react';

export default function ProductCard({ product, onAdd }) {
  const { name, price, quantity, unit, sku, plugin_attributes } = product;
  const isOutOfStock = quantity <= 0;

  const getPluginMeta = () => {
    if (!plugin_attributes) return null;
    const attrs = typeof plugin_attributes === 'string' ? JSON.parse(plugin_attributes) : plugin_attributes;
    if (attrs.gallon_type) {
      return `Gallon: ${attrs.gallon_type}`;
    }
    if (attrs.service_type) {
      return `Service: ${attrs.service_type}`;
    }
    return null;
  };

  return (
    <div 
      className={`product-card glass-effect ${isOutOfStock ? 'out-of-stock' : ''}`}
      onClick={() => !isOutOfStock && onAdd(product)}
    >
      <div className="product-details">
        <span className="sku">{sku || 'NO-SKU'}</span>
        <h3 className="product-name">{name}</h3>
        {getPluginMeta() && <span className="plugin-meta-badge">{getPluginMeta()}</span>}
      </div>

      <div className="product-footer">
        <div className="price-tag">₱{parseFloat(price).toFixed(2)}</div>
        <div className="stock-status">
          {isOutOfStock ? (
            <span className="stock-badge danger">Out of Stock</span>
          ) : (
            <span className="stock-badge success">{quantity} {unit || 'pc'}</span>
          )}
        </div>
      </div>
    </div>
  );
}
