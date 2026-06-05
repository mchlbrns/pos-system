/**
 * @file server/tests/cart.test.js
 * @description Unit tests for CartService VAT, discount and calculations.
 */

'use strict';

const CartService = require('../src/services/CartService');

function runTests() {
  console.log('Running CartService Unit Tests...');
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

  // Test Case 1: Empty Cart
  try {
    const res = CartService.calculateCart([]);
    assert(res.total === 0, 'Empty cart total is 0');
    assert(res.tax_amount === 0, 'Empty cart tax is 0');
  } catch (err) {
    failed++;
    console.error('  [FAIL] Test Case 1 crashed:', err);
  }

  // Test Case 2: VAT-inclusive standard calculation (Common in PH)
  try {
    const items = [{ id: 1, name: 'Gallon Refill', price: 112, quantity: 1 }];
    const res = CartService.calculateCart(items);
    assert(res.subtotal === 100, 'Subtotal for 112 PHP product is 100 PHP');
    assert(res.tax_amount === 12, 'VAT for 112 PHP product is 12 PHP');
    assert(res.total === 112, 'Total for 112 PHP product is 112 PHP');
  } catch (err) {
    failed++;
    console.error('  [FAIL] Test Case 2 crashed:', err);
  }

  // Test Case 3: Senior Citizen / PWD 20% discount and VAT exemption
  try {
    const items = [{ id: 1, name: 'Gallon Refill', price: 112, quantity: 1 }];
    const res = CartService.calculateCart(items, 'senior_pwd');
    assert(res.subtotal === 80, 'Senior subtotal is 80 PHP (VAT-exempt)');
    assert(res.tax_amount === 0, 'Senior tax is 0 PHP (VAT-exempt)');
    assert(res.discount_amount === 20, 'Senior discount is 20 PHP');
    assert(res.total === 80, 'Senior total is 80 PHP');
  } catch (err) {
    failed++;
    console.error('  [FAIL] Test Case 3 crashed:', err);
  }

  // Test Case 4: Flat 10% discount on VAT-inclusive price
  try {
    const items = [{ id: 1, name: 'Gallon Refill', price: 112, quantity: 1 }];
    const res = CartService.calculateCart(items, 'percent_10');
    assert(res.total === 100.80, 'Total with 10% discount is 100.80 PHP');
    assert(res.discount_amount === 11.20, 'Discount amount is 11.20 PHP');
    assert(res.tax_amount === 10.80, 'VAT on discounted total is 10.80 PHP');
  } catch (err) {
    failed++;
    console.error('  [FAIL] Test Case 4 crashed:', err);
  }

  console.log(`CartService Results: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
