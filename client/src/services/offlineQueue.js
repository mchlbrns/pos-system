import { offlineDB } from './offlineDB';
import api from './api';

export const offlineQueue = {
  async syncQueue() {
    if (!navigator.onLine) return { success: false, reason: 'offline' };
    
    try {
      const txns = await offlineDB.getOfflineTransactions();
      if (txns.length === 0) return { success: true, count: 0 };
      
      console.log(`Syncing ${txns.length} offline transactions...`);
      
      for (const txn of txns) {
        try {
          await api.post('/transactions/checkout', {
            items: txn.items,
            payments: txn.payments,
            customer_id: txn.customer_id,
            discount_type: txn.discountType,
            notes: txn.notes + ' [Offline Synced]',
            plugin_attributes: txn.pluginAttributes
          });
          await offlineDB.deleteOfflineTransaction(txn.id);
        } catch (err) {
          console.error('Failed to sync transaction: ', txn.id, err);
          if (err.response && err.response.status === 400) {
            await offlineDB.deleteOfflineTransaction(txn.id);
          }
        }
      }
      return { success: true, count: txns.length };
    } catch (e) {
      console.error('Offline queue sync error: ', e);
      return { success: false, reason: e.message };
    }
  }
};
