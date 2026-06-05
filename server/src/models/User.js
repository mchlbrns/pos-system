/**
 * @module models/User
 * @description User model with password hashing via bcryptjs and CRUD operations.
 */

'use strict';

const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database/init');

const SALT_ROUNDS = 10;

class User {
  /**
   * Creates a new user with hashed password.
   * @param {Object} data
   * @param {number} data.business_id
   * @param {string} data.username
   * @param {string} data.password
   * @param {string} data.role
   * @param {string} data.full_name
   * @returns {Object} Created user (without password_hash)
   */
  static create({ business_id, username, password, role = 'cashier', full_name }) {
    const db = getDatabase();
    const password_hash = bcrypt.hashSync(password, SALT_ROUNDS);

    const stmt = db.prepare(`
      INSERT INTO users (business_id, username, password_hash, role, full_name)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(business_id, username, password_hash, role, full_name);
    return User.findById(result.lastInsertRowid);
  }

  /**
   * Finds a user by ID (excludes password_hash).
   * @param {number} id
   * @returns {Object|null}
   */
  static findById(id) {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, business_id, username, role, full_name, is_active, created_at, updated_at
      FROM users WHERE id = ?
    `).get(id) || null;
  }

  /**
   * Finds a user by username (includes password_hash for auth).
   * @param {string} username
   * @returns {Object|null}
   */
  static findByUsername(username) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
  }

  /**
   * Lists all users for a given business.
   * @param {number} businessId
   * @returns {Object[]}
   */
  static findByBusiness(businessId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, business_id, username, role, full_name, is_active, created_at, updated_at
      FROM users WHERE business_id = ? ORDER BY full_name
    `).all(businessId);
  }

  /**
   * Updates a user's profile fields.
   * @param {number} id
   * @param {Object} data - Fields to update
   * @returns {Object|null} Updated user
   */
  static update(id, data) {
    const db = getDatabase();
    const allowed = ['full_name', 'role', 'is_active'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return User.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return User.findById(id);
  }

  /**
   * Changes a user's password.
   * @param {number} id
   * @param {string} newPassword
   * @returns {boolean}
   */
  static changePassword(id, newPassword) {
    const db = getDatabase();
    const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
    const result = db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
    `).run(hash, id);
    return result.changes > 0;
  }

  /**
   * Validates a plaintext password against the stored hash.
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {boolean}
   */
  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  /**
   * Deletes (soft-deactivates) a user.
   * @param {number} id
   * @returns {boolean}
   */
  static deactivate(id) {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?
    `).run(id);
    return result.changes > 0;
  }
}

module.exports = User;
