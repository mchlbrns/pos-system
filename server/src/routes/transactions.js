const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const CartService = require('../services/CartService');
const { authenticate } = require('../middleware/auth');
const pluginLoader = require('../services/PluginLoader');
const PrinterJob = require('../models/PrinterJob');

router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      date_from: req.query.start_date || req.query.date_from,
      date_to: req.query.end_date || req.query.date_to
    };
    const result = Transaction.findByBusiness(req.user.business_id, filters);
    res.json(result.transactions);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const txn = Transaction.findById(parseInt(req.params.id));
    if (!txn || txn.business_id !== req.user.business_id) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(txn);
  } catch (err) {
    next(err);
  }
});

router.post('/checkout', async (req, res, next) => {
  try {
    const { items, payments, customer_id, discount_type, notes, plugin_attributes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items list cannot be empty' });
    }
    if (!payments || payments.length === 0) {
      return res.status(400).json({ error: 'Payment information required' });
    }

    // Call plugin hooks
    const context = { items, payments, customer_id, discount_type, notes, plugin_attributes };
    const modifiedContext = pluginLoader.triggerHook('beforeCheckout', context, req.user.business_id);

    // Calculate totals via CartService
    const calculation = CartService.calculateCart(modifiedContext.items, modifiedContext.discount_type);
    
    // Validate payments
    const totalPaid = modifiedContext.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < calculation.total) {
      return res.status(400).json({ error: `Insufficient payment. Required: ${calculation.total}, Received: ${totalPaid}` });
    }

    // Prepare transaction object
    const transactionData = {
      business_id: req.user.business_id,
      user_id: req.user.id,
      customer_id: modifiedContext.customer_id || null,
      subtotal: calculation.subtotal,
      tax_amount: calculation.tax_amount,
      discount_amount: calculation.discount_amount,
      total: calculation.total,
      status: 'completed',
      notes: modifiedContext.notes || '',
      plugin_attributes: modifiedContext.plugin_attributes || {},
      items: calculation.items,
      payments: modifiedContext.payments.map((p, idx) => {
        if (idx === 0 && p.method === 'cash') {
          return {
            ...p,
            change_amount: totalPaid - calculation.total
          };
        }
        return { ...p, change_amount: 0 };
      })
    };

    // Save transaction
    const txn = Transaction.create(transactionData);

    // Deduct stock
    for (const item of calculation.items) {
      const prod = Product.findById(item.product_id);
      if (prod) {
        Product.update(prod.id, { quantity: Math.max(0, prod.quantity - item.quantity) });
      }
    }

    // Trigger after checkout hooks
    pluginLoader.triggerHook('afterCheckout', { transaction: txn }, req.user.business_id);

    // Queue receipt printing job
    // Auto-select template
    const db = require('../database/init').getDatabase();
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

    res.status(201).json(txn);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/void', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = Transaction.findById(id);
    if (!existing || existing.business_id !== req.user.business_id) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updated = Transaction.void(id, req.body.reason);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
