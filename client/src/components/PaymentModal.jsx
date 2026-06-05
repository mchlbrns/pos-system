import React, { useState } from 'react';

export default function PaymentModal({ total, isOpen, onClose, onSubmit }) {
  const [method, setMethod] = useState('cash');
  const [tendered, setTendered] = useState('');
  const [refNum, setRefNum] = useState('');

  if (!isOpen) return null;

  const change = Math.max(0, parseFloat(tendered || 0) - total);
  const isPaidEnough = method !== 'cash' ? true : parseFloat(tendered || 0) >= total;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isPaidEnough) return;
    
    onSubmit({
      method,
      amount: method === 'cash' ? parseFloat(tendered) : total,
      reference_number: refNum
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container glass-effect">
        <div className="modal-header">
          <h3>Checkout Payment</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="payment-form">
          <div className="total-display">
            <span>Grand Total:</span>
            <span className="total-value">₱{total.toFixed(2)}</span>
          </div>

          <div className="form-group">
            <label>Payment Method</label>
            <div className="payment-methods-grid">
              {['cash', 'gcash', 'maya', 'card'].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`payment-method-card ${method === m ? 'selected' : ''}`}
                  data-testid={`payment-${m}`}
                  onClick={() => {
                    setMethod(m);
                    if (m !== 'cash') {
                      setTendered(total.toString());
                    } else {
                      setTendered('');
                    }
                  }}
                >
                  <span className="method-icon">
                    {m === 'cash' && '💵'}
                    {m === 'gcash' && '🔵'}
                    {m === 'maya' && '🟢'}
                    {m === 'card' && '💳'}
                  </span>
                  <span className="method-label">{m.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {method === 'cash' ? (
            <div className="form-group">
              <label>Amount Tendered (Cash Paid)</label>
              <input
                type="number"
                step="0.01"
                className="form-control focus-highlight"
                name="amountTendered"
                data-testid="amount-tendered"
                required
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
          ) : (
            <div className="form-group animate-slide-in">
              <label>GCash/PayMaya Reference Number</label>
              <input
                type="text"
                className="form-control"
                data-testid="reference-number"
                required
                value={refNum}
                onChange={(e) => setRefNum(e.target.value)}
                placeholder="13-Digit Ref Number"
                autoFocus
              />
            </div>
          )}

          {method === 'cash' && (
            <div className="change-display">
              <span>Change Amount:</span>
              <span className="change-value" data-testid="change-amount">₱{change.toFixed(2)}</span>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success" data-testid="confirm-payment" disabled={!isPaidEnough}>
              Process Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
