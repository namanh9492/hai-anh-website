/**
 * ImageStorage - Binary Asset Storage using IndexedDB (Family Home V1.1 Phase 3)
 * Stores binary image Blobs locally in IndexedDB to avoid localStorage quota limits.
 * Uses an adapter pattern for browser IndexedDB and in-memory mock fallback in Node/testing.
 */
(function(window) {
  'use strict';

  const DB_NAME = 'familyHomeAssets';
  const DB_VERSION = 1;
  const STORE_NAME = 'dishImages';

  /**
   * In-Memory Storage Adapter (used when IndexedDB is unavailable or in Node tests)
   */
  class MemoryStorageAdapter {
    constructor() {
      this.store = new Map();
      this.objectUrls = new Map();
    }

    async init() {
      return true;
    }

    async save(record) {
      if (!record || !record.id) {
        throw new Error('Invalid record: missing id');
      }
      this.store.set(record.id, {
        ...record,
        updatedAt: Date.now()
      });
      return record;
    }

    async get(id) {
      if (!id) return null;
      return this.store.get(id) || null;
    }

    async delete(id) {
      if (!id) return false;
      return this.store.delete(id);
    }

    async getByDishId(dishId) {
      if (!dishId) return [];
      const results = [];
      for (const record of this.store.values()) {
        if (record.dishId === dishId) {
          results.push(record);
        }
      }
      return results;
    }

    async getAll() {
      return Array.from(this.store.values());
    }

    async calculateTotalBytes() {
      let total = 0;
      for (const record of this.store.values()) {
        if (record.blob && typeof record.blob.size === 'number') {
          total += record.blob.size;
        } else if (typeof record.size === 'number') {
          total += record.size;
        }
      }
      return total;
    }

    async clear() {
      this.store.clear();
      return true;
    }

    createObjectUrl(blob) {
      if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
        try {
          return window.URL.createObjectURL(blob);
        } catch (_) {}
      }
      const fakeUrl = 'blob:memory://' + Math.random().toString(36).substr(2, 9);
      this.objectUrls.set(fakeUrl, blob);
      return fakeUrl;
    }

    revokeObjectUrl(url) {
      if (typeof window !== 'undefined' && window.URL && typeof window.URL.revokeObjectURL === 'function') {
        try {
          window.URL.revokeObjectURL(url);
        } catch (_) {}
      }
      this.objectUrls.delete(url);
    }
  }

  /**
   * Browser IndexedDB Storage Adapter
   */
  class IndexedDBAdapter {
    constructor() {
      this.db = null;
      this.initPromise = null;
      this.activeUrls = new Set();
    }

    async init() {
      if (this.db) return this.db;
      if (this.initPromise) return this.initPromise;

      if (typeof window === 'undefined' || !window.indexedDB) {
        throw new Error('IndexedDB is not supported in this environment');
      }

      this.initPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('dishId', 'dishId', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (event) => {
          reject(new Error('Failed to open IndexedDB: ' + (event.target.error ? event.target.error.message : 'Unknown error')));
        };
      });

      return this.initPromise;
    }

    async _getStore(mode = 'readonly') {
      const db = await this.init();
      const transaction = db.transaction([STORE_NAME], mode);
      return transaction.objectStore(STORE_NAME);
    }

    async save(record) {
      if (!record || !record.id) {
        throw new Error('Invalid record: missing id');
      }
      const store = await this._getStore('readwrite');
      return new Promise((resolve, reject) => {
        const item = {
          ...record,
          updatedAt: Date.now()
        };
        const request = store.put(item);
        request.onsuccess = () => resolve(item);
        request.onerror = (e) => reject(new Error('Failed to save to IndexedDB: ' + e.target.error?.message));
      });
    }

    async get(id) {
      if (!id) return null;
      const store = await this._getStore('readonly');
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = (e) => resolve(e.target.result || null);
        request.onerror = () => resolve(null);
      });
    }

    async delete(id) {
      if (!id) return false;
      const store = await this._getStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    }

    async getByDishId(dishId) {
      if (!dishId) return [];
      const store = await this._getStore('readonly');
      return new Promise((resolve) => {
        if (store.indexNames.contains('dishId')) {
          const index = store.index('dishId');
          const request = index.getAll(dishId);
          request.onsuccess = (e) => resolve(e.target.result || []);
          request.onerror = () => resolve([]);
        } else {
          // Fallback to full scan
          const request = store.getAll();
          request.onsuccess = (e) => {
            const list = e.target.result || [];
            resolve(list.filter(item => item.dishId === dishId));
          };
          request.onerror = () => resolve([]);
        }
      });
    }

    async getAll() {
      const store = await this._getStore('readonly');
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = (e) => resolve(e.target.result || []);
        request.onerror = () => resolve([]);
      });
    }

    async calculateTotalBytes() {
      const all = await this.getAll();
      let total = 0;
      all.forEach(item => {
        if (item.blob && typeof item.blob.size === 'number') {
          total += item.blob.size;
        } else if (typeof item.size === 'number') {
          total += item.size;
        }
      });
      return total;
    }

    async clear() {
      const store = await this._getStore('readwrite');
      return new Promise((resolve) => {
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    }

    createObjectUrl(blob) {
      if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
        const url = window.URL.createObjectURL(blob);
        this.activeUrls.add(url);
        return url;
      }
      return 'blob:fallback://' + Math.random().toString(36).substr(2, 9);
    }

    revokeObjectUrl(url) {
      if (typeof window !== 'undefined' && window.URL && typeof window.URL.revokeObjectURL === 'function') {
        try {
          window.URL.revokeObjectURL(url);
        } catch (_) {}
      }
      this.activeUrls.delete(url);
    }
  }

  /**
   * Main ImageStorage Service
   */
  class ImageStorageService {
    constructor() {
      // Choose appropriate adapter based on environment
      const hasIndexedDB = typeof window !== 'undefined' && !!window.indexedDB;
      this.adapter = hasIndexedDB ? new IndexedDBAdapter() : new MemoryStorageAdapter();
      this.fallbackMemoryAdapter = new MemoryStorageAdapter();
    }

    /**
     * Swap or inject custom adapter (e.g. for testing)
     */
    setAdapter(adapter) {
      this.adapter = adapter;
    }

    /**
     * Reset to default adapter
     */
    resetAdapter() {
      const hasIndexedDB = typeof window !== 'undefined' && !!window.indexedDB;
      this.adapter = hasIndexedDB ? new IndexedDBAdapter() : new MemoryStorageAdapter();
    }

    /**
     * Initialize underlying storage
     */
    async init() {
      try {
        return await this.adapter.init();
      } catch (err) {
        console.warn('[ImageStorage] Primary adapter init failed, falling back to memory adapter:', err.message);
        this.adapter = this.fallbackMemoryAdapter;
        return await this.adapter.init();
      }
    }

    /**
     * Save an image binary asset
     * @param {Object} param0 
     * @returns {Promise<Object>}
     */
    async saveImageAsset({ id, dishId, blob, mimeType, width = null, height = null }) {
      const assetId = id || ('dishimg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
      const record = {
        id: assetId,
        dishId: dishId || null,
        blob: blob,
        mimeType: mimeType || (blob && blob.type) || 'image/jpeg',
        size: blob && typeof blob.size === 'number' ? blob.size : 0,
        width: typeof width === 'number' ? width : null,
        height: typeof height === 'number' ? height : null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      try {
        await this.adapter.save(record);
        return record;
      } catch (err) {
        // If primary adapter fails (e.g. quota or IDB error), attempt fallback to memory
        if (this.adapter !== this.fallbackMemoryAdapter) {
          console.warn('[ImageStorage] Primary save failed, saving to fallback memory:', err.message);
          await this.fallbackMemoryAdapter.save(record);
          return record;
        }
        throw err;
      }
    }

    /**
     * Get an image asset by ID
     * @param {string} id 
     * @returns {Promise<Object|null>}
     */
    async getImageAsset(id) {
      if (!id) return null;
      try {
        let result = await this.adapter.get(id);
        if (!result && this.adapter !== this.fallbackMemoryAdapter) {
          result = await this.fallbackMemoryAdapter.get(id);
        }
        return result;
      } catch (err) {
        console.warn('[ImageStorage] Failed to get asset:', err.message);
        return null;
      }
    }

    /**
     * Delete an image asset by ID
     * @param {string} id 
     * @returns {Promise<boolean>}
     */
    async deleteImageAsset(id) {
      if (!id) return false;
      try {
        await this.adapter.delete(id);
        await this.fallbackMemoryAdapter.delete(id);
        return true;
      } catch (err) {
        console.warn('[ImageStorage] Failed to delete asset:', err.message);
        return false;
      }
    }

    /**
     * Delete all image assets belonging to a dish
     * @param {string} dishId 
     * @returns {Promise<number>} count of deleted assets
     */
    async deleteImageAssetByDishId(dishId) {
      if (!dishId) return 0;
      try {
        const assets = await this.adapter.getByDishId(dishId);
        let count = 0;
        for (const asset of assets) {
          await this.deleteImageAsset(asset.id);
          count++;
        }
        return count;
      } catch (err) {
        console.warn('[ImageStorage] Failed to delete assets by dishId:', err.message);
        return 0;
      }
    }

    /**
     * Calculate total bytes of all stored images and format into readable string
     * @returns {Promise<Object>} { count, totalBytes, formatted }
     */
    async getStorageEstimate() {
      try {
        const all = await this.adapter.getAll();
        const totalBytes = await this.adapter.calculateTotalBytes();
        let formatted = '0 B';
        if (totalBytes >= 1024 * 1024) {
          formatted = (totalBytes / (1024 * 1024)).toFixed(1) + ' MB';
        } else if (totalBytes >= 1024) {
          formatted = (totalBytes / 1024).toFixed(1) + ' KB';
        } else if (totalBytes > 0) {
          formatted = totalBytes + ' B';
        }

        return {
          count: all.length,
          totalBytes,
          formatted
        };
      } catch (err) {
        return { count: 0, totalBytes: 0, formatted: '0 B' };
      }
    }

    /**
     * Generate Object URL for Blob
     */
    createObjectUrl(blob) {
      if (!blob) return null;
      return this.adapter.createObjectUrl(blob);
    }

    /**
     * Revoke Object URL to prevent memory leaks
     */
    revokeObjectUrl(url) {
      if (!url) return;
      this.adapter.revokeObjectUrl(url);
    }

    /**
     * Clear all records
     */
    async clear() {
      await this.adapter.clear();
      await this.fallbackMemoryAdapter.clear();
      return true;
    }
  }

  // Export Singleton and Class
  const storageInstance = new ImageStorageService();
  window.ImageStorage = storageInstance;
  window.ImageStorageService = ImageStorageService;
  window.MemoryStorageAdapter = MemoryStorageAdapter;
  window.IndexedDBAdapter = IndexedDBAdapter;

})(typeof window !== 'undefined' ? window : global);
