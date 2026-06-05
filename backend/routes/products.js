const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Get products list
router.get('/', (req, res, next) => {
  try {
    const filters = {
      search: req.query.search || '',
      category_id: req.query.category_id ? parseInt(req.query.category_id) : null,
      active_only: req.query.is_active !== undefined ? req.query.is_active === 'true' : true
    };
    const result = Product.findByBusiness(req.user.business_id, filters);
    // Return array of products to maintain client compatibility
    res.json({ success: true, data: result.products });
  } catch (err) {
    next(err);
  }
});

// Get categories
router.get('/categories', (req, res, next) => {
  try {
    const categories = Product.getCategories(req.user.business_id);
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// Create category
router.post('/categories', (req, res, next) => {
  try {
    const data = { ...req.body, business_id: req.user.business_id };
    const cat = Product.createCategory(data);
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    next(err);
  }
});

// Get single product
router.get('/:id', (req, res, next) => {
  try {
    const product = Product.findById(parseInt(req.params.id));
    if (!product || product.business_id !== req.user.business_id) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// Create product
router.post('/', (req, res, next) => {
  try {
    const data = { ...req.body, business_id: req.user.business_id };
    const product = Product.create(data);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// Update product
router.put('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = Product.findById(id);
    if (!existing || existing.business_id !== req.user.business_id) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const data = { ...req.body };
    const product = Product.update(id, data);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// Delete product
router.delete('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = Product.findById(id);
    if (!existing || existing.business_id !== req.user.business_id) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const success = Product.delete(id);
    res.json({ success: true, data: { success } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
