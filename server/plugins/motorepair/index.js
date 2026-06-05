module.exports = {
  name: 'motorepair',
  hooks: {
    beforeCheckout(cartContext) {
      const attrs = cartContext.plugin_attributes || {};
      if (!attrs.mechanic_name) attrs.mechanic_name = 'Unassigned Mechanic';
      cartContext.plugin_attributes = attrs;
      return cartContext;
    },
    afterCheckout(checkoutResult) {
      console.log('MotoRepair: Job order logged for mechanic');
      return checkoutResult;
    }
  }
};
