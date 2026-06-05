/**
 * @module models/Product
 * @description Full CRUD for products with search, filtering, and stock management.
 */

'use strict';

const { getDatabase } = require('../database/init');

class Product {
  /**
   * Creates a new product.
   * @param {Object} data
   * @returns {Object} Created product
   */
  static create(data) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO products
        (business_id, category_id, name, description, sku, barcode, price, cost, quantity, unit, is_active, plugin_attributes, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.business_id,
      data.category_id || null,
      data.name,
      data.description || null,
      data.sku || null,
      data.barcode || null,
      data.price || 0,
      data.cost || 0,
      data.quantity || 0,
      data.unit || 'pc',
      data.is_active !== undefined ? data.is_active : 1,
      JSON.stringify(data.plugin_attributes || {}),
      data.image_url || null
    );

    return Product.findById(result.lastInsertRowid);
  }

  /**
   * Finds a product by ID.
   * @param {number} id
   * @returns {Object|null}
   */
  static findById(id) {
    const db = getDatabase();
    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);

    if (product) {
      product.plugin_attributes = JSON.parse(product.plugin_attributes || '{}');
    }
    return product || null;
  }

  /**
   * Finds a product by barcode.
   * @param {string} barcode
   * @param {number} businessId
   * @returns {Object|null}
   */
  static findByBarcode(barcode, businessId) {
    const db = getDatabase();
    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.barcode = ? AND p.business_id = ?
    `).get(barcode, businessId);

    if (product) {
      product.plugin_attributes = JSON.parse(product.plugin_attributes || '{}');
    }
    return product || null;
  }

  /**
   * Lists products for a business with optional filtering and pagination.
   * @param {number} businessId
   * @param {Object} [options]
   * @param {number} [options.category_id]
   * @param {string} [options.search]
   * @param {boolean} [options.active_only=true]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=50]
   * @param {string} [options.sort_by='name']
   * @param {string} [options.sort_order='ASC']
   * @returns {{ products: Object[], total: number, page: number, limit: number }}
   */
  static findByBusiness(businessId, options = {}) {
    const db = getDatabase();
    const {
      category_id,
      search,
      active_only = true,
      page = 1,
      limit = 50,
      sort_by = 'name',
      sort_order = 'ASC'
    } = options;

    const conditions = ['p.business_id = ?'];
    const params = [businessId];

    if (active_only) {
      conditions.push('p.is_active = 1');
    }

    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.join(' AND ');

    // Whitelist sort columns
    const allowedSort = ['name', 'price', 'quantity', 'created_at', 'sku'];
    const sortCol = allowedSort.includes(sort_by) ? sort_by : 'name';
    const sortDir = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const offset = (page - 1) * limit;

    const total = db.prepare(`
      SELECT COUNT(*) as cnt FROM products p WHERE ${whereClause}
    `).get(...params).cnt;

    const products = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${whereClause}
      ORDER BY p.${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Parse JSON plugin_attributes
    for (const p of products) {
      p.plugin_attributes = JSON.parse(p.plugin_attributes || '{}');
    }

    return { products, total, page, limit };
  }

  /**
   * Updates a product.
   * @param {number} id
   * @param {Object} data - Fields to update
   * @returns {Object|null} Updated product
   */
  static update(id, data) {
    const db = getDatabase();
    const allowed = [
      'category_id', 'name', 'description', 'sku', 'barcode',
      'price', 'cost', 'quantity', 'unit', 'is_active', 'image_url'
    ];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (data.plugin_attributes !== undefined) {
      fields.push('plugin_attributes = ?');
      values.push(JSON.stringify(data.plugin_attributes));
    }

    if (fields.length === 0) return Product.findById(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return Product.findById(id);
  }

  /**
   * Adjusts product stock quantity.
   * @param {number} id
   * @param {number} quantityChange - Positive to add, negative to subtract
   * @returns {Object|null}
   */
  static adjustStock(id, quantityChange) {
    const db = getDatabase();
    db.prepare(`
      UPDATE products
      SET quantity = quantity + ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(quantityChange, id);
    return Product.findById(id);
  }

  /**
   * Deletes a product (hard delete).
   * @param {number} id
   * @returns {boolean}
   */
  static delete(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Gets low-stock products for a business.
   * @param {number} businessId
   * @param {number} [threshold=10]
   * @returns {Object[]}
   */
  static getLowStock(businessId, threshold = 10) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM products
      WHERE business_id = ? AND is_active = 1 AND quantity <= ? AND quantity >= 0
      ORDER BY quantity ASC
    `).all(businessId, threshold);
  }

  /**
   * Gets all categories for a business.
   * @param {number} businessId
   * @returns {Object[]}
   */
  static getCategories(businessId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      WHERE c.business_id = ?
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `).all(businessId);
  }

  /**
   * Creates a category.
   * @param {Object} data
   * @returns {Object}
   */
  static createCategory(data) {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO categories (business_id, name, description, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(data.business_id, data.name, data.description || null, data.sort_order || 0);

    return db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  }

  /**
   * Updates a category.
   * @param {number} id
   * @param {Object} data
   * @returns {Object|null}
   */
  static updateCategory(id, data) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    for (const key of ['name', 'description', 'sort_order']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }

  /**
   * Deletes a category.
   * @param {number} id
   * @returns {boolean}
   */
  static deleteCategory(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

module.exports = Product;
