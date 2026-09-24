/**
 * StorageManager - Isolated storage module with schema versioning
 * Safe fallback, resilient to corrupted or missing data.
 */
(function(window) {
  'use strict';

  const STORAGE_KEYS = {
    DISHES: 'familyHome:v1:dishes',
    MENUS: 'familyHome:v1:menus',
    TIPS: 'familyHome:v1:tips',
    META: 'familyHome:v1:meta'
  };

  const SEED_DISHES = [
    // Món chính (Main dishes)
    { id: 'dish_m1', name: 'Thịt rang cháy cạnh', category: 'main', note: 'Thịt ba chỉ thái mỏng, rang thơm cùng hành lá', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_m2', name: 'Cá kho tộ', category: 'main', note: 'Kho riềng và thịt ba chỉ cho đậm vị', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_m3', name: 'Trứng rán thịt băm', category: 'main', note: 'Thêm ít mộc nhĩ và hành hoa', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_m4', name: 'Gà rang gừng', category: 'main', note: 'Thịt gà ta rang săn với gừng tươi và lá chanh', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_m5', name: 'Thịt kho trứng cút', category: 'main', note: 'Nước dừa thơm ngọt, nước màu caramen', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_m6', name: 'Cá rô phi rán giòn', category: 'main', note: 'Chấm nước mắm tỏi ớt gừng', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_m7', name: 'Bò xào cần tỏi', category: 'main', note: 'Xào lửa to nhanh tay cho thịt mềm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },

    // Rau (Vegetables)
    { id: 'dish_v1', name: 'Rau muống luộc', category: 'vegetable', note: 'Vắt chanh dầm sấu nước luộc', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_v2', name: 'Cải thìa xào tỏi', category: 'vegetable', note: 'Xào giòn với tỏi phi thơm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_v3', name: 'Su su luộc chấm muối vừng', category: 'vegetable', note: 'Thái lát luộc vừa chín tới', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_v4', name: 'Rau cải ngọt luộc', category: 'vegetable', note: 'Chấm nước mắm trứng luộc dầm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_v5', name: 'Đậu cô ve xào lòng mề', category: 'vegetable', note: 'Xào chín tới để giữ độ ngọt giòn', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },

    // Canh (Soup)
    { id: 'dish_s1', name: 'Canh bí xanh nấu tôm', category: 'soup', note: 'Bí gọt vỏ thái mỏng ngọt mát', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_s2', name: 'Canh rau cải nấu thịt băm', category: 'soup', note: 'Thêm vài lát gừng đập dập ấm bụng', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_s3', name: 'Canh cà chua trứng đậu phụ', category: 'soup', note: 'Nấu nhanh, rắc nhiều hành hoa', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_s4', name: 'Canh khoai tây cà rốt sườn', category: 'soup', note: 'Hầm sườn nhừ, khoai bở mềm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_s5', name: 'Canh rau ngót nấu thịt nạc', category: 'soup', note: 'Vò nhẹ lá ngót trước khi nấu cho mềm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },

    // Món phụ (Side dishes)
    { id: 'dish_p1', name: 'Dưa cải muối chua', category: 'side', note: 'Ăn kèm thịt kho hoặc canh chua', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_p2', name: 'Đậu phụ tẩm hành', category: 'side', note: 'Rán vàng nhúng ngay vào mắm hành hoa', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_p3', name: 'Cà pháo muối giòn', category: 'side', note: 'Ăn kèm rau muống luộc', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 }
  ];

  const SEED_TIPS = [
    {
      id: 'tip_1',
      title: 'Vệ sinh mặt kính bếp từ sáng bóng không trầy xước',
      category: 'bep',
      preparationItems: [
        'Baking soda (muối nở)',
        'Giấm trắng hoặc nước rửa chén',
        'Khăn vải sợi microfiber mềm',
        'Miếng bọt biển không xước'
      ],
      content: '1. Đợi mặt kính bếp từ nguội hẳn trước khi vệ sinh.\n2. Rắc đều một lớp mỏng bột baking soda lên vết bẩn, dầu mỡ cháy két.\n3. Xịt giấm trắng lên để tạo phản ứng sủi bọt nhẹ, để yên trong 15-20 phút.\n4. Dùng miếng bọt biển chà nhẹ xoay tròn theo chiều kim đồng hồ.\n5. Dùng khăn microfiber ẩm lau sạch lại 2-3 lần cho đến khi mặt kính bóng loáng.',
      links: [
        { title: 'Video cách làm sạch mặt kính bếp an toàn', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
      ],
      note: 'Tuyệt đối không dùng búi sắt hoặc dao cạo kim loại sắc nhọn vì sẽ gây xước vĩnh viễn bề mặt kính ceramic.',
      createdAt: 1727100000000,
      updatedAt: 1727100000000
    },
    {
      id: 'tip_2',
      title: 'Tẩy sạch cặn canxi và ố vàng vách kính phòng tắm',
      category: 'wc',
      preparationItems: [
        'Giấm ăn hoặc chanh tươi',
        'Baking soda',
        'Gạt kính cầm tay',
        'Bình xịt'
      ],
      content: '1. Pha giấm và nước ấm theo tỉ lệ 1:1 cho vào bình xịt.\n2. Xịt đẫm lên toàn bộ các mảng vách kính bị ố vảy cá do cặn canxi bám lâu ngày.\n3. Chờ 10-15 phút để axit axetic hòa tan màng khoáng canxi.\n4. Dùng miếng bọt chà đều, xả lại bằng nước sạch của vòi sen.\n5. Dùng cây gạt kính gạt từ trên xuống dưới để kính khô ráo ngay lập tức.',
      links: [
        { title: 'Kinh nghiệm chống đọng cặn kính nhà tắm', url: 'https://example.com/clean-glass-bathroom' }
      ],
      note: 'Mẹo giữ kính luôn sạch: sau mỗi lần tắm, dùng cây gạt kính gạt hết giọt nước đọng trong vòng 30 giây.',
      createdAt: 1727100000000,
      updatedAt: 1727100000000
    },
    {
      id: 'tip_3',
      title: 'Khử mùi tanh và ẩm mốc tủ lạnh tự nhiên bằng bã cà phê',
      category: 'bep',
      preparationItems: [
        'Bã cà phê đã phơi khô (hoặc than hoạt tính)',
        'Chén nhỏ hoặc hũ thủy tinh không nắp',
        'Vỏ cam/quýt tươi (tùy chọn)'
      ],
      content: '1. Bã cà phê sau khi pha phơi thật khô ngoài nắng hoặc sấy qua chảo nóng để tránh bị ẩm mốc.\n2. Cho bã cà phê khô vào 1-2 chiếc chén nhỏ.\n3. Đặt ở ngăn mát tủ lạnh (ngăn giữa và góc sau cùng).\n4. Bã cà phê hấp thụ mùi hôi cực tốt, tạo hương thơm nhẹ dễ chịu.\n5. Thay mới sau mỗi 2-3 tuần.',
      links: [],
      note: 'Có thể cho thêm vài lát vỏ cam, bưởi để tăng thêm mùi hương tươi mát.',
      createdAt: 1727100000000,
      updatedAt: 1727100000000
    }
  ];

  class StorageService {
    constructor() {
      this._initSeed();
    }

    _safeGet(key, fallback) {
      try {
        const item = localStorage.getItem(key);
        if (item === null || item === undefined) return fallback;
        const parsed = JSON.parse(item);
        return parsed !== null && parsed !== undefined ? parsed : fallback;
      } catch (err) {
        console.warn(`[StorageService] Failed to read ${key} from localStorage, using fallback:`, err);
        // Back up corrupted raw data to recovery key before resetting fallback
        try {
          const rawItem = localStorage.getItem(key);
          if (rawItem !== null) {
            localStorage.setItem(`familyHome:recovery:${key}:${Date.now()}`, rawItem);
          }
          localStorage.setItem(key, JSON.stringify(fallback));
        } catch (backupErr) {
          console.error(`[StorageService] Failed to backup corrupt data for ${key}:`, backupErr);
        }
        return fallback;
      }
    }

    _safeSet(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error(`[StorageService] Failed to write ${key} to localStorage:`, err);
        return false;
      }
    }

    _initSeed() {
      // Seed data ONLY when key has never existed (strictly null). Never re-seed if user intentionally emptied array.
      if (localStorage.getItem(STORAGE_KEYS.DISHES) === null) {
        this._safeSet(STORAGE_KEYS.DISHES, SEED_DISHES);
      }

      if (localStorage.getItem(STORAGE_KEYS.TIPS) === null) {
        this._safeSet(STORAGE_KEYS.TIPS, SEED_TIPS);
      }

      if (localStorage.getItem(STORAGE_KEYS.MENUS) === null) {
        this._safeSet(STORAGE_KEYS.MENUS, {});
      }

      // Mark initialized metadata once. Do not reset initializedAt on subsequent loads.
      if (localStorage.getItem(STORAGE_KEYS.META) === null) {
        this._safeSet(STORAGE_KEYS.META, {
          version: '1.0.0',
          initializedAt: Date.now()
        });
      }

      // Sync dish lastUsedAt from any stored menus on init
      this.syncDishLastUsedAtFromMenus();
    }

    /**
     * Recalculate and synchronize lastUsedAt for all dishes based on stored menus.
     * Menu history is the single source of truth for eaten dishes.
     * Only days with isEaten === true are counted.
     */
    syncDishLastUsedAtFromMenus() {
      const rawDishes = this._safeGet(STORAGE_KEYS.DISHES, []);
      if (!Array.isArray(rawDishes) || rawDishes.length === 0) return [];

      const menus = this.getMenus();
      const dishLatestEaten = new Map();

      // Scan all menus and days where isEaten === true
      Object.values(menus).forEach(menu => {
        if (!menu || !Array.isArray(menu.days)) return;
        menu.days.forEach(day => {
          if (day && day.isEaten && day.date) {
            // Timestamp at midnight local
            const dayTimestamp = new Date(day.date + 'T00:00:00').getTime();
            ['main', 'vegetable', 'soup', 'side'].forEach(slot => {
              const item = day[slot];
              if (item && item.id && !String(item.id).startsWith('manual_')) {
                const current = dishLatestEaten.get(item.id) || 0;
                if (dayTimestamp > current) {
                  dishLatestEaten.set(item.id, dayTimestamp);
                }
              }
            });
          }
        });
      });

      let hasChanges = false;
      const syncedDishes = rawDishes.map(d => {
        const expectedLastUsed = dishLatestEaten.has(d.id) ? dishLatestEaten.get(d.id) : null;
        if (d.lastUsedAt !== expectedLastUsed) {
          hasChanges = true;
          return { ...d, lastUsedAt: expectedLastUsed };
        }
        return d;
      });

      if (hasChanges) {
        this.saveDishes(syncedDishes);
      }
      return syncedDishes;
    }

    // --- Dishes CRUD ---
    getDishes() {
      const dishes = this._safeGet(STORAGE_KEYS.DISHES, []);
      if (!Array.isArray(dishes)) return [];

      let hasMigrated = false;
      const normalized = dishes.map(d => {
        if (!d || typeof d !== 'object') {
          hasMigrated = true;
          return {
            id: 'dish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: 'Món chưa đặt tên',
            category: 'main',
            note: '',
            enabled: true,
            lastUsedAt: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
        }

        const missingId = !d.id;
        const missingFields = 
          typeof d.name !== 'string' ||
          typeof d.category !== 'string' ||
          typeof d.note !== 'string' ||
          typeof d.enabled !== 'boolean' ||
          !d.createdAt;

        if (missingId || missingFields) {
          hasMigrated = true;
        }

        return {
          id: d.id || ('dish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
          name: typeof d.name === 'string' ? d.name : 'Món chưa đặt tên',
          category: typeof d.category === 'string' ? d.category : 'main',
          note: typeof d.note === 'string' ? d.note : '',
          enabled: typeof d.enabled === 'boolean' ? d.enabled : true,
          lastUsedAt: typeof d.lastUsedAt === 'number' ? d.lastUsedAt : null,
          createdAt: d.createdAt || Date.now(),
          updatedAt: d.updatedAt || Date.now()
        };
      });

      // Persist migration once if any field was missing
      if (hasMigrated) {
        this.saveDishes(normalized);
      }

      return normalized;
    }

    saveDishes(dishes) {
      return this._safeSet(STORAGE_KEYS.DISHES, dishes);
    }

    addDish(dishData) {
      const dishes = this.getDishes();
      const newDish = {
        id: 'dish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: (dishData.name || '').trim(),
        category: dishData.category || 'main',
        note: (dishData.note || '').trim(),
        enabled: typeof dishData.enabled === 'boolean' ? dishData.enabled : true,
        lastUsedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      dishes.unshift(newDish);
      this.saveDishes(dishes);
      return newDish;
    }

    updateDish(id, updates) {
      const dishes = this.getDishes();
      const index = dishes.findIndex(d => d.id === id);
      if (index === -1) return null;

      dishes[index] = {
        ...dishes[index],
        ...updates,
        name: updates.name !== undefined ? updates.name.trim() : dishes[index].name,
        note: updates.note !== undefined ? updates.note.trim() : dishes[index].note,
        updatedAt: Date.now()
      };
      this.saveDishes(dishes);
      return dishes[index];
    }

    deleteDish(id) {
      const dishes = this.getDishes();
      const filtered = dishes.filter(d => d.id !== id);
      this.saveDishes(filtered);
      return filtered.length !== dishes.length;
    }

    getDishById(id) {
      const dishes = this.getDishes();
      return dishes.find(d => d.id === id) || null;
    }

    // --- Menus CRUD ---
    getMenus() {
      return this._safeGet(STORAGE_KEYS.MENUS, {});
    }

    saveMenus(menus) {
      return this._safeSet(STORAGE_KEYS.MENUS, menus);
    }

    getMenuForWeek(weekId) {
      const menus = this.getMenus();
      return menus[weekId] || null;
    }

    saveMenuForWeek(weekId, weekMenu) {
      const menus = this.getMenus();
      menus[weekId] = {
        ...weekMenu,
        updatedAt: Date.now()
      };
      this.saveMenus(menus);
      return menus[weekId];
    }

    // --- Tips CRUD ---
    getTips() {
      const tips = this._safeGet(STORAGE_KEYS.TIPS, []);
      if (!Array.isArray(tips)) return [];

      let hasMigrated = false;
      const normalized = tips.map(t => {
        if (!t || typeof t !== 'object') {
          hasMigrated = true;
          return {
            id: 'tip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: 'Mẹo chưa đặt tên',
            category: 'khac',
            preparationItems: [],
            content: '',
            links: [],
            note: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
        }

        const missingId = !t.id;
        const missingFields = 
          typeof t.title !== 'string' ||
          typeof t.category !== 'string' ||
          !Array.isArray(t.preparationItems) ||
          typeof t.content !== 'string' ||
          !Array.isArray(t.links) ||
          typeof t.note !== 'string' ||
          !t.createdAt;

        if (missingId || missingFields) {
          hasMigrated = true;
        }

        return {
          id: t.id || ('tip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
          title: typeof t.title === 'string' ? t.title : 'Mẹo chưa đặt tên',
          category: typeof t.category === 'string' ? t.category : 'khac',
          preparationItems: Array.isArray(t.preparationItems) ? t.preparationItems : [],
          content: typeof t.content === 'string' ? t.content : '',
          links: Array.isArray(t.links) ? t.links : [],
          note: typeof t.note === 'string' ? t.note : '',
          createdAt: t.createdAt || Date.now(),
          updatedAt: t.updatedAt || Date.now()
        };
      });

      if (hasMigrated) {
        this.saveTips(normalized);
      }

      return normalized;
    }

    saveTips(tips) {
      return this._safeSet(STORAGE_KEYS.TIPS, tips);
    }

    addTip(tipData) {
      const tips = this.getTips();
      const newTip = {
        id: 'tip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: (tipData.title || '').trim(),
        category: tipData.category || 'khac',
        preparationItems: Array.isArray(tipData.preparationItems) ? tipData.preparationItems.filter(Boolean) : [],
        content: (tipData.content || '').trim(),
        links: Array.isArray(tipData.links) ? tipData.links.filter(l => l && l.url) : [],
        note: (tipData.note || '').trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      tips.unshift(newTip);
      this.saveTips(tips);
      return newTip;
    }

    updateTip(id, updates) {
      const tips = this.getTips();
      const index = tips.findIndex(t => t.id === id);
      if (index === -1) return null;

      tips[index] = {
        ...tips[index],
        ...updates,
        title: updates.title !== undefined ? updates.title.trim() : tips[index].title,
        preparationItems: Array.isArray(updates.preparationItems) ? updates.preparationItems.filter(Boolean) : tips[index].preparationItems,
        content: updates.content !== undefined ? updates.content.trim() : tips[index].content,
        links: Array.isArray(updates.links) ? updates.links.filter(l => l && l.url) : tips[index].links,
        note: updates.note !== undefined ? updates.note.trim() : tips[index].note,
        updatedAt: Date.now()
      };
      this.saveTips(tips);
      return tips[index];
    }

    deleteTip(id) {
      const tips = this.getTips();
      const filtered = tips.filter(t => t.id !== id);
      this.saveTips(filtered);
      return filtered.length !== tips.length;
    }

    getTipById(id) {
      const tips = this.getTips();
      return tips.find(t => t.id === id) || null;
    }
  }

  // Export singleton instance
  window.StorageManager = new StorageService();
})(window);
