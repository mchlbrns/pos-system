const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../database/init');
const fs = require('fs');
const path = require('path');

router.get('/license', (req, res) => {
  const licenseFile = path.resolve(__dirname, '../../data/license.json');
  if (fs.existsSync(licenseFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(licenseFile, 'utf8'));
      return res.json({ key: data.key, status: data.status });
    } catch (e) {}
  }
  res.json({ key: '', status: 'trial' });
});

router.post('/license', (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'License key is required' });
  
  const licenseFile = path.resolve(__dirname, '../../data/license.json');
  const dir = path.dirname(licenseFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Mock activation: any key formatted as XXXX-XXXX-XXXX-XXXX is active
  const isValidFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
  if (!isValidFormat) {
    return res.status(400).json({ error: 'Invalid license key format (e.g. ABCD-1234-EFGH-5678)' });
  }

  const data = { key, status: 'active', activated_at: new Date().toISOString() };
  fs.writeFileSync(licenseFile, JSON.stringify(data, null, 2));
  
  res.json({ message: 'License key activated successfully!', key, status: 'active' });
});

router.use(authenticate);

router.get('/plugin', (req, res, next) => {
  try {
    const db = getDatabase();
    const bizId = req.user.original_business_id || req.user.business_id;
    const biz = db.prepare('SELECT type FROM businesses WHERE id = ?').get(bizId);
    res.json({
      activePlugin: biz ? biz.type : 'general',
      businessType: biz ? biz.type : 'general'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/plugin', (req, res, next) => {
  try {
    const { activePlugin, businessType, plugin } = req.body;
    const targetType = activePlugin || businessType || plugin;
    if (!targetType) {
      return res.status(400).json({ error: 'Plugin/business type is required' });
    }

    const allowed = ['waterstation', 'laundry', 'motorepair', 'general'];
    if (!allowed.includes(targetType)) {
      return res.status(400).json({ error: 'Invalid business type/plugin' });
    }

    const db = getDatabase();
    const bizId = req.user.original_business_id || req.user.business_id;
    db.prepare('UPDATE businesses SET type = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(targetType, bizId);

    res.json({
      message: `Successfully switched business type to ${targetType}`,
      activePlugin: targetType,
      businessType: targetType
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM settings WHERE business_id = ?').all(req.user.business_id);
    const settingsObj = {};
    rows.forEach(r => { settingsObj[r.key] = r.value; });
    res.json(settingsObj);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const settings = req.body;
    
    const insert = db.prepare(`
      INSERT INTO settings (business_id, key, value, updated_at) 
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(business_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);

    const transaction = db.transaction((data) => {
      for (const [key, val] of Object.entries(data)) {
        insert.run(req.user.business_id, key, String(val));
      }
    });

    transaction(settings);
    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
