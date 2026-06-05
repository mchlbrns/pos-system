'use strict';

const { initializeDatabase, getDatabase, closeDatabase } = require('./init');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

function seedDatabase() {
  const db = initializeDatabase();

  const businessCount = db.prepare('SELECT COUNT(*) as cnt FROM businesses').get();
  if (businessCount.cnt > 0) {
    logger.info('Database already seeded. Skipping.');
    return;
  }

  const seed = db.transaction(() => {
    // 1. BUSINESSES
    const insertBiz = db.prepare(`
      INSERT INTO businesses (name, type, address, phone, tin, settings)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const biz1 = insertBiz.run(
      'AquaPure Water Station', 'waterstation',
      '123 Rizal Ave, Quezon City', '09171234567', '123-456-789-000',
      JSON.stringify({ vat_inclusive: true, currency: 'PHP', business_pin: '1234' })
    );

    const biz2 = insertBiz.run(
      'CleanPress Laundry', 'laundry',
      '456 EDSA, Makati City', '09181234567', '987-654-321-000',
      JSON.stringify({ vat_inclusive: true, currency: 'PHP', business_pin: '1234' })
    );

    const biz3 = insertBiz.run(
      'SpeedFix Motor Repair', 'motorepair',
      '789 Commonwealth Ave, Quezon City', '09191234567', '456-789-123-000',
      JSON.stringify({ vat_inclusive: true, currency: 'PHP', business_pin: '1234' })
    );

    // 2. USERS (password: "admin123" for all demo users)
    const passwordHash = bcrypt.hashSync('admin123', 10);
    const insertUser = db.prepare(`
      INSERT INTO users (business_id, username, password_hash, role, full_name)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run(biz1.lastInsertRowid, 'admin', passwordHash, 'admin', 'System Admin');
    insertUser.run(biz1.lastInsertRowid, 'cashier1', passwordHash, 'cashier', 'Juan Dela Cruz');
    insertUser.run(biz2.lastInsertRowid, 'laundry_admin', passwordHash, 'admin', 'Maria Santos');
    insertUser.run(biz3.lastInsertRowid, 'motor_admin', passwordHash, 'admin', 'Pedro Garcia');

    // 3. CATEGORIES
    const insertCat = db.prepare(`
      INSERT INTO categories (business_id, name, description, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    // Water station categories
    const catWater = insertCat.run(biz1.lastInsertRowid, 'Water Refill', 'Purified & mineral water', 1);
    const catContainer = insertCat.run(biz1.lastInsertRowid, 'Containers', 'Gallons and bottles', 2);

    // Laundry categories
    const catWash = insertCat.run(biz2.lastInsertRowid, 'Wash & Fold', 'Standard laundry services', 1);
    const catDry = insertCat.run(biz2.lastInsertRowid, 'Dry Clean', 'Dry cleaning services', 2);

    // Motor repair categories
    const catParts = insertCat.run(biz3.lastInsertRowid, 'Parts', 'Motorcycle parts', 1);
    const catService = insertCat.run(biz3.lastInsertRowid, 'Services', 'Repair & maintenance', 2);

    // 4. PRODUCTS
    const insertProd = db.prepare(`
      INSERT INTO products (business_id, category_id, name, description, sku, barcode, price, cost, quantity, unit, plugin_attributes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Water station products
    insertProd.run(biz1.lastInsertRowid, catWater.lastInsertRowid,
      'Purified Water Refill (5 gal)', 'Standard 5-gallon purified water refill',
      'WTR-PUR-5G', '4800000001', 25.00, 8.00, 999, 'gal',
      JSON.stringify({ water_type: 'purified', container_size: 5 }));

    insertProd.run(biz1.lastInsertRowid, catWater.lastInsertRowid,
      'Alkaline Water Refill (5 gal)', 'Premium 5-gallon alkaline water refill',
      'WTR-ALK-5G', '4800000002', 40.00, 15.00, 999, 'gal',
      JSON.stringify({ water_type: 'alkaline', container_size: 5 }));

    insertProd.run(biz1.lastInsertRowid, catWater.lastInsertRowid,
      'Mineral Water Refill (5 gal)', '5-gallon mineral water refill',
      'WTR-MIN-5G', '4800000003', 35.00, 12.00, 999, 'gal',
      JSON.stringify({ water_type: 'mineral', container_size: 5 }));

    insertProd.run(biz1.lastInsertRowid, catContainer.lastInsertRowid,
      'Slim Gallon Container', 'New slim-type 5-gallon container',
      'CTR-SLIM-5', '4800000010', 150.00, 80.00, 50, 'pc',
      JSON.stringify({ container_type: 'slim', deposit: 50 }));

    insertProd.run(biz1.lastInsertRowid, catContainer.lastInsertRowid,
      'Round Gallon Container', 'New round-type 5-gallon container',
      'CTR-RND-5', '4800000011', 120.00, 65.00, 50, 'pc',
      JSON.stringify({ container_type: 'round', deposit: 40 }));

    // Laundry products
    insertProd.run(biz2.lastInsertRowid, catWash.lastInsertRowid,
      'Regular Wash & Fold', 'Standard wash, dry, and fold per kilo',
      'LND-REG-KG', null, 65.00, 20.00, 999, 'kg',
      JSON.stringify({ service_type: 'wash_fold', turnaround_hours: 24 }));

    insertProd.run(biz2.lastInsertRowid, catWash.lastInsertRowid,
      'Rush Wash & Fold', 'Rush service – same day turnaround',
      'LND-RSH-KG', null, 95.00, 30.00, 999, 'kg',
      JSON.stringify({ service_type: 'wash_fold_rush', turnaround_hours: 6 }));

    insertProd.run(biz2.lastInsertRowid, catDry.lastInsertRowid,
      'Dry Clean – Polo/Blouse', 'Dry cleaning for polo shirts and blouses',
      'LND-DC-POLO', null, 120.00, 40.00, 999, 'pc',
      JSON.stringify({ service_type: 'dry_clean', garment_type: 'polo' }));

    insertProd.run(biz2.lastInsertRowid, catDry.lastInsertRowid,
      'Dry Clean – Suit/Blazer', 'Dry cleaning for suits and blazers',
      'LND-DC-SUIT', null, 250.00, 80.00, 999, 'pc',
      JSON.stringify({ service_type: 'dry_clean', garment_type: 'suit' }));

    // Motor repair products
    insertProd.run(biz3.lastInsertRowid, catParts.lastInsertRowid,
      'Engine Oil (1L)', '4-stroke engine oil 1 liter',
      'MTR-OIL-1L', '4800000050', 180.00, 95.00, 100, 'pc',
      JSON.stringify({ part_type: 'consumable' }));

    insertProd.run(biz3.lastInsertRowid, catParts.lastInsertRowid,
      'Spark Plug (Standard)', 'Standard spark plug for motorcycles',
      'MTR-SPK-STD', '4800000051', 85.00, 35.00, 200, 'pc',
      JSON.stringify({ part_type: 'replacement' }));

    insertProd.run(biz3.lastInsertRowid, catParts.lastInsertRowid,
      'Brake Pad Set', 'Front brake pad set for motorcycles',
      'MTR-BRK-PAD', '4800000052', 350.00, 150.00, 80, 'pc',
      JSON.stringify({ part_type: 'replacement' }));

    insertProd.run(biz3.lastInsertRowid, catService.lastInsertRowid,
      'Oil Change Service', 'Complete oil change with filter',
      'MTR-SVC-OIL', null, 150.00, 50.00, 999, 'svc',
      JSON.stringify({ service_type: 'oil_change', labor_hours: 0.5 }));

    insertProd.run(biz3.lastInsertRowid, catService.lastInsertRowid,
      'Tune-Up Service', 'Full engine tune-up',
      'MTR-SVC-TUN', null, 500.00, 150.00, 999, 'svc',
      JSON.stringify({ service_type: 'tune_up', labor_hours: 2 }));

    insertProd.run(biz3.lastInsertRowid, catService.lastInsertRowid,
      'Tire Replacement', 'Tire replacement including mounting & balancing',
      'MTR-SVC-TIRE', null, 200.00, 80.00, 999, 'svc',
      JSON.stringify({ service_type: 'tire_change', labor_hours: 1 }));

    // 5. CUSTOMERS
    const insertCust = db.prepare(`
      INSERT INTO customers (business_id, name, phone, email, address, loyalty_points)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertCust.run(biz1.lastInsertRowid, 'Walk-in Customer', null, null, null, 0);
    insertCust.run(biz1.lastInsertRowid, 'Ana Reyes', '09171111111', 'ana@email.com', '456 Main St, QC', 50);
    insertCust.run(biz2.lastInsertRowid, 'Walk-in Customer', null, null, null, 0);
    insertCust.run(biz3.lastInsertRowid, 'Walk-in Customer', null, null, null, 0);
    insertCust.run(biz3.lastInsertRowid, 'Carlos Mendoza', '09192222222', 'carlos@email.com', '789 Side St, QC', 120);

    // 6. DEFAULT PRINT TEMPLATES
    const insertTmpl = db.prepare(`
      INSERT INTO print_templates (business_id, name, type, template, is_default)
      VALUES (?, ?, ?, ?, ?)
    `);

    const receiptTemplate = `
========================================
           {{business_name}}
         {{business_address}}
         Tel: {{business_phone}}
     TIN: {{business_tin}}
========================================
 Transaction #: {{transaction_number}}
 Date: {{date}}
 Cashier: {{cashier_name}}
 Customer: {{customer_name}}
----------------------------------------
 ITEM              QTY   PRICE   AMOUNT
----------------------------------------
{{#items}}
 {{name}}
                   {{qty}} x {{price}}  {{subtotal}}
{{/items}}
----------------------------------------
 Subtotal:                   {{subtotal}}
 VAT (12%):                  {{tax}}
 Discount:                  -{{discount}}
----------------------------------------
 TOTAL:                ₱ {{total}}
----------------------------------------
 Payment: {{payment_method}}
 Amount Paid:           ₱ {{amount_paid}}
 Change:                ₱ {{change}}
========================================
      Thank you for your purchase!
         Please come again.
========================================
`;

    const kitchenTemplate = `
========================================
        KITCHEN ORDER SLIP
========================================
 Order #: {{transaction_number}}
 Date: {{date}}
 Time: {{time}}
----------------------------------------
{{#items}}
 [{{qty}}x] {{name}}
   Notes: {{notes}}
{{/items}}
----------------------------------------
`;

    for (const bizId of [biz1.lastInsertRowid, biz2.lastInsertRowid, biz3.lastInsertRowid]) {
      insertTmpl.run(bizId, 'Default Receipt', 'receipt', receiptTemplate.trim(), 1);
      insertTmpl.run(bizId, 'Kitchen Order', 'kitchen', kitchenTemplate.trim(), 0);
    }

    // 7. PLUGINS
    const insertPlugin = db.prepare(`
      INSERT OR REPLACE INTO plugins (name, type, version, is_active, config)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertPlugin.run('waterstation', 'business', '1.0.0', 1, JSON.stringify({
      track_containers: true,
      default_deposit: 50,
      water_types: ['purified', 'alkaline', 'mineral']
    }));

    insertPlugin.run('laundry', 'business', '1.0.0', 1, JSON.stringify({
      weight_based: true,
      min_weight_kg: 1,
      service_types: ['wash_fold', 'wash_fold_rush', 'dry_clean', 'press_only']
    }));

    insertPlugin.run('motorepair', 'business', '1.0.0', 1, JSON.stringify({
      track_job_orders: true,
      labor_rate_per_hour: 250,
      parts_markup_percent: 30
    }));

    // 8. DEFAULT SETTINGS
    const insertSetting = db.prepare(`
      INSERT INTO settings (business_id, key, value)
      VALUES (?, ?, ?)
    `);

    for (const bizId of [biz1.lastInsertRowid, biz2.lastInsertRowid, biz3.lastInsertRowid]) {
      insertSetting.run(bizId, 'vat_rate', '0.12');
      insertSetting.run(bizId, 'vat_inclusive', 'true');
      insertSetting.run(bizId, 'currency', 'PHP');
      insertSetting.run(bizId, 'receipt_footer', 'Thank you for your purchase!');
      insertSetting.run(bizId, 'low_stock_threshold', '10');
      insertSetting.run(bizId, 'business_pin', '1234');
    }
  });

  seed();
  logger.info('Database seeded successfully.');
}

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
  seedDatabase();
  closeDatabase();
  process.exit(0);
}

module.exports = { seedDatabase };
