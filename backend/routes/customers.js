const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const result = Customer.findByBusiness(req.user.business_id, { search: req.query.search });
    res.json({ success: true, data: result.customers });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const item = Customer.findById(id);
    if (!item || item.business_id !== req.user.business_id) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const data = { ...req.body, business_id: req.user.business_id };
    const created = Customer.create(data);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = Customer.findById(id);
    if (!existing || existing.business_id !== req.user.business_id) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    const updated = Customer.update(id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
