const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const CartService = require('../services/CartService');
const { authenticate } = require('../middleware/auth');
const PrinterJob = require('../models/PrinterJob');
const { getDatabase } = require('../database/init');

router.use(authenticate);

// Get list of transactions
router.get('/', (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      date_from: req.query.start_date || req.query.date_from,
      date_to: req.query.end_date || req.query.date_to
    };
    const result = Transaction.findByBusiness(req.user.business_id, filters);
    res.json({ success: true, data: result.transactions });
  } catch (err) {
    next(err);
  }
});

// Get single transaction details
router.get('/:id', (req, res, next) => {
  try {
    const txn = Transaction.findById(parseInt(req.params.id));
    if (!txn || txn.business_id !== req.user.business_id) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    res.json({ success: true, data: txn });
  } catch (err) {
    next(err);
  }
});

// Checkout transaction
router.post('/checkout', (req, res, next) => {
  try {
    const { items, payments, customer_id, discount_type, notes, plugin_attributes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items list cannot be empty' });
    }
    if (!payments || payments.length === 0) {
      return res.status(400).json({ success: false, error: 'Payment information required' });
    }

    // Calculate totals via CartService
    const calculation = CartService.calculateCart(items, discount_type);
    
    // Validate payments
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < calculation.total) {
      return res.status(400).json({ success: false, error: `Insufficient payment. Required: ${calculation.total}, Received: ${totalPaid}` });
    }

    // Prepare transaction object
    const transactionData = {
      business_id: req.user.business_id,
      user_id: req.user.id,
      customer_id: customer_id || null,
      subtotal: calculation.subtotal,
      tax_amount: calculation.tax_amount,
      discount_amount: calculation.discount_amount,
      total: calculation.total,
      status: 'completed',
      notes: notes || '',
      plugin_attributes: plugin_attributes || {},
      items: calculation.items,
      payments: payments.map((p, idx) => {
        if (idx === 0 && p.method === 'cash') {
          return {
            ...p,
            change_amount: parseFloat((totalPaid - calculation.total).toFixed(2))
          };
        }
        return { ...p, change_amount: 0 };
      })
    };

    // Save transaction
    const txn = Transaction.create(transactionData);

    // Queue receipt printing job
    try {
      const db = getDatabase();
      const defaultTemplate = db.prepare("SELECT id FROM print_templates WHERE business_id = ? AND type = 'receipt' AND is_default = 1").get(req.user.business_id);
      
      if (defaultTemplate) {
        PrinterJob.create({
          business_id: req.user.business_id,
          template_id: defaultTemplate.id,
          transaction_id: txn.id,
          status: 'queued',
          payload: {
            transaction: txn,
            receipt_title: 'OFFICIAL RECEIPT'
          }
        });
      }
    } catch (e) {
      console.error('Failed to queue print job:', e.message);
    }

    res.status(201).json({ success: true, data: txn });
  } catch (err) {
    next(err);
  }
});

// Void transaction
router.post('/:id/void', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = Transaction.findById(id);
    if (!existing || existing.business_id !== req.user.business_id) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const updated = Transaction.void(id, req.body.reason);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Refund transaction
router.post('/:id/refund', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = Transaction.findById(id);
    if (!existing || existing.business_id !== req.user.business_id) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const updated = Transaction.refund(id, req.body.reason);
    if (!updated) {
      return res.status(400).json({ success: false, error: 'Transaction cannot be refunded (must be completed)' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
