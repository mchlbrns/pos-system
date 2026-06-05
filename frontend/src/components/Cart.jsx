import React from 'react';
import { Trash2, Plus, Minus, User, CreditCard, ShoppingCart } from 'lucide-react';

export default function Cart({ cart, customers, selectedCustomer, setSelectedCustomer, discountType, setDiscountType, onUpdateQty, onDeleteItem, onCheckout, totals }) {
  return (
    <>
      {/* Customer Picker */}
      <div className="cart-customer-bar">
        <User />
        <select
          aria-label="Select customer"
          value={selectedCustomer || ''}
          onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">Walk-in Customer</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
          ))}
        </select>
      </div>

      {/* Cart Items List */}
      <div className="cart-items-list">
        {cart.length > 0 ? (
          cart.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">₱{(item.price).toFixed(2)} / {item.unit}</div>
                
                {/* Plugin items details e.g. custom inputs if any */}
                {item.plugin_attributes && Object.keys(item.plugin_attributes).length > 0 && (
                  <div className="cart-item-attrs">
                    {Object.entries(item.plugin_attributes).map(([k, v]) => (
                      <span key={k} className="cart-item-attr-tag">{k}: {String(v)}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Adjust Qty */}
              <div className="cart-item-qty">
                <button aria-label="Decrease quantity" onClick={() => onUpdateQty(item.id, item.quantity - 1)}>
                  <Minus style={{ width: 14, height: 14 }} />
                </button>
                <span className="cart-item-qty-value">{item.quantity}</span>
                <button aria-label="Increase quantity" onClick={() => onUpdateQty(item.id, item.quantity + 1)}>
                  <Plus style={{ width: 14, height: 14 }} />
                </button>
              </div>

              <button
                onClick={() => onDeleteItem(item.id)}
                className="cart-item-remove"
                title="Remove Item"
                aria-label="Remove item"
              >
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
            </div>
          ))
        ) : (
          <div className="cart-empty">
            <ShoppingCart />
            <p>Your sales cart is empty.</p>
            <span>Click products on the left to add items</span>
          </div>
        )}
      </div>

      {/* Cart Summary Controls & Checkout */}
      <div className="cart-footer">
        {/* Discount Selection */}
        <div className="discount-row">
          <button
            onClick={() => setDiscountType(null)}
            className={`discount-btn ${discountType === null ? 'active' : ''}`}
          >
            No Discount
          </button>
          <button
            onClick={() => setDiscountType('percent_10')}
            className={`discount-btn ${discountType === 'percent_10' ? 'active' : ''}`}
          >
            10% Off
          </button>
          <button
            onClick={() => setDiscountType('percent_20')}
            className={`discount-btn ${discountType === 'percent_20' ? 'active' : ''}`}
          >
            20% Off
          </button>
          <button
            onClick={() => setDiscountType('senior_pwd')}
            className={`discount-btn ${discountType === 'senior_pwd' ? 'active' : ''}`}
            title="Philippine Senior Citizen / PWD 20% Discount + VAT Exemption"
          >
            Senior/PWD
          </button>
        </div>

        {/* Calculations */}
        <div className="cart-totals">
          <div className="cart-total-row">
            <span>Subtotal</span>
            <span>₱{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="cart-total-row">
            <span>VAT (12%)</span>
            <span>₱{totals.tax_amount.toFixed(2)}</span>
          </div>
          <div className="cart-total-row discount-row-display">
            <span>Discounts</span>
            <span>-₱{totals.discount_amount.toFixed(2)}</span>
          </div>
          <div className="cart-total-row grand-total">
            <span>TOTAL due</span>
            <span>₱{totals.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="checkout-btn"
        >
          <CreditCard style={{ width: 20, height: 20 }} />
          Collect Payment
        </button>
      </div>
    </>
  );
}
