const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../database/init');
const Business = require('../models/Business');
const fs = require('fs');
const path = require('path');

router.get('/license', (req, res) => {
  const licenseFile = path.resolve(__dirname, '../data/license.json');
  if (fs.existsSync(licenseFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(licenseFile, 'utf8'));
      return res.json({ success: true, data: { key: data.key, status: data.status } });
    } catch (e) {}
  }
  res.json({ success: true, data: { key: '', status: 'trial' } });
});

router.post('/license', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ success: false, error: 'License key is required' });
  
  const licenseFile = path.resolve(__dirname, '../data/license.json');
  const dir = path.dirname(licenseFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const isValidFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
  if (!isValidFormat) {
    return res.status(400).json({ success: false, error: 'Invalid license key format (e.g. ABCD-1234-EFGH-5678)' });
  }

  const data = { key, status: 'active', activated_at: new Date().toISOString() };
  fs.writeFileSync(licenseFile, JSON.stringify(data, null, 2));
  
  res.json({ success: true, data: { message: 'License key activated successfully!', key, status: 'active' } });
});

router.use(authenticate);

// Get currently active business plugin type
router.get('/plugin', (req, res, next) => {
  try {
    const biz = Business.findById(req.user.business_id);
    res.json({
      success: true,
      data: {
        activePlugin: biz ? biz.type : 'general',
        businessType: biz ? biz.type : 'general'
      }
    });
  } catch (err) {
    next(err);
  }
});

// Set active business plugin type
router.post('/plugin', (req, res, next) => {
  try {
    const { activePlugin, businessType, plugin } = req.body;
    const targetType = activePlugin || businessType || plugin;
    if (!targetType) {
      return res.status(400).json({ success: false, error: 'Plugin/business type is required' });
    }

    const allowed = ['waterstation', 'laundry', 'motorepair', 'general'];
    if (!allowed.includes(targetType)) {
      return res.status(400).json({ success: false, error: 'Invalid business type/plugin' });
    }

    Business.update(req.user.business_id, { type: targetType });

    res.json({
      success: true,
      data: {
        message: `Successfully switched business type to ${targetType}`,
        activePlugin: targetType,
        businessType: targetType
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get general settings
router.get('/', (req, res, next) => {
  try {
    const settings = Business.getAllSettings(req.user.business_id);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

// Save general settings
router.post('/', (req, res, next) => {
  try {
    const settings = req.body;
    for (const [key, val] of Object.entries(settings)) {
      Business.setSetting(req.user.business_id, key, String(val));
    }
    res.json({ success: true, data: { message: 'Settings saved successfully' } });
  } catch (err) {
    next(err);
  }
});

// Verify Admin PIN (default 1234)
router.post('/verify-pin', (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'PIN is required' });
    }

    // Check setting business_pin
    let savedPin = Business.getSetting(req.user.business_id, 'business_pin');
    if (!savedPin) {
      savedPin = '1234'; // default fallback
    }

    if (pin === savedPin) {
      res.json({ success: true, data: { verified: true } });
    } else {
      res.status(401).json({ success: false, error: 'Incorrect administrator PIN.' });
    }
  } catch (err) {
    next(err);
  }
});

// Fetch business details
router.get('/business', (req, res, next) => {
  try {
    const biz = Business.findById(req.user.business_id);
    if (!biz) {
      return res.status(404).json({ success: false, error: 'Business details not found' });
    }
    res.json({ success: true, data: biz });
  } catch (err) {
    next(err);
  }
});

// Update business details
router.put('/business', (req, res, next) => {
  try {
    const biz = Business.update(req.user.business_id, req.body);
    res.json({ success: true, data: biz });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
