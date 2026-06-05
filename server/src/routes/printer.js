const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const PrinterJob = require('../models/PrinterJob');
const { getDatabase } = require('../database/init');

router.use(authenticate);

router.get('/jobs', (req, res, next) => {
  try {
    const db = getDatabase();
    const jobs = db.prepare('SELECT * FROM printer_jobs WHERE business_id = ? ORDER BY id DESC LIMIT 50').all(req.user.business_id);
    res.json(jobs.map(j => {
      j.payload = JSON.parse(j.payload || '{}');
      return j;
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/jobs', (req, res, next) => {
  try {
    const job = PrinterJob.create({
      business_id: req.user.business_id,
      template_id: req.body.template_id,
      transaction_id: req.body.transaction_id,
      payload: req.body.payload || {}
    });
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

router.get('/templates', (req, res, next) => {
  try {
    const db = getDatabase();
    const templates = db.prepare('SELECT * FROM print_templates WHERE business_id = ?').all(req.user.business_id);
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

router.post('/templates', (req, res, next) => {
  try {
    const db = getDatabase();
    const { name, type, template, is_default } = req.body;

    if (is_default) {
      db.prepare('UPDATE print_templates SET is_default = 0 WHERE business_id = ? AND type = ?').run(req.user.business_id, type);
    }

    const stmt = db.prepare('INSERT INTO print_templates (business_id, name, type, template, is_default) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(req.user.business_id, name, type, template, is_default ? 1 : 0);
    
    const created = db.prepare('SELECT * FROM print_templates WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
