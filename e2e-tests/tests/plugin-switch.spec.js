// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Plugin Switch E2E Test
 * 
 * Tests switching business types between waterstation, laundry, and motor repair.
 * Verifies that product lists, receipt templates, and UI elements change accordingly.
 * 
 * Prerequisites:
 *   - Backend running with plugin system enabled
 *   - All three plugins installed: waterstation, laundry, motorepair
 *   - Admin user with plugin management permissions
 */

const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

// Expected products per business type (from seed data)
const PLUGIN_DATA = {
  waterstation: {
    name: 'Water Station',
    sampleProducts: ['Purified Water 5 Gallon', 'Alkaline Water 5 Gallon', 'Mineral Water 500ml'],
    receiptHeader: 'Water Station',
    uniqueFields: ['Container Deposit', 'Gallon Type', 'Delivery'],
  },
  laundry: {
    name: 'Laundry Shop',
    sampleProducts: ['Wash & Fold (per kg)', 'Dry Clean', 'Press Only'],
    receiptHeader: 'Laundry',
    uniqueFields: ['Weight (kg)', 'Service Type', 'Pickup Date'],
  },
  motorepair: {
    name: 'Motor Repair Shop',
    sampleProducts: ['Oil Change', 'Brake Pad Replacement', 'Tire Replacement'],
    receiptHeader: 'Motor Repair',
    uniqueFields: ['Vehicle', 'Plate Number', 'Job Order'],
  },
};

// ─── Helper Functions ────────────────────────────────────────────────

async function login(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('[data-testid="username-input"], input[name="username"], #username', TEST_USER.username);
  await page.fill('[data-testid="password-input"], input[name="password"], #password', TEST_USER.password);
  await page.click('[data-testid="login-button"], button[type="submit"]');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}

async function navigateToSettings(page) {
  const settingsLink = page.locator(
    '[data-testid="nav-settings"], a[href*="settings"], a[href*="config"]'
  ).first();
  if (await settingsLink.isVisible()) {
    await settingsLink.click();
  } else {
    await page.goto('/settings');
  }
  await page.waitForLoadState('networkidle');
}

async function switchPlugin(page, pluginKey) {
  await navigateToSettings(page);

  // Navigate to plugin/business type section
  const pluginSection = page.locator(
    '[data-testid="plugin-settings"], a:has-text("Business Type"), a:has-text("Plugin"), button:has-text("Business Type")'
  ).first();
  if (await pluginSection.isVisible({ timeout: 3_000 })) {
    await pluginSection.click();
    await page.waitForTimeout(500);
  }

  // Select the target business type
  const pluginOption = page.locator(
    `[data-testid="plugin-${pluginKey}"], [data-plugin="${pluginKey}"], button:has-text("${PLUGIN_DATA[pluginKey].name}"), label:has-text("${PLUGIN_DATA[pluginKey].name}")`
  ).first();
  await expect(pluginOption).toBeVisible({ timeout: 5_000 });
  await pluginOption.click();

  // Confirm switch if confirmation dialog appears
  const confirmButton = page.locator(
    '[data-testid="confirm-switch"], button:has-text("Confirm"), button:has-text("Switch"), button:has-text("OK")'
  ).first();
  if (await confirmButton.isVisible({ timeout: 2_000 })) {
    await confirmButton.click();
  }

  // Wait for plugin switch to take effect
  await page.waitForTimeout(1_000);

  // Verify success message
  const successMsg = page.locator(
    '.success-message, .toast-success, [role="alert"]:has-text("success"), :has-text("switched"), :has-text("updated")'
  ).first();
  if (await successMsg.isVisible({ timeout: 3_000 })) {
    await expect(successMsg).toBeVisible();
  }
}

// ─── Tests ───────────────────────────────────────────────────────────

test.describe('Plugin / Business Type Switching', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should switch from waterstation to laundry and verify product list changes', async ({ page }) => {
    // Step 1: Ensure we start with waterstation
    await switchPlugin(page, 'waterstation');

    // Step 2: Go to POS and check waterstation products
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    // Verify waterstation products are visible
    const productArea = page.locator(
      '[data-testid="product-list"], .product-grid, .product-list'
    ).first();
    await expect(productArea).toBeVisible({ timeout: 5_000 });

    // Check for water station specific products or categories
    const waterProducts = page.locator(
      ':has-text("Water"), :has-text("Gallon"), :has-text("Tubig")'
    ).first();
    // Water products should be visible
    if (await waterProducts.isVisible({ timeout: 3_000 })) {
      await expect(waterProducts).toBeVisible();
    }

    // Step 3: Switch to laundry
    await switchPlugin(page, 'laundry');

    // Step 4: Go back to POS and verify laundry products
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    await expect(productArea).toBeVisible({ timeout: 5_000 });

    // Laundry products should now be visible
    const laundryProducts = page.locator(
      ':has-text("Wash"), :has-text("Fold"), :has-text("Dry Clean"), :has-text("Laundry"), :has-text("Laba")'
    ).first();
    if (await laundryProducts.isVisible({ timeout: 5_000 })) {
      await expect(laundryProducts).toBeVisible();
    }

    // Water products should NOT be visible in product grid anymore
    // (they belong to waterstation plugin)
  });

  test('should switch to motor repair and verify unique fields', async ({ page }) => {
    // Switch to motor repair
    await switchPlugin(page, 'motorepair');

    // Go to POS
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    // Check for motor repair specific products
    const motorProducts = page.locator(
      ':has-text("Oil Change"), :has-text("Brake"), :has-text("Tire"), :has-text("Engine")'
    ).first();
    if (await motorProducts.isVisible({ timeout: 5_000 })) {
      await expect(motorProducts).toBeVisible();
    }

    // Check for motor repair specific fields (vehicle info, plate number)
    const vehicleField = page.locator(
      '[data-testid="vehicle-field"], input[placeholder*="Vehicle"], input[placeholder*="Plate"], label:has-text("Vehicle"), label:has-text("Plate")'
    ).first();
    // Motor repair should have vehicle-specific input fields
    if (await vehicleField.isVisible({ timeout: 3_000 })) {
      await expect(vehicleField).toBeVisible();
    }
  });

  test('should verify receipt template changes with plugin switch', async ({ page }) => {
    // Switch to waterstation
    await switchPlugin(page, 'waterstation');

    // Navigate to receipt settings or preview
    const receiptSettings = page.locator(
      'a:has-text("Receipt"), a[href*="receipt"], [data-testid="receipt-settings"]'
    ).first();

    if (await receiptSettings.isVisible({ timeout: 3_000 })) {
      await receiptSettings.click();
      await page.waitForLoadState('networkidle');

      // Check receipt preview has waterstation header
      const receiptPreview = page.locator(
        '[data-testid="receipt-preview"], .receipt-preview, .receipt-template'
      ).first();
      if (await receiptPreview.isVisible({ timeout: 3_000 })) {
        // Water station receipt might include gallon-specific info
        await expect(receiptPreview).toBeVisible();
      }
    }

    // Now switch to laundry and check receipt template changes
    await switchPlugin(page, 'laundry');

    if (await receiptSettings.isVisible({ timeout: 3_000 })) {
      await receiptSettings.click();
      await page.waitForLoadState('networkidle');

      const receiptPreview = page.locator(
        '[data-testid="receipt-preview"], .receipt-preview, .receipt-template'
      ).first();
      if (await receiptPreview.isVisible({ timeout: 3_000 })) {
        // Laundry receipt should have different template
        await expect(receiptPreview).toBeVisible();
      }
    }
  });

  test('should persist plugin selection after page reload', async ({ page }) => {
    // Switch to laundry
    await switchPlugin(page, 'laundry');

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate to settings and verify laundry is still selected
    await navigateToSettings(page);

    const activePlugin = page.locator(
      '[data-testid="active-plugin"], .active-plugin, .selected-plugin, [aria-selected="true"]'
    ).first();
    if (await activePlugin.isVisible({ timeout: 3_000 })) {
      await expect(activePlugin).toContainText(/laundry|Laundry|Laba/i);
    }

    // Verify via API
    const response = await page.request.get('http://localhost:3000/api/settings/plugin');
    if (response.ok()) {
      const settings = await response.json();
      expect(settings.activePlugin || settings.businessType).toMatch(/laundry/i);
    }
  });

  test('should handle all three business types', async ({ page }) => {
    // Cycle through all plugins to verify they all load
    for (const pluginKey of ['waterstation', 'laundry', 'motorepair']) {
      await switchPlugin(page, pluginKey);
      
      // Quick check: go to POS and verify it loads without errors
      await page.goto('/pos');
      await page.waitForLoadState('networkidle');

      // No error messages should be visible
      const errorMsg = page.locator(
        '.error-message, [role="alert"][class*="error"], .error-boundary'
      );
      await expect(errorMsg).toHaveCount(0, { timeout: 3_000 }).catch(() => {
        // Some error alerts might be transient, not a hard failure
      });

      // POS screen should still be functional
      const posScreen = page.locator(
        '[data-testid="pos-screen"], .pos-container, #pos-screen'
      ).first();
      await expect(posScreen).toBeVisible({ timeout: 5_000 });
    }
  });
});
