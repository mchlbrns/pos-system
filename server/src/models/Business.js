/**
 * @module models/Business
 * @description Business model with settings management.
 */

'use strict';

const { getDatabase } = require('../database/init');

class Business {
  /**
   * Creates a new business.
   * @param {Object} data
   * @returns {Object}
   */
  static create(data) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO businesses (name, type, address, phone, tin, logo_url, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.type || 'general',
      data.address || null,
      data.phone || null,
      data.tin || null,
      data.logo_url || null,
      JSON.stringify(data.settings || {})
    );

    return Business.findById(result.lastInsertRowid);
  }

  /**
   * Finds a business by ID.
   * @param {number} id
   * @returns {Object|null}
   */
  static findById(id) {
    const db = getDatabase();
    const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    if (biz) biz.settings = JSON.parse(biz.settings || '{}');
    return biz || null;
  }

  /**
   * Lists all businesses.
   * @returns {Object[]}
   */
  static findAll() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM businesses ORDER BY name').all()
      .map(b => ({ ...b, settings: JSON.parse(b.settings || '{}') }));
  }

  /**
   * Updates a business.
   * @param {number} id
   * @param {Object} data
   * @returns {Object|null}
   */
  static update(id, data) {
    const db = getDatabase();
    const allowed = ['name', 'type', 'address', 'phone', 'tin', 'logo_url'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (data.settings !== undefined) {
      fields.push('settings = ?');
      values.push(JSON.stringify(data.settings));
    }

    if (fields.length === 0) return Business.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE businesses SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return Business.findById(id);
  }

  /**
   * Deletes a business.
   * @param {number} id
   * @returns {boolean}
   */
  static delete(id) {
    const db = getDatabase();
    return db.prepare('DELETE FROM businesses WHERE id = ?').run(id).changes > 0;
  }

  // ----------------------------------------------------------------
  // SETTINGS HELPERS
  // ----------------------------------------------------------------

  /**
   * Gets a setting value for a business.
   * @param {number} businessId
   * @param {string} key
   * @returns {string|null}
   */
  static getSetting(businessId, key) {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE business_id = ? AND key = ?').get(businessId, key);
    return row ? row.value : null;
  }

  /**
   * Gets all settings for a business.
   * @param {number} businessId
   * @returns {Object} Key-value map
   */
  static getAllSettings(businessId) {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings WHERE business_id = ?').all(businessId);
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  /**
   * Sets a setting value (upsert).
   * @param {number} businessId
   * @param {string} key
   * @param {string} value
   * @returns {boolean}
   */
  static setSetting(businessId, key, value) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO settings (business_id, key, value)
      VALUES (?, ?, ?)
      ON CONFLICT(business_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(businessId, key, value);
    return result.changes > 0;
  }

  /**
   * Deletes a setting.
   * @param {number} businessId
   * @param {string} key
   * @returns {boolean}
   */
  static deleteSetting(businessId, key) {
    const db = getDatabase();
    return db.prepare('DELETE FROM settings WHERE business_id = ? AND key = ?').run(businessId, key).changes > 0;
  }
}

module.exports = Business;
