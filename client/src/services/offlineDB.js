import { openDB } from 'idb';

const DB_NAME = 'pos-offline-db';
const STORE_PRODUCTS = 'products';
const STORE_CUSTOMERS = 'customers';
const STORE_TRANSACTIONS = 'transactions';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
    db.createObjectStore(STORE_CUSTOMERS, { keyPath: 'id' });
    db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id', autoIncrement: true });
  },
});

export const offlineDB = {
  async saveProducts(products) {
    const db = await dbPromise;
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    await tx.store.clear();
    for (const prod of products) {
      await tx.store.put(prod);
    }
    await tx.done;
  },

  async getProducts() {
    const db = await dbPromise;
    return db.getAll(STORE_PRODUCTS);
  },

  async saveCustomers(customers) {
    const db = await dbPromise;
    const tx = db.transaction(STORE_CUSTOMERS, 'readwrite');
    await tx.store.clear();
    for (const cust of customers) {
      await tx.store.put(cust);
    }
    await tx.done;
  },

  async getCustomers() {
    const db = await dbPromise;
    return db.getAll(STORE_CUSTOMERS);
  },

  async queueOfflineTransaction(txn) {
    const db = await dbPromise;
    return db.add(STORE_TRANSACTIONS, {
      ...txn,
      status: 'offline_queued',
      created_at: new Date().toISOString()
    });
  },

  async getOfflineTransactions() {
    const db = await dbPromise;
    return db.getAll(STORE_TRANSACTIONS);
  },

  async deleteOfflineTransaction(id) {
    const db = await dbPromise;
    return db.delete(STORE_TRANSACTIONS, id);
  }
};
