import { get, set, del } from 'idb-keyval';

const indexedDBStorage = {
  async getItem(key) {
    try {
      const value = await get(key);
      return value === undefined ? null : value; 
    } catch (error) {
      console.error('IndexedDB get error:', error);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      await set(key, value);
    } catch (error) {
      console.error('IndexedDB set error:', error);
    }
  },

  async removeItem(key) {
    try {
      await del(key);
    } catch (error) {
      console.error('IndexedDB remove error:', error);
    }
  },
};

export default indexedDBStorage;