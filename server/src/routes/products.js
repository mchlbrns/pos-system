const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const pluginLoader = require('../services/PluginLoader');

router.use(authenticate);

router.get('/', (req, res, next) => {
  try {
    const filters = {
      search: req.query.search || '',
      category_id: req.query.category_id ? parseInt(req.query.category_id) : null,
      is_active: req.query.is_active !== undefined ? parseInt(req.query.is_active) : null
    };
    const result = Product.findByBusiness(req.user.business_id, filters);
    res.json(result.products);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const product = Product.findById(parseInt(req.params.id));
    if (!product || product.business_id !== req.user.business_id) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const data = { ...req.body, business_id: req.user.business_id };
    
    // Call plugin hooks
    const modifiedData = pluginLoader.triggerHook('beforeProductCreate', data, req.user.business_id);
    
    const product = Product.create(modifiedData);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = Product.findById(id);
    if (!existing || existing.business_id !== req.user.business_id) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const data = { ...req.body };
    const modifiedData = pluginLoader.triggerHook('beforeProductUpdate', data, req.user.business_id);
    
    const product = Product.update(id, modifiedData);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = Product.findById(id);
    if (!existing || existing.business_id !== req.user.business_id) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const success = Product.delete(id);
    res.json({ success });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
