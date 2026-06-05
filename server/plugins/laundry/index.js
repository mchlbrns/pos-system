module.exports = {
  name: 'laundry',
  hooks: {
    beforeCheckout(cartContext) {
      cartContext.items = cartContext.items.map(item => {
        const attrs = item.plugin_attributes || {};
        if (!attrs.service_type) attrs.service_type = 'wash_dry';
        if (!attrs.weight_kg) attrs.weight_kg = 5.0;
        return { ...item, plugin_attributes: attrs };
      });
      return cartContext;
    },
    afterCheckout(checkoutResult) {
      console.log('Laundry: Tracked weight details for #' + checkoutResult.transaction.transaction_number);
      return checkoutResult;
    }
  }
};
