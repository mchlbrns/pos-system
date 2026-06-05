import React from 'react';

export default function CartItem({ item, onUpdateQty, onRemove }) {
  return (
    <div className="cart-item glass-effect">
      <div className="item-info">
        <h4>{item.name}</h4>
        <span className="price-desc">₱{parseFloat(item.price).toFixed(2)} / {item.unit || 'pc'}</span>
      </div>

      <div className="item-actions">
        <div className="qty-controls">
          <button onClick={() => onUpdateQty(item.id, item.quantity - 1)} className="btn-qty">-</button>
          <span className="qty-display">{item.quantity}</span>
          <button onClick={() => onUpdateQty(item.id, item.quantity + 1)} className="btn-qty">+</button>
        </div>
        
        <div className="item-total">
          ₱{parseFloat(item.price * item.quantity).toFixed(2)}
        </div>

        <button onClick={() => onRemove(item.id)} className="btn-remove remove-item" data-testid="remove-item" title="Remove Item">
          🗑️
        </button>
      </div>
    </div>
  );
}
