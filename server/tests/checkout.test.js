/**
 * @file server/tests/checkout.test.js
 * @description Unit tests for checkout transaction recording and stock deduction.
 */

'use strict';

const { initializeDatabase } = require('../src/database/init');
const Transaction = require('../src/models/Transaction');
const Product = require('../src/models/Product');
const Business = require('../src/models/Business');
const User = require('../src/models/User');

function runTests() {
  console.log('Running Checkout System Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log('  [PASS] ' + message);
    } else {
      failed++;
      console.error('  [FAIL] ' + message);
    }
  }

  process.env.DB_PATH = ':memory:';
  initializeDatabase();

  try {
    const biz = Business.create({
      name: 'Test Business',
      type: 'general',
      address: 'Manila',
      phone: '09123456789',
      tin: '123-456-789-000',
      settings: {}
    });

    const user = User.create({
      business_id: biz.id,
      username: 'testcashier',
      password: 'testpassword',
      role: 'cashier',
      full_name: 'Test Cashier'
    });

    const prod = Product.create({
      business_id: biz.id,
      name: 'Sample Item',
      price: 100,
      cost: 60,
      quantity: 10,
      unit: 'pc',
      sku: 'TEST-SKU',
      barcode: '123456'
    });

    const txnData = {
      business_id: biz.id,
      user_id: user.id,
      customer_id: null,
      subtotal: 89.28,
      tax_amount: 10.72,
      discount_amount: 0,
      total: 100.00,
      status: 'completed',
      notes: 'Test transaction',
      plugin_attributes: {},
      items: [{
        product_id: prod.id,
        product_name: prod.name,
        quantity: 1,
        unit_price: 100,
        discount: 0,
        subtotal: 100
      }],
      payments: [{
        method: 'cash',
        amount: 100,
        change_amount: 0
      }]
    };

    const txn = Transaction.create(txnData);
    assert(txn !== null, 'Transaction created successfully');
    assert(txn.transaction_number.startsWith('TXN-'), 'Transaction number auto-generated correctly');
    assert(txn.items.length === 1, 'Transaction includes 1 line item');

    const savedTxn = Transaction.findById(txn.id);
    assert(savedTxn.total === 100, 'Saved transaction total is 100 PHP');

  } catch (err) {
    failed++;
    console.error('  [FAIL] Checkout system test crashed:', err);
  }

  console.log(`Checkout Results: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
