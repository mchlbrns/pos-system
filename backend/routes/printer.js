const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const printerWizard = require('../utils/printerWizard');
const Business = require('../models/Business');

router.use(authenticate);

// Scan/list printers
router.get('/list', async (req, res, next) => {
  try {
    const list = await printerWizard.detectPrinters();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

// Set default printer
router.post('/set-default', (req, res, next) => {
  try {
    const { name, address, type } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, error: 'Printer address is required' });
    }

    const businessId = req.user.business_id;
    Business.setSetting(businessId, 'printer_name', name || 'POS-Printer');
    Business.setSetting(businessId, 'printer_address', address);
    Business.setSetting(businessId, 'printer_type', type || 'thermal');

    res.json({
      success: true,
      data: {
        message: 'Default printer saved successfully',
        name,
        address,
        type
      }
    });
  } catch (err) {
    next(err);
  }
});

// Print test receipt
router.post('/test', async (req, res, next) => {
  try {
    const { name, address, type } = req.body;
    
    // Create a mock printer job
    const mockJob = {
      business_id: req.user.business_id,
      id: 9999,
      payload: {
        transaction: {
          transaction_number: 'TEST-PRINT-0001',
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          cashier_name: req.user.username,
          customer_name: 'Test Customer',
          subtotal: 100.00,
          tax_amount: 12.00,
          discount_amount: 0.00,
          total: 112.00,
          payments: [{ method: 'cash', amount: 120.00, change_amount: 8.00 }],
          items: [
            { product_name: 'Test Product A', quantity: 1, unit_price: 50.00, subtotal: 50.00 },
            { product_name: 'Test Product B', quantity: 2, unit_price: 25.00, subtotal: 50.00 }
          ]
        }
      }
    };

    // Temporarily apply configuration parameters if passed in, for test printing
    const businessId = req.user.business_id;
    const oldName = Business.getSetting(businessId, 'printer_name');
    const oldAddress = Business.getSetting(businessId, 'printer_address');
    const oldType = Business.getSetting(businessId, 'printer_type');

    if (address) {
      Business.setSetting(businessId, 'printer_name', name || 'Test-Printer');
      Business.setSetting(businessId, 'printer_address', address);
      Business.setSetting(businessId, 'printer_type', type || 'thermal');
    }

    const printResult = await printerWizard.printReceipt(mockJob);

    // Restore old configurations if temporary test was requested
    if (address) {
      if (oldName) Business.setSetting(businessId, 'printer_name', oldName);
      if (oldAddress) Business.setSetting(businessId, 'printer_address', oldAddress);
      if (oldType) Business.setSetting(businessId, 'printer_type', oldType);
    }

    if (printResult.success) {
      res.json({ success: true, data: { message: 'Test print sent successfully!' } });
    } else {
      res.status(500).json({ success: false, error: printResult.message || 'Test print failed.' });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
