import React from 'react';

export default function PrintPreview({ receiptData, business }) {
  if (!receiptData) return <div className="receipt-preview-box">No receipt data.</div>;

  const { transaction_number, date, items, subtotal, tax_amount, discount_amount, total, payments } = receiptData;
  const pay = payments && payments[0] ? payments[0] : { method: 'cash', amount: 0, change_amount: 0 };

  return (
    <div className="receipt-preview-wrapper">
      <div className="thermal-receipt">
        <div className="receipt-header">
          <h3>{business.name || 'UNIVERSAL POS SHOP'}</h3>
          <p>{business.address || 'Philippines'}</p>
          <p>TIN: {business.tin || '000-000-000-000'}</p>
          <p>Tel: {business.phone || 'N/A'}</p>
        </div>

        <div className="receipt-divider">--------------------------------</div>

        <div className="receipt-meta">
          <p><strong>Transaction #:</strong> {transaction_number || 'TXN-PENDING'}</p>
          <p><strong>Date:</strong> {date || new Date().toLocaleString()}</p>
        </div>

        <div className="receipt-divider">--------------------------------</div>

        <div className="receipt-items">
          {items && items.map((item, idx) => (
            <div key={idx} className="receipt-item-row">
              <div className="item-name-qty">
                <span>{item.name || item.product_name}</span>
                <span>{item.quantity} x ₱{parseFloat(item.price || item.unit_price).toFixed(2)}</span>
              </div>
              <div className="item-row-total">
                ₱{parseFloat((item.price || item.unit_price) * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className="receipt-divider">--------------------------------</div>

        <div className="receipt-totals">
          <div className="totals-row">
            <span>Subtotal (Excl. VAT)</span>
            <span>₱{parseFloat(subtotal).toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>VAT (12%)</span>
            <span>₱{parseFloat(tax_amount).toFixed(2)}</span>
          </div>
          {parseFloat(discount_amount) > 0 && (
            <div className="totals-row discount">
              <span>Discount</span>
              <span>-₱{parseFloat(discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="totals-row grand-total">
            <span>TOTAL</span>
            <span>₱{parseFloat(total).toFixed(2)}</span>
          </div>
        </div>

        <div className="receipt-divider">--------------------------------</div>

        <div className="receipt-payment">
          <div className="totals-row">
            <span>Payment ({pay.method ? pay.method.toUpperCase() : 'CASH'})</span>
            <span>₱{parseFloat(pay.amount).toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>Change</span>
            <span>₱{parseFloat(pay.change_amount).toFixed(2)}</span>
          </div>
        </div>

        <div className="receipt-divider">--------------------------------</div>

        <div className="receipt-footer">
          <p>Thank you for your business!</p>
          <p>This serves as an OFFICIAL RECEIPT.</p>
        </div>
      </div>
    </div>
  );
}
