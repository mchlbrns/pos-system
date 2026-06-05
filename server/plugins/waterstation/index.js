module.exports = {
  name: 'waterstation',
  hooks: {
    beforeProductCreate(product) {
      const attrs = product.plugin_attributes || {};
      if (attrs.gallon_type === undefined) attrs.gallon_type = 'round';
      if (attrs.needs_container_return === undefined) attrs.needs_container_return = false;
      product.plugin_attributes = attrs;
      return product;
    },
    beforeProductUpdate(product) {
      return product;
    },
    beforeCheckout(cartContext, { db }) {
      let updatedItems = [...cartContext.items];
      let hasDepositIssues = false;

      cartContext.items.forEach(item => {
        if (item.plugin_attributes && item.plugin_attributes.needs_container_return) {
          const returned = cartContext.plugin_attributes ? cartContext.plugin_attributes.returned_containers : 0;
          if (returned < item.quantity) {
            const depositProduct = db.prepare('SELECT * FROM products WHERE sku = "WS-DEP" OR name LIKE "%Deposit%" LIMIT 1').get();
            if (depositProduct) {
              const shortfall = item.quantity - returned;
              updatedItems.push({
                ...depositProduct,
                quantity: shortfall,
                plugin_attributes: { auto_added_deposit: true }
              });
              hasDepositIssues = true;
            }
          }
        }
      });

      if (hasDepositIssues) {
        cartContext.items = updatedItems;
        cartContext.notes = (cartContext.notes || '') + ' [Auto-added container deposits for shortfall]';
      }

      return cartContext;
    },
    afterCheckout(checkoutResult) {
      console.log('WaterStation: Processed order #' + checkoutResult.transaction.transaction_number);
      return checkoutResult;
    }
  }
};
