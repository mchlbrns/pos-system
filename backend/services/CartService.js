'use strict';

class CartService {
  static calculateCart(items, discountType = null) {
    let subtotal = 0;
    let tax_amount = 0;
    let discount_amount = 0;
    const computedItems = [];

    const isSenior = discountType === 'senior_pwd';

    for (const item of items) {
      const qty = item.quantity || 1;
      const unitPrice = item.price || item.unit_price || 0;
      let lineSubtotal = qty * unitPrice;
      let lineDiscount = 0;
      let lineTax = 0;

      if (isSenior) {
        const vatExemptPrice = unitPrice / 1.12;
        const discountPerItem = vatExemptPrice * 0.20;
        
        lineDiscount = discountPerItem * qty;
        lineSubtotal = (vatExemptPrice - discountPerItem) * qty;
        lineTax = 0;
      } else {
        const vatExemptPrice = unitPrice / 1.12;
        lineTax = (unitPrice - vatExemptPrice) * qty;
        lineSubtotal = lineTax + vatExemptPrice * qty;

        if (discountType === 'percent_10') {
          lineDiscount = lineSubtotal * 0.10;
        } else if (discountType === 'percent_20') {
          lineDiscount = lineSubtotal * 0.20;
        }
        lineSubtotal -= lineDiscount;
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
        subtotal: lineSubtotal,
        plugin_attributes: item.plugin_attributes || {}
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
