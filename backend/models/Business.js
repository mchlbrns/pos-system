'use strict';

const { getDatabase } = require('../database/init');

class Business {
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

  static findById(id) {
    const db = getDatabase();
    const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    if (biz) biz.settings = JSON.parse(biz.settings || '{}');
    return biz || null;
  }

  static findAll() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM businesses ORDER BY name').all()
      .map(b => ({ ...b, settings: JSON.parse(b.settings || '{}') }));
  }

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

  static delete(id) {
    const db = getDatabase();
    return db.prepare('DELETE FROM businesses WHERE id = ?').run(id).changes > 0;
  }

  static getSetting(businessId, key) {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE business_id = ? AND key = ?').get(businessId, key);
    return row ? row.value : null;
  }

  static getAllSettings(businessId) {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings WHERE business_id = ?').all(businessId);
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  static setSetting(businessId, key, value) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO settings (business_id, key, value)
      VALUES (?, ?, ?)
      ON CONFLICT(business_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(businessId, key, value);
    return result.changes > 0;
  }

  static deleteSetting(businessId, key) {
    const db = getDatabase();
    return db.prepare('DELETE FROM settings WHERE business_id = ? AND key = ?').run(businessId, key).changes > 0;
  }
}

module.exports = Business;
