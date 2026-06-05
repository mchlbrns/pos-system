import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      // User / Auth
      user: null,
      token: null,
      setUser: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),

      // Business
      currentBusiness: {
        name: 'Universal POS',
        address: '',
        tin: '',
        phone: '',
      },
      setCurrentBusiness: (biz) => set({ currentBusiness: { ...get().currentBusiness, ...biz } }),

      // Theme
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      // Online status
      isOnline: navigator.onLine,
      setOnline: (val) => set({ isOnline: val }),

      // Active plugin
      activePlugins: [],
      setActivePlugins: (plugins) => set({ activePlugins: plugins }),

      // Held transactions
      heldTransactions: [],
      holdTransaction: (txn) =>
        set((s) => ({ heldTransactions: [...s.heldTransactions, { ...txn, id: Date.now() }] })),
      recallTransaction: (id) =>
        set((s) => ({
          heldTransactions: s.heldTransactions.filter((t) => t.id !== id),
        })),

      // Settings
      settings: {
        taxRate: 12,
        currency: '₱',
        receiptHeader: '',
        receiptFooter: 'Thank you for your purchase!',
      },
      setSettings: (settings) => set((s) => ({ settings: { ...s.settings, ...settings } })),
    }),
    {
      name: 'pos-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        currentBusiness: state.currentBusiness,
        theme: state.theme,
        settings: state.settings,
        heldTransactions: state.heldTransactions,
      }),
    }
  )
);

export default useStore;
