import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function TransactionsPage() {
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      setTxns(res.data);
    } catch (e) {}
  };

  const handleVoid = async (id) => {
    if (!window.confirm('Are you sure you want to void this transaction?')) return;
    try {
      await api.post(`/transactions/${id}/void`);
      fetchTransactions();
    } catch (e) {
      alert('Failed to void transaction');
    }
  };

  return (
    <div className="transactions-page animate-fade-in">
      <h3>Sales Transactions</h3>
      
      <div className="table-container glass-effect">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction #</th>
              <th>Subtotal</th>
              <th>VAT (12%)</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {txns.map(t => (
              <tr key={t.id}>
                <td>{new Date(t.created_at).toLocaleString()}</td>
                <td>{t.transaction_number}</td>
                <td>₱{t.subtotal.toFixed(2)}</td>
                <td>₱{t.tax_amount.toFixed(2)}</td>
                <td><strong>₱{t.total.toFixed(2)}</strong></td>
                <td>
                  <span className={`badge ${t.status === 'completed' ? 'badge-success' : 'badge-danger'}`}>
                    {t.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  {t.status === 'completed' && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleVoid(t.id)}>
                      Void
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
