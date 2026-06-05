import React, { useState, useEffect } from 'react';
import { X, Check, Calculator } from 'lucide-react';

export default function PaymentModal({ total, onConfirm, onClose }) {
  const [amountPaid, setAmountPaid] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [change, setChange] = useState(0);

  // Auto calculate change
  useEffect(() => {
    const paid = parseFloat(amountPaid) || 0;
    setChange(Math.max(0, paid - total));
  }, [amountPaid, total]);

  const handleKeyPress = (num) => {
    if (num === 'C') {
      setAmountPaid('');
    } else if (num === '.') {
      if (!amountPaid.includes('.')) {
        setAmountPaid(amountPaid + '.');
      }
    } else {
      setAmountPaid(amountPaid + num);
    }
  };

  const handleQuickCash = (amt) => {
    if (amt === 'exact') {
      setAmountPaid(total.toFixed(2));
    } else {
      setAmountPaid(amt.toString());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const paid = parseFloat(amountPaid) || 0;
    if (paid < total && method === 'cash') {
      alert('Amount paid cannot be less than total due for Cash payments.');
      return;
    }
    onConfirm({
      method,
      amount: paid,
      reference_number: reference,
      change_amount: change
    });
  };

  return (
    <div className="modal-overlay">
      <div className="payment-modal">
        
        {/* Left Side: Payment Details */}
        <div className="payment-left">
          <div>
            <div className="payment-header">
              <h2>Checkout Bill</h2>
              <button onClick={onClose} className="payment-close-btn">
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Total due block */}
            <div className="payment-total-block">
              <p className="payment-total-label">Total Amount Due</p>
              <p className="payment-total-amount">₱{total.toFixed(2)}</p>
            </div>

            {/* Payment Method selection */}
            <div>
              <p className="payment-methods-label">Payment Method</p>
              <div className="payment-methods-grid">
                {['cash', 'gcash', 'maya', 'card', 'bank_transfer'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMethod(m);
                      if (m !== 'cash') {
                        setAmountPaid(total.toFixed(2));
                      }
                    }}
                    className={`payment-method-btn ${method === m ? 'active' : ''}`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Change calculations */}
            <div className="payment-change-block">
              <div>
                <p className="payment-change-label">Customer Change</p>
                <p className="payment-change-amount">₱{change.toFixed(2)}</p>
              </div>
              <Calculator style={{ width: 28, height: 28, color: 'var(--success)', opacity: 0.25 }} />
            </div>
          </div>

          {/* Reference code for e-wallets */}
          {method !== 'cash' && (
            <div className="reference-input-group">
              <label>Reference Number</label>
              <input
                type="text"
                placeholder="e.g. Ref No., Card digits"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Right Side: Keypad / Inputs */}
        <div className="payment-right">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-md)' }}>
            <div style={{ flex: 1 }}>
              <p className="amount-input-label">Amount Received</p>
              <input
                type="text"
                readOnly
                placeholder="0.00"
                value={amountPaid}
                className="amount-input"
              />

              {/* Quick Cash selections */}
              <div className="quick-cash-grid">
                <button type="button" onClick={() => handleQuickCash('exact')} className="quick-cash-btn exact">
                  Exact
                </button>
                {[50, 100, 200, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickCash(amt)}
                    className="quick-cash-btn"
                  >
                    ₱{amt}
                  </button>
                ))}
              </div>

              {/* Grid numeric pad */}
              <div className="keypad-grid">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'C'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleKeyPress(val)}
                    className="keypad-btn"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm payment */}
            <button
              type="submit"
              disabled={!amountPaid || (parseFloat(amountPaid) < total && method === 'cash')}
              className="confirm-sale-btn"
            >
              <Check style={{ width: 20, height: 20 }} />
              Complete Sale
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
