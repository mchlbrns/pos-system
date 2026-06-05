/**
 * @module models/PrinterJob
 * @description Print job queue model for ESC/POS printer management.
 */

'use strict';

const { getDatabase } = require('../database/init');

class PrinterJob {
  /**
   * Creates a new print job in the queue.
   * @param {Object} data
   * @returns {Object}
   */
  static create(data) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO printer_jobs (business_id, template_id, transaction_id, printer_name, status, payload)
      VALUES (?, ?, ?, ?, 'queued', ?)
    `).run(
      data.business_id,
      data.template_id || null,
      data.transaction_id || null,
      data.printer_name || process.env.PRINTER_NAME || 'POS-Printer',
      JSON.stringify(data.payload || {})
    );

    return PrinterJob.findById(result.lastInsertRowid);
  }

  /**
   * Finds a print job by ID.
   * @param {number} id
   * @returns {Object|null}
   */
  static findById(id) {
    const db = getDatabase();
    const job = db.prepare('SELECT * FROM printer_jobs WHERE id = ?').get(id);
    if (job) job.payload = JSON.parse(job.payload || '{}');
    return job || null;
  }

  /**
   * Gets the next queued job for processing.
   * @returns {Object|null}
   */
  static getNextQueued() {
    const db = getDatabase();
    const job = db.prepare(`
      SELECT * FROM printer_jobs
      WHERE status = 'queued' AND attempts < 3
      ORDER BY created_at ASC LIMIT 1
    `).get();

    if (job) job.payload = JSON.parse(job.payload || '{}');
    return job || null;
  }

  /**
   * Gets all queued jobs.
   * @param {number} [businessId]
   * @returns {Object[]}
   */
  static getQueued(businessId) {
    const db = getDatabase();
    let jobs;
    if (businessId) {
      jobs = db.prepare(`
        SELECT * FROM printer_jobs WHERE status = 'queued' AND business_id = ? ORDER BY created_at ASC
      `).all(businessId);
    } else {
      jobs = db.prepare(`
        SELECT * FROM printer_jobs WHERE status = 'queued' ORDER BY created_at ASC
      `).all();
    }
    return jobs.map(j => ({ ...j, payload: JSON.parse(j.payload || '{}') }));
  }

  /**
   * Lists print jobs for a business with pagination.
   * @param {number} businessId
   * @param {Object} [options]
   * @returns {{ jobs: Object[], total: number }}
   */
  static findByBusiness(businessId, options = {}) {
    const db = getDatabase();
    const { status, page = 1, limit = 50 } = options;
    const conditions = ['business_id = ?'];
    const params = [businessId];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM printer_jobs WHERE ${whereClause}`).get(...params).cnt;
    const jobs = db.prepare(`
      SELECT * FROM printer_jobs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { jobs: jobs.map(j => ({ ...j, payload: JSON.parse(j.payload || '{}') })), total };
  }

  /**
   * Marks a job as printing (in-progress).
   * @param {number} id
   * @returns {boolean}
   */
  static markPrinting(id) {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE printer_jobs SET status = 'printing', attempts = attempts + 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(id);
    return result.changes > 0;
  }

  /**
   * Marks a job as completed.
   * @param {number} id
   * @returns {boolean}
   */
  static markCompleted(id) {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE printer_jobs SET status = 'completed', updated_at = datetime('now') WHERE id = ?
    `).run(id);
    return result.changes > 0;
  }

  /**
   * Marks a job as failed with an error message.
   * @param {number} id
   * @param {string} errorMessage
   * @returns {boolean}
   */
  static markFailed(id, errorMessage) {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE printer_jobs
      SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'queued' END,
          error_message = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(errorMessage, id);
    return result.changes > 0;
  }

  /**
   * Deletes a print job.
   * @param {number} id
   * @returns {boolean}
   */
  static delete(id) {
    const db = getDatabase();
    return db.prepare('DELETE FROM printer_jobs WHERE id = ?').run(id).changes > 0;
  }

  // ----------------------------------------------------------------
  // PRINT TEMPLATES
  // ----------------------------------------------------------------

  /**
   * Creates a print template.
   * @param {Object} data
   * @returns {Object}
   */
  static createTemplate(data) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO print_templates (business_id, name, type, template, is_default)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.business_id, data.name, data.type, data.template, data.is_default ? 1 : 0);

    return db.prepare('SELECT * FROM print_templates WHERE id = ?').get(result.lastInsertRowid);
  }

  /**
   * Gets all templates for a business.
   * @param {number} businessId
   * @returns {Object[]}
   */
  static getTemplates(businessId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM print_templates WHERE business_id = ? ORDER BY name').all(businessId);
  }

  /**
   * Gets the default template of a given type for a business.
   * @param {number} businessId
   * @param {string} type
   * @returns {Object|null}
   */
  static getDefaultTemplate(businessId, type) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM print_templates WHERE business_id = ? AND type = ? AND is_default = 1
    `).get(businessId, type) || null;
  }

  /**
   * Updates a print template.
   * @param {number} id
   * @param {Object} data
   * @returns {Object|null}
   */
  static updateTemplate(id, data) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    for (const key of ['name', 'type', 'template', 'is_default']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_default' ? (data[key] ? 1 : 0) : data[key]);
      }
    }

    if (fields.length === 0) return db.prepare('SELECT * FROM print_templates WHERE id = ?').get(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE print_templates SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return db.prepare('SELECT * FROM print_templates WHERE id = ?').get(id);
  }

  /**
   * Deletes a print template.
   * @param {number} id
   * @returns {boolean}
   */
  static deleteTemplate(id) {
    const db = getDatabase();
    return db.prepare('DELETE FROM print_templates WHERE id = ?').run(id).changes > 0;
  }

  /**
   * Claims the next queued print job in a transaction, marking it as printing.
   * @returns {Object|null}
   */
  static claimNextJob() {
    const db = getDatabase();
    const txn = db.transaction(() => {
      const job = PrinterJob.getNextQueued();
      if (job) {
        PrinterJob.markPrinting(job.id);
        job.status = 'printing';
        job.attempts += 1;
        return job;
      }
      return null;
    });
    return txn();
  }

  /**
   * Helper method to update a job's status.
   * @param {number} id
   * @param {string} status
   * @param {string} [errorMessage]
   * @returns {boolean}
   */
  static updateStatus(id, status, errorMessage = null) {
    if (status === 'completed') {
      return PrinterJob.markCompleted(id);
    } else if (status === 'failed') {
      return PrinterJob.markFailed(id, errorMessage);
    }
    return false;
  }
}

module.exports = PrinterJob;
