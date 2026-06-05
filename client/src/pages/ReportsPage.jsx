import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function ReportsPage() {
  const [summary, setSummary] = useState({ total_orders: 0, subtotal: 0, tax: 0, discount: 0, total: 0 });
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await api.get('/reports/daily');
      setSummary(res.data.summary);
      setTopProducts(res.data.top_products);
    } catch (e) {}
  };

  return (
    <div className="reports-page animate-fade-in">
      <h3>Business Reports</h3>

      <div className="dashboard-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div className="stats-card glass-effect">
          <h4>Total Sales Today</h4>
          <h2>₱{summary.total.toFixed(2)}</h2>
        </div>
        <div className="stats-card glass-effect">
          <h4>Orders Ring Up</h4>
          <h2>{summary.total_orders}</h2>
        </div>
        <div className="stats-card glass-effect">
          <h4>VAT Tax Collected</h4>
          <h2>₱{summary.tax.toFixed(2)}</h2>
        </div>
        <div className="stats-card glass-effect">
          <h4>Discounts Given</h4>
          <h2>₱{summary.discount.toFixed(2)}</h2>
        </div>
      </div>

      <div className="reports-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-effect" style={{ padding: '20px' }}>
          <h4>Top Selling Products Today</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, idx) => (
                <tr key={idx}>
                  <td>{p.product_name}</td>
                  <td>{p.quantity}</td>
                  <td>₱{p.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-effect" style={{ padding: '20px' }}>
          <h4>Hourly Sales Visualizer</h4>
          <div className="sales-chart-mock" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '180px', padding: '10px 0' }}>
            <div className="chart-bar" style={{ height: '30%', width: '30px', background: 'var(--accent-gradient)', borderRadius: '4px' }}></div>
            <div className="chart-bar" style={{ height: '60%', width: '30px', background: 'var(--accent-gradient)', borderRadius: '4px' }}></div>
            <div className="chart-bar" style={{ height: '45%', width: '30px', background: 'var(--accent-gradient)', borderRadius: '4px' }}></div>
            <div className="chart-bar" style={{ height: '90%', width: '30px', background: 'var(--accent-gradient)', borderRadius: '4px' }}></div>
            <div className="chart-bar" style={{ height: '75%', width: '30px', background: 'var(--accent-gradient)', borderRadius: '4px' }}></div>
          </div>
          <div className="chart-labels" style={{ display: 'flex', justifyContent: 'space-around', color: 'var(--muted-color)', fontSize: '12px' }}>
            <span>9 AM</span>
            <span>11 AM</span>
            <span>1 PM</span>
            <span>3 PM</span>
            <span>5 PM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
