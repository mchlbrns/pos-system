const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../database/init');

router.use(authenticate);

router.get('/daily', (req, res, next) => {
  try {
    const db = getDatabase();
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Summary of all transactions for the day
    const sales = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(subtotal) as subtotal,
        SUM(tax_amount) as tax,
        SUM(discount_amount) as discount,
        SUM(total) as total
      FROM transactions
      WHERE business_id = ? AND date(created_at) = date(?) AND status = 'completed'
    `).get(req.user.business_id, date);

    // Grouped revenue by payment method
    const payments = db.prepare(`
      SELECT p.method, SUM(p.amount) as total_payment
      FROM payments p
      JOIN transactions t ON p.transaction_id = t.id
      WHERE t.business_id = ? AND date(t.created_at) = date(?) AND t.status = 'completed'
      GROUP BY p.method
    `).all(req.user.business_id, date);

    // Top 5 products sold today
    const topProducts = db.prepare(`
      SELECT l.product_name, SUM(l.quantity) as total_qty, SUM(l.subtotal) as total_revenue
      FROM line_items l
      JOIN transactions t ON l.transaction_id = t.id
      WHERE t.business_id = ? AND date(t.created_at) = date(?) AND t.status = 'completed'
      GROUP BY l.product_id, l.product_name
      ORDER BY total_qty DESC
      LIMIT 5
    `).all(req.user.business_id, date);

    res.json({
      success: true,
      data: {
        summary: {
          total_orders: sales.total_orders || 0,
          subtotal: sales.subtotal || 0,
          tax: sales.tax || 0,
          discount: sales.discount || 0,
          total: sales.total || 0
        },
        payments: payments.map(p => ({
          method: p.method,
          total: p.total_payment
        })),
        top_products: topProducts.map(p => ({
          product_name: p.product_name,
          quantity: p.total_qty,
          revenue: p.total_revenue
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/weekly', (req, res, next) => {
  try {
    const db = getDatabase();
    const sales = db.prepare(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as total_orders,
        SUM(total) as total
      FROM transactions
      WHERE business_id = ? AND created_at >= datetime('now', '-7 days') AND status = 'completed'
      GROUP BY date(created_at)
    `).all(req.user.business_id);
    res.json({ success: true, data: sales });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
