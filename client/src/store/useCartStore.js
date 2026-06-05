import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  discountType: null,
  customerId: null,
  pluginAttributes: {},
  notes: '',

  addItem: (product) => {
    const items = get().items;
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      set({
        items: items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      });
    } else {
      set({ items: [...items, { ...product, quantity: 1 }] });
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter(i => i.id !== productId) });
  },

  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map(i => i.id === productId ? { ...i, quantity: qty } : i)
    });
  },

  setDiscountType: (type) => set({ discountType: type }),
  setCustomerId: (id) => set({ customerId: id }),
  setPluginAttributes: (attrs) => set({ pluginAttributes: { ...get().pluginAttributes, ...attrs } }),
  setNotes: (notes) => set({ notes }),
  
  clearCart: () => set({ items: [], discountType: null, customerId: null, pluginAttributes: {}, notes: '' }),

  getSubtotal: () => {
    const total = get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return parseFloat((total / 1.12).toFixed(2));
  },

  getTax: () => {
    const total = get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (get().discountType === 'senior_pwd') return 0;
    const sub = total / 1.12;
    let disc = 1;
    if (get().discountType === 'percent_10') disc = 0.9;
    if (get().discountType === 'percent_20') disc = 0.8;
    return parseFloat(((sub * disc) * 0.12).toFixed(2));
  },

  getDiscountAmount: () => {
    const items = get().items;
    const isSenior = get().discountType === 'senior_pwd';
    let totalDiscount = 0;

    for (const item of items) {
      const lineSubtotal = item.price * item.quantity;
      if (isSenior) {
        const vatExempt = lineSubtotal / 1.12;
        totalDiscount += vatExempt * 0.20;
      } else {
        if (get().discountType === 'percent_10') totalDiscount += lineSubtotal * 0.10;
        if (get().discountType === 'percent_20') totalDiscount += lineSubtotal * 0.20;
      }
    }
    return parseFloat(totalDiscount.toFixed(2));
  },

  getTotal: () => {
    const disc = get().getDiscountAmount();
    if (get().discountType === 'senior_pwd') {
      const rawTotal = get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return parseFloat(((rawTotal / 1.12) - disc).toFixed(2));
    }
    const rawTotal = get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return parseFloat((rawTotal - disc).toFixed(2));
  }
}));
