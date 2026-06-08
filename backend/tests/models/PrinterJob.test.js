'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { getDatabase, initializeDatabase, closeDatabase } = require('../../database/init');
const PrinterJob = require('../../models/PrinterJob');

let businessId;

test.beforeEach(() => {
  process.env.DB_PATH = ':memory:';
  const db = initializeDatabase();

  // Seed a dummy business to satisfy foreign key constraints
  const result = db.prepare(`
    INSERT INTO businesses (name, type)
    VALUES ('Test Business', 'general')
  `).run();
  businessId = result.lastInsertRowid;
});

test.afterEach(() => {
  closeDatabase();
});

test('Sanity check', () => {
  assert.strictEqual(1, 1);
});

test('PrinterJob state transitions and operations', async (t) => {
  await t.test('create() should create a queued job with proper defaults', () => {
    const job = PrinterJob.create({
      business_id: businessId,
      payload: { receiptId: 123 }
    });

    assert.ok(job.id);
    assert.strictEqual(job.business_id, businessId);
    assert.strictEqual(job.status, 'queued');
    assert.strictEqual(job.attempts, 0);
    assert.strictEqual(job.printer_name, 'POS-Printer');
    assert.deepStrictEqual(job.payload, { receiptId: 123 });
  });

  await t.test('markPrinting() should transition status to printing and increment attempts', () => {
    const job = PrinterJob.create({ business_id: businessId });

    const success = PrinterJob.markPrinting(job.id);
    assert.strictEqual(success, true);

    const updatedJob = PrinterJob.findById(job.id);
    assert.strictEqual(updatedJob.status, 'printing');
    assert.strictEqual(updatedJob.attempts, 1);
  });

  await t.test('markCompleted() should transition status to completed', () => {
    const job = PrinterJob.create({ business_id: businessId });
    PrinterJob.markPrinting(job.id);

    const success = PrinterJob.markCompleted(job.id);
    assert.strictEqual(success, true);

    const updatedJob = PrinterJob.findById(job.id);
    assert.strictEqual(updatedJob.status, 'completed');
  });

  await t.test('markFailed() should requeue if attempts < 3', () => {
    const job = PrinterJob.create({ business_id: businessId });
    PrinterJob.markPrinting(job.id); // attempts = 1

    const success = PrinterJob.markFailed(job.id, 'Out of paper');
    assert.strictEqual(success, true);

    const updatedJob = PrinterJob.findById(job.id);
    assert.strictEqual(updatedJob.status, 'queued');
    assert.strictEqual(updatedJob.error_message, 'Out of paper');
  });

  await t.test('markFailed() should transition to failed if attempts >= 3', () => {
    const job = PrinterJob.create({ business_id: businessId });
    PrinterJob.markPrinting(job.id); // attempts = 1
    PrinterJob.markFailed(job.id, 'Err 1');

    PrinterJob.markPrinting(job.id); // attempts = 2
    PrinterJob.markFailed(job.id, 'Err 2');

    PrinterJob.markPrinting(job.id); // attempts = 3

    const success = PrinterJob.markFailed(job.id, 'Final Err');
    assert.strictEqual(success, true);

    const updatedJob = PrinterJob.findById(job.id);
    assert.strictEqual(updatedJob.status, 'failed');
    assert.strictEqual(updatedJob.error_message, 'Final Err');
  });

  await t.test('getQueued() and getNextQueued() should retrieve jobs appropriately', () => {
    // Add multiple queued jobs
    PrinterJob.create({ business_id: businessId, payload: { order: 1 } });
    PrinterJob.create({ business_id: businessId, payload: { order: 2 } });

    const allQueued = PrinterJob.getQueued(businessId);
    assert.strictEqual(allQueued.length, 2);
    assert.strictEqual(allQueued[0].payload.order, 1);

    const nextQueued = PrinterJob.getNextQueued();
    assert.ok(nextQueued);
    assert.strictEqual(nextQueued.payload.order, 1);
  });
});

test('claimNextJob transactional operations', async (t) => {
  await t.test('should return null if no jobs are queued', () => {
    const job = PrinterJob.claimNextJob();
    assert.strictEqual(job, null);
  });

  await t.test('should claim the next queued job, transition to printing and increment attempts', () => {
    PrinterJob.create({ business_id: businessId, payload: { target: 'first' } });
    PrinterJob.create({ business_id: businessId, payload: { target: 'second' } });

    const claimedJob = PrinterJob.claimNextJob();
    assert.ok(claimedJob);
    assert.strictEqual(claimedJob.payload.target, 'first');
    assert.strictEqual(claimedJob.status, 'printing');
    assert.strictEqual(claimedJob.attempts, 1);

    // Verify DB state matches the returned job
    const dbJob = PrinterJob.findById(claimedJob.id);
    assert.strictEqual(dbJob.status, 'printing');
    assert.strictEqual(dbJob.attempts, 1);
  });
});

test('Additional coverage: remaining branches and functions', async (t) => {
  await t.test('findByBusiness() should query with filters and pagination', () => {
    PrinterJob.create({ business_id: businessId, payload: { p: 1 } });
    PrinterJob.create({ business_id: businessId, payload: { p: 2 } });

    // Default options (no status, page 1)
    const resultAll = PrinterJob.findByBusiness(businessId);
    assert.strictEqual(resultAll.total, 2);
    assert.strictEqual(resultAll.jobs.length, 2);

    // Filter by status queued
    const resultQueued = PrinterJob.findByBusiness(businessId, { status: 'queued' });
    assert.strictEqual(resultQueued.total, 2);

    // Empty result for unmatching status
    const resultCompleted = PrinterJob.findByBusiness(businessId, { status: 'completed' });
    assert.strictEqual(resultCompleted.total, 0);
  });

  await t.test('delete() should remove the job', () => {
    const job = PrinterJob.create({ business_id: businessId });
    const success = PrinterJob.delete(job.id);
    assert.strictEqual(success, true);

    const deleted = PrinterJob.findById(job.id);
    assert.strictEqual(deleted, null);
  });

  await t.test('updateStatus() should dynamically update completion or failure', () => {
    const job = PrinterJob.create({ business_id: businessId });
    PrinterJob.markPrinting(job.id);

    let success = PrinterJob.updateStatus(job.id, 'failed', 'Network error');
    assert.strictEqual(success, true);

    let dbJob = PrinterJob.findById(job.id);
    assert.strictEqual(dbJob.status, 'queued'); // attempts < 3
    assert.strictEqual(dbJob.error_message, 'Network error');

    // Manually push to printing again
    PrinterJob.markPrinting(job.id);
    success = PrinterJob.updateStatus(job.id, 'completed');
    assert.strictEqual(success, true);

    dbJob = PrinterJob.findById(job.id);
    assert.strictEqual(dbJob.status, 'completed');

    success = PrinterJob.updateStatus(job.id, 'printing');
    assert.strictEqual(success, false); // unsupported via updateStatus directly
  });

  await t.test('Template CRUD operations', () => {
    const tpl = PrinterJob.createTemplate({
      business_id: businessId,
      name: 'Default Receipt',
      type: 'receipt',
      template: 'HELLO WORLD',
      is_default: true
    });
    assert.ok(tpl.id);
    assert.strictEqual(tpl.name, 'Default Receipt');
    assert.strictEqual(tpl.is_default, 1);

    const defaultTpl = PrinterJob.getDefaultTemplate(businessId, 'receipt');
    assert.ok(defaultTpl);
    assert.strictEqual(defaultTpl.id, tpl.id);

    const templates = PrinterJob.getTemplates(businessId);
    assert.strictEqual(templates.length, 1);
    assert.strictEqual(templates[0].id, tpl.id);

    const updated = PrinterJob.updateTemplate(tpl.id, {
      name: 'Updated Receipt',
      is_default: false
    });
    assert.strictEqual(updated.name, 'Updated Receipt');
    assert.strictEqual(updated.is_default, 0);

    const emptyUpdate = PrinterJob.updateTemplate(tpl.id, {});
    assert.strictEqual(emptyUpdate.id, tpl.id);

    const success = PrinterJob.deleteTemplate(tpl.id);
    assert.strictEqual(success, true);

    const noneTpl = PrinterJob.getTemplates(businessId);
    assert.strictEqual(noneTpl.length, 0);
  });

  await t.test('getQueued(null) without business_id should fetch all queued jobs', () => {
    PrinterJob.create({ business_id: businessId });
    const all = PrinterJob.getQueued();
    assert.strictEqual(all.length, 1);
  });
});

test('Testing fallback condition paths', async (t) => {
  await t.test('findById() handles null safely', () => {
    const job = PrinterJob.findById(9999);
    assert.strictEqual(job, null);
  });

  await t.test('getNextQueued() handles null safely', () => {
    // ensure no jobs
    const job = PrinterJob.getNextQueued();
    assert.strictEqual(job, null);
  });

  await t.test('getDefaultTemplate() handles null safely', () => {
    const tpl = PrinterJob.getDefaultTemplate(businessId, 'invalid');
    assert.strictEqual(tpl, null);
  });

  await t.test('create() handles missing optional data correctly', () => {
    const job = PrinterJob.create({
      business_id: businessId,
    });
    // template_id, transaction_id should be null
    // payload should be '{}'
    assert.strictEqual(job.template_id, null);
    assert.strictEqual(job.transaction_id, null);
    assert.deepStrictEqual(job.payload, {});
  });
});
