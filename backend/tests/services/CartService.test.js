const CartService = require('../../services/CartService');

describe('CartService', () => {
  describe('calculateCart', () => {
    it('should return 0 totals for an empty cart', () => {
      const result = CartService.calculateCart([]);

      expect(result).toEqual({
        items: [],
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total: 0
      });
    });

    it('should calculate totals correctly for items without discount', () => {
      const items = [
        { id: 1, name: 'Item A', quantity: 2, price: 50 }, // 100
        { id: 2, name: 'Item B', quantity: 1, unit_price: 150 } // 150
      ];

      const result = CartService.calculateCart(items);

      // Expected total: 250
      // Expected VAT exempt: 250 / 1.12 = 223.21...
      // Expected tax: 250 - 223.21... = 26.785...

      expect(result.items).toHaveLength(2);
      expect(result.subtotal).toBeCloseTo(223.21);
      expect(result.tax_amount).toBeCloseTo(26.79);
      expect(result.discount_amount).toBe(0);
      expect(result.total).toBe(250);
    });

    it('should calculate senior_pwd discount correctly', () => {
      // For senior_pwd, unit price is first VAT exempted, then a 20% discount is applied.
      const items = [
        { id: 1, name: 'Item A', quantity: 1, price: 112 }
      ];

      const result = CartService.calculateCart(items, 'senior_pwd');

      // Unit Price: 112
      // VAT Exempt Price: 112 / 1.12 = 100
      // Discount: 100 * 0.20 = 20
      // Line Subtotal: (100 - 20) * 1 = 80
      // Tax: 0 (senior citizens are tax exempt)

      expect(result.items[0].discount).toBeCloseTo(20);
      expect(result.items[0].subtotal).toBeCloseTo(80);
      expect(result.subtotal).toBe(80); // these return fixed parsed floats in the return object
      expect(result.tax_amount).toBe(0);
      expect(result.discount_amount).toBe(20);
      expect(result.total).toBe(80);
    });

    it('should calculate percent_10 discount correctly', () => {
      // 10% discount on the VAT-inclusive amount?
      // Let's see the logic: lineTax = (unitPrice - vatExemptPrice) * qty
      // lineSubtotal = lineTax + vatExemptPrice * qty = unitPrice * qty
      // lineDiscount = lineSubtotal * 0.10
      // lineSubtotal -= lineDiscount
      // lineTax = (lineSubtotal / 1.12) * 0.12
      const items = [
        { id: 1, name: 'Item A', quantity: 1, price: 100 }
      ];

      const result = CartService.calculateCart(items, 'percent_10');

      // Unit Price: 100
      // Initial subtotal: 100
      // Discount: 100 * 0.10 = 10
      // New subtotal (VAT inclusive): 90
      // New Tax: (90 / 1.12) * 0.12 = 9.642...
      // New Subtotal (VAT exclusive): 90 - 9.642... = 80.357...

      expect(result.discount_amount).toBe(10);
      expect(result.total).toBe(90);
      expect(result.tax_amount).toBeCloseTo(9.64);
      expect(result.subtotal).toBeCloseTo(80.36);
    });

    it('should calculate percent_20 discount correctly', () => {
      const items = [
        { id: 1, name: 'Item A', quantity: 2, price: 50 } // Total 100
      ];

      const result = CartService.calculateCart(items, 'percent_20');

      // Unit Price: 50, Qty: 2 => Initial subtotal: 100
      // Discount: 100 * 0.20 = 20
      // New subtotal (VAT inclusive): 80
      // New Tax: (80 / 1.12) * 0.12 = 8.571...
      // New Subtotal (VAT exclusive): 80 - 8.571... = 71.428...

      expect(result.discount_amount).toBe(20);
      expect(result.total).toBe(80);
      expect(result.tax_amount).toBeCloseTo(8.57);
      expect(result.subtotal).toBeCloseTo(71.43);
    });

    it('should handle items with missing quantity or price gracefully', () => {
      const items = [
        { id: 1, name: 'Item A' } // Missing quantity and price, fallback to qty: 1, price: 0
      ];

      const result = CartService.calculateCart(items);

      expect(result.items[0].quantity).toBe(1);
      expect(result.items[0].unit_price).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.tax_amount).toBe(0);
      expect(result.discount_amount).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should preserve plugin_attributes for items', () => {
      const items = [
        { id: 1, name: 'Item A', price: 100, plugin_attributes: { color: 'red' } }
      ];

      const result = CartService.calculateCart(items);

      expect(result.items[0].plugin_attributes).toEqual({ color: 'red' });
    });
  });
});
