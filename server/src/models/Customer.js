/**
 * @module models/Customer
 * @description Customer model with CRUD, loyalty points, and search.
 */

'use strict';

const { getDatabase } = require('../database/init');

class Customer {
  /**
   * Creates a new customer.
   * @param {Object} data
   * @returns {Object}
   */
  static create(data) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO customers (business_id, name, phone, email, address, notes, loyalty_points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.business_id,
      data.name,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.notes || null,
      data.loyalty_points || 0
    );

    return Customer.findById(result.lastInsertRowid);
  }

  /**
   * Finds a customer by ID.
   * @param {number} id
   * @returns {Object|null}
   */
  static findById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) || null;
  }

  /**
   * Lists customers for a business with search and pagination.
   * @param {number} businessId
   * @param {Object} [options]
   * @returns {{ customers: Object[], total: number, page: number, limit: number }}
   */
  static findByBusiness(businessId, options = {}) {
    const db = getDatabase();
    const { search, page = 1, limit = 50 } = options;

    const conditions = ['business_id = ?'];
    const params = [businessId];

    if (search) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM customers WHERE ${whereClause}`).get(...params).cnt;
    const customers = db.prepare(`
      SELECT * FROM customers WHERE ${whereClause} ORDER BY name LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { customers, total, page, limit };
  }

  /**
   * Updates a customer.
   * @param {number} id
   * @param {Object} data
   * @returns {Object|null}
   */
  static update(id, data) {
    const db = getDatabase();
    const allowed = ['name', 'phone', 'email', 'address', 'notes'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return Customer.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return Customer.findById(id);
  }

  /**
   * Adjusts loyalty points for a customer.
   * @param {number} id
   * @param {number} points - Positive to add, negative to subtract
   * @returns {Object|null}
   */
  static adjustLoyaltyPoints(id, points) {
    const db = getDatabase();
    db.prepare(`
      UPDATE customers SET loyalty_points = MAX(0, loyalty_points + ?), updated_at = datetime('now')
      WHERE id = ?
    `).run(points, id);
    return Customer.findById(id);
  }

  /**
   * Gets a customer's transaction history.
   * @param {number} customerId
   * @param {number} [limit=20]
   * @returns {Object[]}
   */
  static getTransactionHistory(customerId, limit = 20) {
    const db = getDatabase();
    return db.prepare(`
      SELECT t.*, u.full_name as cashier_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.customer_id = ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `).all(customerId, limit);
  }

  /**
   * Deletes a customer.
   * @param {number} id
   * @returns {boolean}
   */
  static delete(id) {
    const db = getDatabase();
    return db.prepare('DELETE FROM customers WHERE id = ?').run(id).changes > 0;
  }
}

module.exports = Customer;
