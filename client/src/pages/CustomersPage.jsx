import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (e) {}
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', { name, phone });
      setName('');
      setPhone('');
      fetchCustomers();
    } catch (e) {}
  };

  return (
    <div className="customers-page animate-fade-in">
      <div className="page-header">
        <h3>Customer Directory</h3>
      </div>

      <div className="customers-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <div className="add-customer-panel glass-effect" style={{ padding: '20px' }}>
          <h4>Add New Customer</h4>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="form-control" value={name} onChange={e=>setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" className="form-control" value={phone} onChange={e=>setPhone(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Add Customer</button>
          </form>
        </div>

        <div className="table-container glass-effect">
          <table className="table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Loyalty Points</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.phone || 'N/A'}</td>
                  <td>⭐ {c.loyalty_points.toFixed(0)} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
