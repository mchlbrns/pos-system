/**
 * @file printer-drivers/demo/print_test.js
 * @description Test script to verify receipts print layout output.
 */

'use strict';

const ReceiptFormatter = require('../src/ReceiptFormatter');

function runDemo() {
  console.log('Generating sample POS Receipts...');

  const wsData = {
    business_name: 'AquaPure Water Refilling',
    address: '123 Rizal Ave, Pasay City',
    tin: '123-456-789-000',
    phone: '0917-123-4567',
    transaction_number: 'TXN-WS-882190',
    date: new Date().toLocaleString(),
    items: [
      { product_name: '5-Gallon Refill (Round)', quantity: 3, unit_price: 35.00, subtotal: 105.00, discount: 0 },
      { product_name: 'Gallon Cap replacement', quantity: 2, unit_price: 5.00, subtotal: 10.00, discount: 0 },
      { product_name: 'Slim Container Deposit', quantity: 1, unit_price: 150.00, subtotal: 150.00, discount: 0 }
    ],
    subtotal: 236.60,
    tax_amount: 28.40,
    discount_amount: 0.00,
    total: 265.00,
    payments: [{ method: 'cash', amount: 500.00, change_amount: 235.00 }]
  };

  const formatted80 = ReceiptFormatter.formatReceipt(wsData, 80);
  const formatted58 = ReceiptFormatter.formatReceipt(wsData, 58);

  console.log('\n--- 80mm THERMAL RECEIPT PREVIEW ---');
  console.log(formatted80);

  console.log('\n--- 58mm THERMAL RECEIPT PREVIEW ---');
  console.log(formatted58);
}

runDemo();
