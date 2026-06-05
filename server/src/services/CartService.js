/**
 * @module services/CartService
 * @description Computes totals, discounts (including PH Senior/PWD 20% VAT exemption), and taxes.
 */

'use strict';

class CartService {
  /**
   * Computes the cart summary.
   * Philippine Tax System: 12% VAT.
   * Senior Citizen / PWD Discount in Philippines: 
   * - Item is VAT exempt (divide retail price by 1.12 to get VAT-exempt sales amount).
   * - Then apply 20% discount on the VAT-exempt sales amount.
   * @param {Array<Object>} items
   * @param {string} discountType - null, 'percent_10', 'percent_20', 'senior_pwd'
   * @returns {Object} Calculated totals and modified items
   */
  static calculateCart(items, discountType = null) {
    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;
    const computedItems = [];

    const isSenior = discountType === 'senior_pwd';

    for (const item of items) {
      const qty = item.quantity || 1;
      const unitPrice = item.price || 0;
      let lineSubtotal = qty * unitPrice;
      let lineDiscount = 0;
      let lineTax = 0;

      if (isSenior) {
        // Step 1: Remove VAT (12%)
        const vatExemptPrice = unitPrice / 1.12;
        // Step 2: Apply 20% discount
        const discountPerItem = vatExemptPrice * 0.20;
        
        lineDiscount = discountPerItem * qty;
        lineSubtotal = (vatExemptPrice - discountPerItem) * qty;
        lineTax = 0; // Senior/PWD purchases are VAT-exempt
      } else {
        // Regular pricing
        // Assuming prices are VAT-inclusive (common in PH retail)
        const vatExemptPrice = unitPrice / 1.12;
        lineTax = (unitPrice - vatExemptPrice) * qty;
        lineSubtotal = lineTax + vatExemptPrice * qty; // Total inclusive amount

        if (discountType === 'percent_10') {
          lineDiscount = lineSubtotal * 0.10;
        } else if (discountType === 'percent_20') {
          lineDiscount = lineSubtotal * 0.20;
        }
        lineSubtotal -= lineDiscount;
        // Recompute VAT based on discounted total
        lineTax = (lineSubtotal / 1.12) * 0.12;
      }

      subtotal += lineSubtotal - lineTax;
      tax_amount += lineTax;
      discount_amount += lineDiscount;

      computedItems.push({
        product_id: item.id || item.product_id,
        product_name: item.name || item.product_name,
        quantity: qty,
        unit_price: unitPrice,
        discount: lineDiscount / qty,
        subtotal: lineSubtotal
      });
    }

    const total = subtotal + tax_amount;

    return {
      items: computedItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax_amount: parseFloat(tax_amount.toFixed(2)),
      discount_amount: parseFloat(discount_amount.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }
}

module.exports = CartService;
