// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Fullstack Validation Test
 *
 * This test aims to validate the entire system flow and identify:
 * 1. Working features
 * 2. Broken features
 * 3. Missing UI/UX elements
 */

const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

const TEST_CUSTOMER = {
  name: 'Juan Fullstack',
  phone: '09123456789',
};

test.describe('Fullstack System Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[placeholder*="admin"]', TEST_USER.username);
    await page.fill('input[placeholder*="••••"]', TEST_USER.password);
    await page.click('button:has-text("Sign In")');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Complete Flow: Customer -> Transaction -> Report -> Void', async ({ page }) => {
    // 1. Verify Customer Management (Missing UI Check)
    console.log('Checking Customer Management UI...');
    await page.goto('/pos');

    // Check if there's a "Add Customer" button in the POS
    const addCustomerBtn = page.locator('button:has-text("Add Customer"), button:has-text("New Customer")');
    const customerSelect = page.locator('select:has-text("Customer"), .customer-select');

    // Based on App.jsx, customers are loaded but UI for adding them might be missing in CashierPanel
    if (await addCustomerBtn.isVisible()) {
        console.log('WORKING: Customer creation UI found in POS');
    } else {
        console.log('MISSING: Customer creation UI not found in POS screen');
    }

    // 2. Admin: Switch to Water Station and verify
    console.log('Switching to Water Station plugin...');
    await page.click('a:has-text("Manager")');

    // Verify PIN protection
    await expect(page.locator('h2:has-text("Administrator Access Only")')).toBeVisible();
    await page.fill('input[placeholder*="PIN"]', '1234');
    await page.click('button:has-text("Verify Code")');

    // Switch plugin
    await page.click('a:has-text("Active Business")');
    const waterPluginBtn = page.locator('.plugin-card:has-text("waterstation") button:has-text("Activate Plugin")');
    if (await waterPluginBtn.isVisible()) {
        await waterPluginBtn.click();
        // Page reloads on plugin switch
        await expect(page.locator('.status-badge.online')).toBeVisible();
    }

    // 3. POS: Perform Transaction with Plugin Fields
    console.log('Performing transaction...');
    await page.click('a:has-text("Cashier")');

    // Add a water product
    const waterProduct = page.locator('.product-card:has-text("Purified Water")').first();
    await expect(waterProduct).toBeVisible();

    // Handle the prompt() for plugin attributes (using page.on('dialog'))
    page.on('dialog', async dialog => {
        console.log(`DIALOG: ${dialog.message()}`);
        await dialog.accept('5 gal');
    });

    await waterProduct.click();

    // Verify it's in the cart
    await expect(page.locator('.cart-panel')).toContainText('Purified Water');

    // Checkout
    await page.click('button:has-text("Collect Payment")');
    await expect(page.locator('.modal, .payment-modal')).toBeVisible();

    // Enter amount and confirm
    await page.click('button:has-text("₱100")');
    await page.click('button:has-text("Complete Sale")');

    // Success Toast
    await expect(page.locator('text=Sale transaction filed successfully')).toBeVisible();

    // 4. Reports: Verify Sales
    console.log('Verifying reports...');
    await page.click('a:has-text("Manager")');
    // It should still be verified or we re-verify
    if (await page.locator('input[placeholder*="PIN"]').isVisible()) {
        await page.fill('input[placeholder*="PIN"]', '1234');
        await page.click('button:has-text("Verify Code")');
    }

    await page.click('a:has-text("Shop Reports")');

    const revenueValue = page.locator('.stat-card:has-text("Net Revenue") .stat-value');
    await expect(revenueValue).not.toHaveText('₱0.00');
    console.log(`WORKING: Revenue recorded: ${await revenueValue.innerText()}`);

    // 5. Transaction History & Void (Check for Missing Feature)
    console.log('Checking for Transaction History / Void UI...');
    // Looking at App.jsx, there's no "Transaction History" or "Void" UI in AdminPanel or CashierPanel
    const historyLink = page.locator('a:has-text("History"), a:has-text("Transactions"), a:has-text("Void")');

    const isHistoryVisible = await historyLink.isVisible().catch(() => false);
    if (isHistoryVisible) {
        console.log('WORKING: Transaction History UI found');
        await historyLink.click();
    } else {
        console.log('MISSING: Transaction History / Void UI not found in Admin or Cashier panels');
    }
  });

  test('Validation: Missing Admin Management UIs', async ({ page }) => {
    await page.click('a:has-text("Manager")');

    // Auth if needed
    const pinInput = page.locator('input[placeholder*="PIN"]');
    if (await pinInput.isVisible()) {
        await pinInput.fill('1234');
        await page.click('button:has-text("Verify Code")');
    }

    const checks = [
        { label: 'Category Management', selector: 'a:has-text("Categories"), a:has-text("Category Management")' },
        { label: 'Product Management', selector: 'a:has-text("Product Management"), a:has-text("Inventory")' },
        { label: 'Customer Management', selector: 'a:has-text("Customers"), a:has-text("Customer Management")' }
    ];

    for (const check of checks) {
        const link = page.locator(check.selector);
        if (await link.isVisible().catch(() => false)) {
            console.log(`WORKING: ${check.label} UI found`);
        } else {
            console.log(`MISSING: ${check.label} UI not found in Admin panel`);
        }
    }
  });

});
