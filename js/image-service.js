/**
 * ImageService - Dish Image Search, Validation, Compression & Lifecycle (Family Home V1.1 Phase 3)
 * Searches Wikimedia Commons API, sanitizes metadata, validates URLs and MIMEs,
 * compresses images client-side, and manages atomic lifecycle with IndexedDB and StorageManager.
 */
(function(window) {
  'use strict';

  // Allowed raster image MIME types
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  // Max download file size: 10 MB
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

  // Max client-side image dimension
  const MAX_IMAGE_DIMENSION = 1200;

  // WebP compression quality
  const WEBP_QUALITY = 0.85;

  /**
   * Strip HTML tags from strings (e.g. extmetadata from Wikimedia Commons)
   * Converts "<a href='...'>John Doe</a>" -> "John Doe"
   * @param {string} str 
   * @returns {string} Plain text
   */
  function stripHtml(str) {
    if (!str || typeof str !== 'string') return '';
    // Strip script and style blocks completely
    let text = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    // Strip remaining HTML tags using regex
    text = text.replace(/<[^>]*>/g, ' ');
    // Decode common entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ');
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Validate that URL is strictly HTTPS and from safe protocols
   * Reject: http:, javascript:, data:, file:, etc.
   * @param {string} urlStr 
   * @returns {boolean}
   */
  function isSafeHttpsUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    const trimmed = urlStr.trim();
    if (!trimmed.startsWith('https://')) return false;

    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  /**
   * Wikimedia Commons Provider
   */
  const WikimediaProvider = {
    name: 'Wikimedia Commons',
    providerKey: 'wikimedia-commons',
    apiEndpoint: 'https://commons.wikimedia.org/w/api.php',

    /**
     * Search Commons for image files matching query
     * @param {string} query 
     * @param {number} limit 
     * @returns {Promise<Array>} Normalized image results
     */
    async search(query, limit = 12) {
      if (!query || typeof query !== 'string' || !query.trim()) {
        return [];
      }

      const cleanQuery = query.trim();

      // Query 1: exact query
      let results = await this._executeApiSearch(cleanQuery, limit);

      // Query 2: If fewer than 3 results, try fallback with "Vietnamese food"
      if (results.length < 3 && !cleanQuery.toLowerCase().includes('vietnam')) {
        const fallbackQuery = `${cleanQuery} Vietnamese food`;
        const fallbackResults = await this._executeApiSearch(fallbackQuery, limit);
        // Combine unique by originalUrl or title
        const existingIds = new Set(results.map(r => r.title));
        for (const item of fallbackResults) {
          if (!existingIds.has(item.title) && results.length < limit) {
            results.push(item);
            existingIds.add(item.title);
          }
        }
      }

      // Rank results according to relevance and quality
      results = this.rankResults(results, cleanQuery);

      return results.slice(0, limit);
    },

    /**
     * Internal API execution
     */
    async _executeApiSearch(searchQuery, limit) {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        origin: '*',
        generator: 'search',
        gsrnamespace: '6', // File namespace
        gsrlimit: String(Math.min(limit * 2, 24)),
        gsrsearch: searchQuery,
        prop: 'imageinfo',
        iiprop: 'url|size|extmetadata|mime',
        iiurlwidth: '640'
      });

      const url = `${this.apiEndpoint}?${params.toString()}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Wikimedia API error: HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.query || !data.query.pages) {
          return [];
        }

        const rawPages = Object.values(data.query.pages);
        const normalized = [];

        for (const page of rawPages) {
          const item = this.normalizeResult(page);
          if (item) {
            normalized.push(item);
          }
        }

        return normalized;
      } catch (err) {
        console.warn('[WikimediaProvider] Search fetch error:', err.message);
        throw err;
      }
    },

    /**
     * Normalize raw Wikimedia API page response into clean image object
     */
    normalizeResult(page) {
      if (!page || !page.imageinfo || !Array.isArray(page.imageinfo) || page.imageinfo.length === 0) {
        return null;
      }

      const info = page.imageinfo[0];
      const mime = (info.mime || '').toLowerCase();

      // Only accept raster images (reject svg, html, pdf, audio, video)
      if (!ALLOWED_MIME_TYPES.includes(mime)) {
        return null;
      }

      // Check URLs
      const originalUrl = info.url;
      const thumbnailUrl = info.thumburl || info.url;
      const sourcePageUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`;

      if (!isSafeHttpsUrl(originalUrl) || !isSafeHttpsUrl(thumbnailUrl) || !isSafeHttpsUrl(sourcePageUrl)) {
        return null;
      }

      const width = typeof info.width === 'number' ? info.width : null;
      const height = typeof info.height === 'number' ? info.height : null;

      // Filter out tiny icons (less than 150px)
      if (width !== null && height !== null && (width < 150 || height < 150)) {
        return null;
      }

      // ExtMetadata extraction & sanitization
      const meta = info.extmetadata || {};

      // Check NonFree or deletion notices
      const nonFree = meta.NonFree?.value;
      if (nonFree && (nonFree === 'true' || nonFree === '1')) {
        return null;
      }

      const rawAuthor = meta.Artist?.value || meta.Credit?.value || '';
      const author = stripHtml(rawAuthor) || 'Wikimedia Commons Contributor';

      const rawLicense = meta.LicenseShortName?.value || meta.License?.value || 'Creative Commons';
      const licenseName = stripHtml(rawLicense);

      const rawLicenseUrl = meta.LicenseUrl?.value || '';
      const licenseUrl = isSafeHttpsUrl(rawLicenseUrl) ? rawLicenseUrl.trim() : null;

      // Title cleanup
      let title = (page.title || '').replace(/^File:/i, '').replace(/\.[^/.]+$/, '');
      title = stripHtml(title).replace(/_/g, ' ');

      const attributionRequired = meta.AttributionRequired?.value !== 'false';

      return {
        provider: 'wikimedia-commons',
        providerName: 'Wikimedia Commons',
        title: title || 'Ảnh món ăn',
        thumbnailUrl,
        originalUrl,
        sourcePageUrl,
        author,
        licenseName,
        licenseUrl,
        attributionRequired,
        width,
        height,
        mimeType: mime
      };
    },

    /**
     * Score and sort search results to promote the most suitable dish photos
     */
    rankResults(results, query) {
      if (!Array.isArray(results)) return [];
      const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

      return [...results].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();

        // Keyword matches in title
        queryTokens.forEach(token => {
          if (titleA.includes(token)) scoreA += 10;
          if (titleB.includes(token)) scoreB += 10;
        });

        // Penalize icons, logos, flags, maps, diagrams
        const badKeywords = ['icon', 'logo', 'flag', 'map', 'diagram', 'symbol', 'vector', 'sign'];
        badKeywords.forEach(bad => {
          if (titleA.includes(bad)) scoreA -= 20;
          if (titleB.includes(bad)) scoreB -= 20;
        });

        // Resolution score (prefer good photo sizes: width >= 600)
        if (a.width && a.width >= 600) scoreA += 5;
        if (b.width && b.width >= 600) scoreB += 5;

        // License bonus
        if (a.licenseUrl) scoreA += 2;
        if (b.licenseUrl) scoreB += 2;

        return scoreB - scoreA;
      });
    }
  };

  /**
   * Providers Registry
   */
  const ImageProviders = {
    wikimedia: WikimediaProvider
  };

  /**
   * Main ImageService Class
   */
  class ImageService {
    constructor() {
      this.providers = ImageProviders;
      this.activeProviderKey = 'wikimedia';
      // In-memory search cache for current session
      this.searchCache = new Map();
      // In-memory blob URLs mapped by assetId
      this.blobUrlMap = new Map();
    }

    /**
     * Search dish images using active provider with in-memory caching
     * @param {string} query 
     * @param {number} limit 
     * @returns {Promise<Array>} Array of image candidates
     */
    async searchDishImages(query, limit = 12) {
      if (!query || typeof query !== 'string' || !query.trim()) {
        return [];
      }

      const cacheKey = `${this.activeProviderKey}:${query.trim().toLowerCase()}`;
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey);
      }

      const provider = this.providers[this.activeProviderKey];
      if (!provider) {
        throw new Error(`Provider "${this.activeProviderKey}" not found`);
      }

      try {
        const results = await provider.search(query.trim(), limit);
        this.searchCache.set(cacheKey, results);
        return results;
      } catch (err) {
        console.warn(`[ImageService] Provider "${this.activeProviderKey}" search error:`, err.message);
        return [];
      }
    }

    /**
     * Download remote image as Blob with size & MIME validation
     * @param {Object} imageResult 
     * @returns {Promise<Blob>}
     */
    async downloadImage(imageResult) {
      if (!imageResult) {
        throw new Error('Missing imageResult');
      }

      // Prefer thumbnail URL if available and original is not specified or huge
      let downloadUrl = imageResult.thumbnailUrl || imageResult.originalUrl;

      if (!isSafeHttpsUrl(downloadUrl)) {
        throw new Error(`Unsafe image URL: ${downloadUrl}`);
      }

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/webp,image/png,image/jpeg,*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: HTTP ${response.status}`);
      }

      // Check Content-Length if present
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
        // If original was oversized, try falling back to thumbnail if different
        if (downloadUrl === imageResult.originalUrl && imageResult.thumbnailUrl && imageResult.thumbnailUrl !== downloadUrl) {
          downloadUrl = imageResult.thumbnailUrl;
          return this.downloadImage({ ...imageResult, originalUrl: downloadUrl });
        }
        throw new Error('Image file is too large (exceeds 10 MB limit)');
      }

      const blob = await response.blob();

      // Check Blob size
      if (blob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('Downloaded image exceeds 10 MB limit');
      }

      // Validate MIME type
      const mime = (blob.type || imageResult.mimeType || '').toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(mime)) {
        throw new Error(`Unsupported image type "${mime}". Allowed: JPEG, PNG, WebP`);
      }

      return blob;
    }

    /**
     * Validate Blob size and MIME type
     * @param {Blob|Object} blob 
     */
    validateBlob(blob) {
      if (!blob) throw new Error('Missing image blob');
      if (blob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('Ảnh quá lớn (vượt quá 10 MB limit)');
      }
      const mime = (blob.type || '').toLowerCase();
      if (mime && !ALLOWED_MIME_TYPES.includes(mime)) {
        throw new Error(`Định dạng ảnh không được hỗ trợ "${mime}". Chỉ chấp nhận: JPEG, PNG, WebP`);
      }
      return true;
    }

    /**
     * Helper to normalize raw Wikimedia page
     */
    normalizeWikimediaItem(rawPage, query = '') {
      return this.providers.wikimedia.normalizeResult(rawPage, query);
    }

    /**
     * Helper to check URL safety
     */
    isSafeHttpsUrl(url) {
      return isSafeHttpsUrl(url);
    }

    /**
     * Helper to strip HTML
     */
    stripHtml(html) {
      return stripHtml(html);
    }

    /**
     * Helper to check allowed MIME type
     */
    isAllowedMimeType(mime) {
      return ALLOWED_MIME_TYPES.includes((mime || '').toLowerCase());
    }

    /**
     * Client-side resize and compression of image Blob
     * Scales max dimension down to MAX_IMAGE_DIMENSION (1200px)
     * Preserves aspect ratio, never upscales, encodes to WebP (or JPEG fallback)
     * @param {Blob} rawBlob 
     * @returns {Promise<{ blob: Blob, width: number, height: number, mimeType: string }>}
     */
    async compressImage(rawBlob) {
      if (!rawBlob) {
        throw new Error('Missing rawBlob');
      }

      // Check if Canvas & Image APIs are available (browser environment)
      if (typeof window === 'undefined' || typeof Image === 'undefined' || typeof document === 'undefined' || typeof document.createElement !== 'function') {
        // Node.js test environment pass-through
        return {
          blob: rawBlob,
          width: 800,
          height: 600,
          mimeType: rawBlob.type || 'image/jpeg'
        };
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(rawBlob);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);

          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Compute target dimensions (no upscale)
          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            if (width >= height) {
              height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
              width = MAX_IMAGE_DIMENSION;
            } else {
              width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
              height = MAX_IMAGE_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ blob: rawBlob, width, height, mimeType: rawBlob.type || 'image/jpeg' });
            return;
          }

          // Draw image to canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Try exporting WebP first, fallback to JPEG
          canvas.toBlob((webpBlob) => {
            if (webpBlob && webpBlob.size > 0) {
              resolve({
                blob: webpBlob,
                width,
                height,
                mimeType: 'image/webp'
              });
            } else {
              // Fallback to JPEG
              canvas.toBlob((jpegBlob) => {
                if (jpegBlob) {
                  resolve({
                    blob: jpegBlob,
                    width,
                    height,
                    mimeType: 'image/jpeg'
                  });
                } else {
                  resolve({
                    blob: rawBlob,
                    width,
                    height,
                    mimeType: rawBlob.type || 'image/jpeg'
                  });
                }
              }, 'image/jpeg', 0.85);
            }
          }, 'image/webp', WEBP_QUALITY);
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          // If decoding failed, return rawBlob fallback
          resolve({
            blob: rawBlob,
            width: null,
            height: null,
            mimeType: rawBlob.type || 'image/jpeg'
          });
        };

        img.src = objectUrl;
      });
    }

    /**
     * Atomically save a chosen image for a dish
     * 1. Download & compress binary blob
     * 2. Save blob to IndexedDB
     * 3. Update dish metadata in StorageManager
     * 4. Delete old blob from IndexedDB if replace succeeded
     * @param {string} dishId 
     * @param {Object} imageResult (from search or custom input)
     * @param {Object} options { allowRemoteFallback: boolean }
     * @returns {Promise<Object>} Updated dish
     */
    async saveDishImage(dishId, imageResult, options = {}) {
      if (!dishId) throw new Error('Missing dishId');
      if (!imageResult) throw new Error('Missing imageResult');

      const dishes = window.StorageManager.getDishes();
      const dish = dishes.find(d => d.id === dishId);
      if (!dish) {
        throw new Error(`Dish not found: ${dishId}`);
      }

      const oldAssetId = dish.image?.assetId || null;
      let newAssetId = null;
      let savedLocally = true;
      let finalWidth = imageResult.width || null;
      let finalHeight = imageResult.height || null;
      let mimeType = imageResult.mimeType || 'image/jpeg';

      try {
        // Step 1: Download image Blob
        const rawBlob = imageResult.blob || await this.downloadImage(imageResult);
        this.validateBlob(rawBlob);

        // Step 2: Compress / Resize client-side
        const processed = await this.compressImage(rawBlob);
        finalWidth = processed.width || finalWidth;
        finalHeight = processed.height || finalHeight;
        mimeType = processed.mimeType || mimeType;

        // Step 3: Save to IndexedDB
        newAssetId = 'dishimg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        await window.ImageStorage.saveImageAsset({
          id: newAssetId,
          dishId: dishId,
          blob: processed.blob,
          mimeType: mimeType,
          width: finalWidth,
          height: finalHeight
        });

      } catch (storageErr) {
        console.warn('[ImageService] Local binary save failed:', storageErr.message);

        // Fallback: If allowed or configured, use remote URL without local storage
        if (options.allowRemoteFallback || options.savedLocally === false) {
          savedLocally = false;
          newAssetId = null;
        } else {
          // If save failed and no fallback chosen, rethrow error to keep old image intact!
          throw new Error('Không thể lưu ảnh cục bộ: ' + storageErr.message);
        }
      }

      // Step 4: Construct dish.image metadata
      const newImageMetadata = {
        assetId: newAssetId,
        provider: imageResult.provider || 'wikimedia-commons',
        sourcePageUrl: imageResult.sourcePageUrl || null,
        originalUrl: imageResult.originalUrl || null,
        thumbnailUrl: imageResult.thumbnailUrl || imageResult.originalUrl || null,
        title: stripHtml(imageResult.title || dish.name),
        author: stripHtml(imageResult.author || 'Wikimedia Commons Contributor'),
        licenseName: stripHtml(imageResult.licenseName || 'Creative Commons'),
        licenseUrl: isSafeHttpsUrl(imageResult.licenseUrl) ? imageResult.licenseUrl : null,
        attributionRequired: imageResult.attributionRequired !== false,
        width: finalWidth,
        height: finalHeight,
        savedLocally: savedLocally,
        updatedAt: Date.now()
      };

      // Step 5: Update dish in StorageManager
      const updatedDish = window.StorageManager.updateDish(dishId, {
        image: newImageMetadata
      });

      // Step 6: On successful new save, clean up the old asset from IndexedDB
      if (oldAssetId && oldAssetId !== newAssetId) {
        try {
          await window.ImageStorage.deleteImageAsset(oldAssetId);
          this.revokeDishUrl(oldAssetId);
        } catch (_) {}
      }

      return updatedDish;
    }

    /**
     * Delete image from a dish and cleanup binary asset
     * @param {string} dishId 
     * @returns {Promise<Object>} Updated dish
     */
    async deleteDishImage(dishId) {
      if (!dishId) return null;

      const dishes = window.StorageManager.getDishes();
      const dish = dishes.find(d => d.id === dishId);
      if (!dish) return null;

      const assetId = dish.image?.assetId;

      // Clear metadata on dish
      const updatedDish = window.StorageManager.updateDish(dishId, {
        image: null
      });

      // Cleanup binary asset from IndexedDB
      if (assetId) {
        try {
          await window.ImageStorage.deleteImageAsset(assetId);
          this.revokeDishUrl(assetId);
        } catch (_) {}
      }

      return updatedDish;
    }

    /**
     * Get displayable image URL for a dish.
     * Checks IndexedDB blob first; if missing or remote, falls back to remote URL or null.
     * @param {Object} dish 
     * @returns {Promise<string|null>}
     */
    async getDishImageUrl(dish) {
      if (!dish || !dish.image) return null;

      const imgMeta = dish.image;

      // 1. Try local IndexedDB asset
      if (imgMeta.savedLocally && imgMeta.assetId) {
        // Check active in-memory object URL cache
        if (this.blobUrlMap.has(imgMeta.assetId)) {
          return this.blobUrlMap.get(imgMeta.assetId);
        }

        try {
          const record = await window.ImageStorage.getImageAsset(imgMeta.assetId);
          if (record && record.blob) {
            const objectUrl = window.ImageStorage.createObjectUrl(record.blob);
            this.blobUrlMap.set(imgMeta.assetId, objectUrl);
            return objectUrl;
          }
        } catch (err) {
          console.warn('[ImageService] Failed to load local blob:', err.message);
        }
      }

      // 2. Missing blob fallback: remote original or thumbnail URL if safe HTTPS
      if (imgMeta.thumbnailUrl && isSafeHttpsUrl(imgMeta.thumbnailUrl)) {
        return imgMeta.thumbnailUrl;
      }
      if (imgMeta.originalUrl && isSafeHttpsUrl(imgMeta.originalUrl)) {
        return imgMeta.originalUrl;
      }

      return null;
    }

    /**
     * Synchronous URL getter if objectUrl was already cached, otherwise returns safe remote URL or null
     * Useful for synchronous render passes
     * @param {Object} dish 
     * @returns {string|null}
     */
    getDishImageUrlSync(dish) {
      if (!dish || !dish.image) return null;
      const imgMeta = dish.image;

      if (imgMeta.savedLocally && imgMeta.assetId && this.blobUrlMap.has(imgMeta.assetId)) {
        return this.blobUrlMap.get(imgMeta.assetId);
      }

      if (imgMeta.thumbnailUrl && isSafeHttpsUrl(imgMeta.thumbnailUrl)) {
        return imgMeta.thumbnailUrl;
      }
      if (imgMeta.originalUrl && isSafeHttpsUrl(imgMeta.originalUrl)) {
        return imgMeta.originalUrl;
      }

      return null;
    }

    /**
     * Revoke object URL
     */
    revokeDishUrl(assetId) {
      if (!assetId) return;
      if (this.blobUrlMap.has(assetId)) {
        const url = this.blobUrlMap.get(assetId);
        window.ImageStorage.revokeObjectUrl(url);
        this.blobUrlMap.delete(assetId);
      }
    }
  }

  // Export Singleton and Class
  const imageServiceInstance = new ImageService();
  window.ImageService = imageServiceInstance;
  window.ImageServiceClass = ImageService;
  window.WikimediaProvider = WikimediaProvider;
  window.ImageUtils = {
    stripHtml,
    isSafeHttpsUrl,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE_BYTES,
    MAX_IMAGE_DIMENSION
  };

})(typeof window !== 'undefined' ? window : global);
