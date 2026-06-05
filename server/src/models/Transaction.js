/**
 * @module models/Transaction
 * @description Transaction model with line items, payments, and atomic checkout.
 */

'use strict';

const { getDatabase } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

class Transaction {
  /**
   * Generates a unique transaction number in format TXN-YYYYMMDD-XXXX.
   * @param {number} businessId
   * @returns {string}
   */
  static generateNumber(businessId) {
    const db = getDatabase();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TXN-${today}`;

    const last = db.prepare(`
      SELECT transaction_number FROM transactions
      WHERE business_id = ? AND transaction_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `).get(businessId, `${prefix}-%`);

    let seq = 1;
    if (last) {
      const parts = last.transaction_number.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }

    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }

  /**
   * Creates a full transaction with line items and payments atomically.
   * @param {Object} data
   * @param {number} data.business_id
   * @param {number} data.user_id
   * @param {number} [data.customer_id]
   * @param {number} data.subtotal
   * @param {number} data.tax_amount
   * @param {number} data.discount_amount
   * @param {number} data.total
   * @param {string} [data.status='completed']
   * @param {string} [data.payment_method]
   * @param {string} [data.notes]
   * @param {Object} [data.plugin_attributes]
   * @param {Object[]} data.items - Line items
   * @param {Object[]} data.payments - Payment records
   * @returns {Object} Complete transaction with items and payments
   */
  static create(data) {
    const db = getDatabase();
    const txnNumber = Transaction.generateNumber(data.business_id);

    const createTxn = db.transaction(() => {
      // Insert transaction
      const txnResult = db.prepare(`
        INSERT INTO transactions
          (business_id, user_id, customer_id, transaction_number, subtotal,
           tax_amount, discount_amount, total, status, payment_method, notes, plugin_attributes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.business_id,
        data.user_id,
        data.customer_id || null,
        txnNumber,
        data.subtotal,
        data.tax_amount,
        data.discount_amount || 0,
        data.total,
        data.status || 'completed',
        data.payment_method || null,
        data.notes || null,
        JSON.stringify(data.plugin_attributes || {})
      );

      const txnId = txnResult.lastInsertRowid;

      // Insert line items
      const insertItem = db.prepare(`
        INSERT INTO line_items
          (transaction_id, product_id, product_name, quantity, unit_price, discount, subtotal, plugin_attributes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of (data.items || [])) {
        insertItem.run(
          txnId,
          item.product_id || null,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.discount || 0,
          item.subtotal,
          JSON.stringify(item.plugin_attributes || {})
        );

        // Deduct stock if product_id is provided
        if (item.product_id) {
          db.prepare(`
            UPDATE products
            SET quantity = quantity - ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(item.quantity, item.product_id);
        }
      }

      // Insert payments
      const insertPayment = db.prepare(`
        INSERT INTO payments (transaction_id, method, amount, reference_number, change_amount)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const payment of (data.payments || [])) {
        insertPayment.run(
          txnId,
          payment.method,
          payment.amount,
          payment.reference_number || null,
          payment.change_amount || 0
        );
      }

      return txnId;
    });

    const txnId = createTxn();
    return Transaction.findById(txnId);
  }

  /**
   * Finds a transaction by ID with all line items and payments.
   * @param {number} id
   * @returns {Object|null}
   */
  static findById(id) {
    const db = getDatabase();
    const txn = db.prepare(`
      SELECT t.*, u.full_name as cashier_name, c.name as customer_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE t.id = ?
    `).get(id);

    if (!txn) return null;

    txn.plugin_attributes = JSON.parse(txn.plugin_attributes || '{}');
    txn.items = db.prepare(`
      SELECT * FROM line_items WHERE transaction_id = ?
    `).all(id).map(item => ({
      ...item,
      plugin_attributes: JSON.parse(item.plugin_attributes || '{}')
    }));

    txn.payments = db.prepare(`
      SELECT * FROM payments WHERE transaction_id = ?
    `).all(id);

    return txn;
  }

  /**
   * Finds a transaction by its transaction number.
   * @param {string} txnNumber
   * @returns {Object|null}
   */
  static findByNumber(txnNumber) {
    const db = getDatabase();
    const txn = db.prepare('SELECT id FROM transactions WHERE transaction_number = ?').get(txnNumber);
    if (!txn) return null;
    return Transaction.findById(txn.id);
  }

  /**
   * Lists transactions for a business with filtering and pagination.
   * @param {number} businessId
   * @param {Object} [options]
   * @returns {{ transactions: Object[], total: number, page: number, limit: number }}
   */
  static findByBusiness(businessId, options = {}) {
    const db = getDatabase();
    const {
      status,
      user_id,
      date_from,
      date_to,
      page = 1,
      limit = 50
    } = options;

    const conditions = ['t.business_id = ?'];
    const params = [businessId];

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (user_id) {
      conditions.push('t.user_id = ?');
      params.push(user_id);
    }

    if (date_from) {
      conditions.push('t.created_at >= ?');
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('t.created_at <= ?');
      params.push(date_to);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const total = db.prepare(`
      SELECT COUNT(*) as cnt FROM transactions t WHERE ${whereClause}
    `).get(...params).cnt;

    const transactions = db.prepare(`
      SELECT t.*, u.full_name as cashier_name, c.name as customer_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    for (const t of transactions) {
      t.plugin_attributes = JSON.parse(t.plugin_attributes || '{}');
    }

    return { transactions, total, page, limit };
  }

  /**
   * Voids a transaction and restores product stock.
   * @param {number} id
   * @param {string} [reason]
   * @returns {Object|null}
   */
  static void(id, reason) {
    const db = getDatabase();

    const voidTxn = db.transaction(() => {
      const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
      if (!txn) return null;
      if (txn.status === 'voided') return Transaction.findById(id);

      // Restore stock
      const items = db.prepare('SELECT * FROM line_items WHERE transaction_id = ?').all(id);
      for (const item of items) {
        if (item.product_id) {
          db.prepare(`
            UPDATE products SET quantity = quantity + ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(item.quantity, item.product_id);
        }
      }

      // Update transaction status
      db.prepare(`
        UPDATE transactions
        SET status = 'voided', notes = COALESCE(notes || ' | ', '') || ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(`VOIDED: ${reason || 'No reason given'}`, id);

      return Transaction.findById(id);
    });

    return voidTxn();
  }

  /**
   * Refunds a transaction.
   * @param {number} id
   * @param {string} [reason]
   * @returns {Object|null}
   */
  static refund(id, reason) {
    const db = getDatabase();

    const refundTxn = db.transaction(() => {
      const txn = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
      if (!txn) return null;
      if (txn.status !== 'completed') return null;

      // Restore stock
      const items = db.prepare('SELECT * FROM line_items WHERE transaction_id = ?').all(id);
      for (const item of items) {
        if (item.product_id) {
          db.prepare(`
            UPDATE products SET quantity = quantity + ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(item.quantity, item.product_id);
        }
      }

      db.prepare(`
        UPDATE transactions
        SET status = 'refunded', notes = COALESCE(notes || ' | ', '') || ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(`REFUNDED: ${reason || 'No reason given'}`, id);

      return Transaction.findById(id);
    });

    return refundTxn();
  }
}

module.exports = Transaction;
