const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../database/init');

router.use(authenticate);

router.get('/daily', (req, res, next) => {
  try {
    const db = getDatabase();
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
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

    const payments = db.prepare(`
      SELECT method, SUM(amount) as total
      FROM payments p
      JOIN transactions t ON p.transaction_id = t.id
      WHERE t.business_id = ? AND date(t.created_at) = date(?) AND t.status = 'completed'
      GROUP BY method
    `).all(req.user.business_id, date);

    const topProducts = db.prepare(`
      SELECT product_name, SUM(quantity) as quantity, SUM(subtotal) as revenue
      FROM line_items l
      JOIN transactions t ON l.transaction_id = t.id
      WHERE t.business_id = ? AND date(t.created_at) = date(?) AND t.status = 'completed'
      GROUP BY product_id, product_name
      ORDER BY quantity DESC
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
        payments,
        top_products: topProducts
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
