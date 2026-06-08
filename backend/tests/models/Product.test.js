const { describe, expect, test, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const { initializeDatabase, closeDatabase, getDatabase } = require('../../database/init');
const Product = require('../../models/Product');

process.env.DB_PATH = ':memory:';

describe('Product Model', () => {
  let db;
  let testBusinessId;
  let testCategoryId;

  beforeAll(() => {
    db = initializeDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    // Clear relevant tables to ensure clean state
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM categories').run();
    db.prepare('DELETE FROM businesses').run();

    // Create a test business
    const bizResult = db.prepare(`
      INSERT INTO businesses (name, type) VALUES ('Test Business', 'general')
    `).run();
    testBusinessId = bizResult.lastInsertRowid;

    // Create a test category
    const catResult = Product.createCategory({
      business_id: testBusinessId,
      name: 'Test Category',
      description: 'Test Category Desc',
      sort_order: 1
    });
    testCategoryId = catResult.id;
  });

  describe('Product CRUD', () => {
    test('should create a product', () => {
      const productData = {
        business_id: testBusinessId,
        category_id: testCategoryId,
        name: 'Test Product',
        price: 100,
        cost: 50,
        quantity: 10,
        barcode: '123456789',
        sku: 'TEST-SKU-001',
        description: 'A product for testing'
      };

      const product = Product.create(productData);
      expect(product).toBeDefined();
      expect(product.id).toBeGreaterThan(0);
      expect(product.name).toBe('Test Product');
      expect(product.price).toBe(100);
      expect(product.quantity).toBe(10);
      expect(product.barcode).toBe('123456789');
    });

    test('should find a product by ID', () => {
      const productData = {
        business_id: testBusinessId,
        name: 'Find By ID Test',
        price: 50
      };
      const created = Product.create(productData);

      const found = Product.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Find By ID Test');
    });

    test('should return null when finding non-existent ID', () => {
      const found = Product.findById(99999);
      expect(found).toBeNull();
    });

    test('should find a product by barcode', () => {
      const productData = {
        business_id: testBusinessId,
        name: 'Barcode Test',
        barcode: 'BARCODE123',
        price: 10
      };
      Product.create(productData);

      const found = Product.findByBarcode('BARCODE123', testBusinessId);
      expect(found).toBeDefined();
      expect(found.barcode).toBe('BARCODE123');
      expect(found.business_id).toBe(testBusinessId);
    });

    test('should find products by business ID with pagination and filtering', () => {
      for (let i = 1; i <= 15; i++) {
        Product.create({
          business_id: testBusinessId,
          name: `Prod ${i}`,
          price: i * 10,
          is_active: i % 2 === 0 ? 1 : 0 // Even active, Odd inactive
        });
      }

      // Test active only
      const resultActive = Product.findByBusiness(testBusinessId, { limit: 100, active_only: true });
      expect(resultActive.total).toBe(7);
      expect(resultActive.products.length).toBe(7);

      // Test all
      const resultAll = Product.findByBusiness(testBusinessId, { limit: 100, active_only: false });
      expect(resultAll.total).toBe(15);
      expect(resultAll.products.length).toBe(15);

      // Test pagination
      const resultPage = Product.findByBusiness(testBusinessId, { limit: 5, page: 2, active_only: false, sort_by: 'price', sort_order: 'ASC' });
      expect(resultPage.products.length).toBe(5);
      expect(resultPage.products[0].name).toBe('Prod 6'); // 6th item when sorted by price
    });

    test('should find products by search query', () => {
      Product.create({ business_id: testBusinessId, name: 'Apple', sku: 'FR-APP' });
      Product.create({ business_id: testBusinessId, name: 'Banana', sku: 'FR-BAN' });
      Product.create({ business_id: testBusinessId, name: 'Pineapple', sku: 'FR-PIN' });

      const result = Product.findByBusiness(testBusinessId, { search: 'app', limit: 100 });
      expect(result.total).toBe(2); // Apple, Pineapple
    });

    test('should find products by category_id', () => {
      const catA = Product.createCategory({ business_id: testBusinessId, name: 'Cat A' });
      const catB = Product.createCategory({ business_id: testBusinessId, name: 'Cat B' });

      Product.create({ business_id: testBusinessId, category_id: catA.id, name: 'Prod A1' });
      Product.create({ business_id: testBusinessId, category_id: catA.id, name: 'Prod A2' });
      Product.create({ business_id: testBusinessId, category_id: catB.id, name: 'Prod B1' });

      const result = Product.findByBusiness(testBusinessId, { category_id: catA.id, limit: 100 });
      expect(result.total).toBe(2);
      expect(result.products.length).toBe(2);
      expect(result.products.every(p => p.category_id === catA.id)).toBe(true);
    });

    test('should return finding no product with empty result when finding a product by business ID without update conditions', () => {
        Product.create({
          business_id: testBusinessId,
          name: 'No fields updated product',
          price: 10
        });

        const result = Product.findByBusiness(testBusinessId, { limit: 10 });
        const product = result.products[0];

        const updated = Product.update(product.id, {});
        expect(updated.id).toBe(product.id);
        expect(updated.name).toBe('No fields updated product');
    });

    test('should return finding no product with empty result when finding a category by business ID without update conditions', () => {
        const cat = Product.createCategory({
          business_id: testBusinessId,
          name: 'No fields updated cat'
        });

        const updated = Product.updateCategory(cat.id, {});
        expect(updated.id).toBe(cat.id);
        expect(updated.name).toBe('No fields updated cat');
    });

    test('should handle find product plugin_attributes that might be missing or broken', () => {
      const product = Product.create({
        business_id: testBusinessId,
        name: 'Plugin Attr Test',
        plugin_attributes: null
      });

      const found = Product.findById(product.id);
      expect(found.plugin_attributes).toEqual({});

      const found2 = Product.findByBarcode(product.barcode, testBusinessId);
      if(found2) {
        expect(found2.plugin_attributes).toEqual({});
      }
    });

    test('should find a product by business ID without options', () => {
        Product.create({ business_id: testBusinessId, name: 'Default Options Product' });
        const result = Product.findByBusiness(testBusinessId);
        expect(result.products.length).toBe(1);
    });

    test('should return null when finding non-existent product by barcode', () => {
        const found = Product.findByBarcode('NONEXISTENT_BARCODE', testBusinessId);
        expect(found).toBeNull();
    });

    test('should handle find products by business ID with descending sort', () => {
        Product.create({ business_id: testBusinessId, name: 'A Prod' });
        Product.create({ business_id: testBusinessId, name: 'B Prod' });

        const result = Product.findByBusiness(testBusinessId, { limit: 100, sort_by: 'name', sort_order: 'DESC' });
        expect(result.products.length).toBe(2);
        expect(result.products[0].name).toBe('B Prod');
        expect(result.products[1].name).toBe('A Prod');
    });


    test('should update a product', () => {
      const product = Product.create({
        business_id: testBusinessId,
        name: 'Update Me',
        price: 10
      });

      const updated = Product.update(product.id, {
        name: 'Updated Name',
        price: 20,
        plugin_attributes: { key: 'value' }
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.price).toBe(20);
      expect(updated.plugin_attributes).toEqual({ key: 'value' });

      const fetched = Product.findById(product.id);
      expect(fetched.name).toBe('Updated Name');
      expect(fetched.plugin_attributes).toEqual({ key: 'value' });
    });

    test('should delete a product', () => {
      const product = Product.create({
        business_id: testBusinessId,
        name: 'Delete Me'
      });

      const success = Product.delete(product.id);
      expect(success).toBe(true);

      const found = Product.findById(product.id);
      expect(found).toBeNull();
    });
  });

  describe('Inventory Management', () => {
    test('should adjust stock', () => {
      const product = Product.create({
        business_id: testBusinessId,
        name: 'Stock Test',
        quantity: 10
      });

      // Increase stock
      const increased = Product.adjustStock(product.id, 5);
      expect(increased.quantity).toBe(15);

      // Decrease stock
      const decreased = Product.adjustStock(product.id, -8);
      expect(decreased.quantity).toBe(7);
    });

    test('should get low stock products', () => {
      Product.create({ business_id: testBusinessId, name: 'High Stock', quantity: 20 });
      Product.create({ business_id: testBusinessId, name: 'Borderline Stock', quantity: 10 });
      Product.create({ business_id: testBusinessId, name: 'Low Stock', quantity: 5 });
      Product.create({ business_id: testBusinessId, name: 'Out of Stock', quantity: 0 });
      Product.create({ business_id: testBusinessId, name: 'Negative Stock', quantity: -2 }); // Should be excluded based on query (>= 0)

      const lowStock = Product.getLowStock(testBusinessId, 10);

      expect(lowStock.length).toBe(3); // 10, 5, 0
      // Ensure sorted by quantity ASC
      expect(lowStock[0].quantity).toBe(0);
      expect(lowStock[1].quantity).toBe(5);
      expect(lowStock[2].quantity).toBe(10);
    });
  });

  describe('Category Management', () => {
    test('should create a category', () => {
      const category = Product.createCategory({
        business_id: testBusinessId,
        name: 'New Category',
        description: 'New Desc',
        sort_order: 5
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe('New Category');
      expect(category.description).toBe('New Desc');
      expect(category.sort_order).toBe(5);
    });

    test('should update a category', () => {
      const category = Product.createCategory({
        business_id: testBusinessId,
        name: 'Old Category Name'
      });

      const updated = Product.updateCategory(category.id, {
        name: 'Updated Category Name',
        sort_order: 10
      });

      expect(updated.name).toBe('Updated Category Name');
      expect(updated.sort_order).toBe(10);
    });

    test('should get categories with product count', () => {
      // Create a second category
      const cat2 = Product.createCategory({
        business_id: testBusinessId,
        name: 'Category 2',
        sort_order: 2
      });

      // Add products to testCategoryId
      Product.create({ business_id: testBusinessId, category_id: testCategoryId, name: 'P1', is_active: 1 });
      Product.create({ business_id: testBusinessId, category_id: testCategoryId, name: 'P2', is_active: 1 });
      Product.create({ business_id: testBusinessId, category_id: testCategoryId, name: 'P3', is_active: 0 }); // Inactive, shouldn't count

      // Add product to cat2
      Product.create({ business_id: testBusinessId, category_id: cat2.id, name: 'P4', is_active: 1 });

      const categories = Product.getCategories(testBusinessId);

      expect(categories.length).toBe(2);

      // We expect them to be ordered by sort_order
      expect(categories[0].id).toBe(testCategoryId);
      expect(categories[0].product_count).toBe(2); // Only active ones

      expect(categories[1].id).toBe(cat2.id);
      expect(categories[1].product_count).toBe(1);
    });

    test('should delete a category', () => {
      const category = Product.createCategory({
        business_id: testBusinessId,
        name: 'To Delete'
      });

      const success = Product.deleteCategory(category.id);
      expect(success).toBe(true);

      const allCategories = Product.getCategories(testBusinessId);
      const found = allCategories.find(c => c.id === category.id);
      expect(found).toBeUndefined();
    });
  });
});

// Appending an additional test for findByBusiness with category_id

// Appending more tests

// More tests for branching
