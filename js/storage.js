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
    MEMBERS: 'familyHome:v1:members',
    META: 'familyHome:v1:meta',
    SHOPPING_CHECKS: 'familyHome:v1:shoppingChecks'
  };

  const SEED_DISHES = [
    // Món ăn riêng (Single / Breakfast dishes)
    {
      id: 'dish_b1',
      name: 'Phở bò gia truyền',
      category: 'single',
      baseServings: 4,
      mealTypes: ['breakfast'],
      ingredients: [
        { id: 'ing_b1_1', name: 'Bánh phở', quantity: 600, unit: 'g' },
        { id: 'ing_b1_2', name: 'Thịt bò', quantity: 400, unit: 'g' },
        { id: 'ing_b1_3', name: 'Hành hoa', quantity: 50, unit: 'g' }
      ],
      note: 'Nước dùng ninh xương bò thơm quế hồi',
      enabled: true,
      createdAt: 1727100000000,
      updatedAt: 1727100000000
    },
    {
      id: 'dish_b2',
      name: 'Bún thang Hà Nội',
      category: 'single',
      baseServings: 4,
      mealTypes: ['breakfast', 'lunch'],
      ingredients: [
        { id: 'ing_b2_1', name: 'Bún tươi', quantity: 600, unit: 'g' },
        { id: 'ing_b2_2', name: 'Thịt gà', quantity: 300, unit: 'g' },
        { id: 'ing_b2_3', name: 'Trứng gà', quantity: 2, unit: 'quả' }
      ],
      note: 'Thịt gà xé phay, giò lụa thái chỉ, trứng tráng mỏng',
      enabled: true,
      createdAt: 1727100000000,
      updatedAt: 1727100000000
    },
    {
      id: 'dish_b3',
      name: 'Bánh mì pate trứng ốp la',
      category: 'single',
      baseServings: 4,
      mealTypes: ['breakfast'],
      ingredients: [
        { id: 'ing_b3_1', name: 'Bánh mì', quantity: 4, unit: 'cái' },
        { id: 'ing_b3_2', name: 'Trứng gà', quantity: 4, unit: 'quả' },
        { id: 'ing_b3_3', name: 'Dưa chuột', quantity: 2, unit: 'quả' }
      ],
      note: 'Ăn kèm dưa góp và sốt tiêu',
      enabled: true,
      createdAt: 1727100000000,
      updatedAt: 1727100000000
    },

    // Món chính (Main dishes)
    {
      id: 'dish_m1',
      name: 'Thịt rang cháy cạnh',
      category: 'main',
      baseServings: 4,
      mealTypes: ['lunch', 'dinner'],
      ingredients: [
        { id: 'ing_m1_1', name: 'Thịt ba chỉ', quantity: 500, unit: 'g' },
        { id: 'ing_m1_2', name: 'Hành hoa', quantity: 30, unit: 'g' },
        { id: 'ing_m1_3', name: 'Nước mắm', quantity: 25, unit: 'ml' }
      ],
      note: 'Thịt ba chỉ thái mỏng, rang thơm cùng hành lá',
      enabled: true,
      createdAt: 1727100000000,
      updatedAt: 1727100000000
    },
    {
      id: 'dish_m2',
      name: 'Cá kho tộ',
      category: 'main',
      baseServings: 4,
      mealTypes: ['lunch', 'dinner'],
      ingredients: [
        { id: 'ing_m2_1', name: 'Cá trắm', quantity: 800, unit: 'g' },
        { id: 'ing_m2_2', name: 'Nước mắm', quantity: 40, unit: 'ml' },
        { id: 'ing_m2_3', name: 'Hành củ', quantity: 20, unit: 'g' }
      ],
      note: 'Kho riềng và thịt ba chỉ cho đậm vị',
      enabled: true,
      createdAt: 1727100000000,
      updatedAt: 1727100000000
    },
    {
      id: 'dish_m3',
      name: 'Trứng rán thịt băm',
      category: 'main',
      baseServings: 4,
      mealTypes: ['breakfast', 'lunch', 'dinner'],
      ingredients: [
        { id: 'ing_m3_1', name: 'Trứng gà', quantity: 4, unit: 'quả' },
        { id: 'ing_m3_2', name: 'Thịt nạc vai xay', quantity: 150, unit: 'g' },
        { id: 'ing_m3_3', name: 'Hành hoa', quantity: 20, unit: 'g' }
      ],
      note: 'Thêm ít mộc nhĩ và hành hoa',
      enabled: true,
      createdAt: 1727100000000,
      updatedAt: 1727100000000
    },
    { id: 'dish_m4', name: 'Gà rang gừng', category: 'main', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_m4_1', name: 'Thịt gà', quantity: 700, unit: 'g' }, { id: 'ing_m4_2', name: 'Gừng củ', quantity: 1, unit: 'củ' }], note: 'Thịt gà ta rang săn với gừng tươi và lá chanh', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_m5', name: 'Thịt kho trứng cút', category: 'main', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_m5_1', name: 'Thịt ba chỉ', quantity: 500, unit: 'g' }, { id: 'ing_m5_2', name: 'Trứng cút', quantity: 15, unit: 'quả' }], note: 'Nước dừa thơm ngọt, nước màu caramen', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_m6', name: 'Cá rô phi rán giòn', category: 'main', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_m6_1', name: 'Cá rô phi', quantity: 800, unit: 'g' }], note: 'Chấm nước mắm tỏi ớt gừng', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_m7', name: 'Bò xào cần tỏi', category: 'main', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_m7_1', name: 'Thịt bò', quantity: 400, unit: 'g' }, { id: 'ing_m7_2', name: 'Cần tây', quantity: 1, unit: 'bó' }], note: 'Xào lửa to nhanh tay cho thịt mềm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },

    // Rau (Vegetables)
    { id: 'dish_v1', name: 'Rau muống luộc', category: 'vegetable', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_v1_1', name: 'Rau muống', quantity: 1, unit: 'bó' }], note: 'Vắt chanh dầm sấu nước luộc', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_v2', name: 'Cải thìa xào tỏi', category: 'vegetable', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_v2_1', name: 'Cải thìa', quantity: 500, unit: 'g' }, { id: 'ing_v2_2', name: 'Tỏi', quantity: 1, unit: 'củ' }], note: 'Xào giòn với tỏi phi thơm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_v3', name: 'Su su luộc chấm muối vừng', category: 'vegetable', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_v3_1', name: 'Su su', quantity: 2, unit: 'quả' }], note: 'Thái lát luộc vừa chín tới', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_v4', name: 'Rau cải ngọt luộc', category: 'vegetable', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_v4_1', name: 'Rau cải ngọt', quantity: 1, unit: 'bó' }], note: 'Chấm nước mắm trứng luộc dầm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_v5', name: 'Đậu cô ve xào lòng mề', category: 'vegetable', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_v5_1', name: 'Đậu cô ve', quantity: 400, unit: 'g' }], note: 'Xào chín tới để giữ độ ngọt giòn', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },

    // Canh (Soup)
    { id: 'dish_s1', name: 'Canh bí xanh nấu tôm', category: 'soup', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_s1_1', name: 'Bí xanh', quantity: 500, unit: 'g' }, { id: 'ing_s1_2', name: 'Tôm tươi', quantity: 150, unit: 'g' }], note: 'Bí gọt vỏ thái mỏng ngọt mát', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_s2', name: 'Canh rau cải nấu thịt băm', category: 'soup', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_s2_1', name: 'Rau cải mơ', quantity: 1, unit: 'bó' }, { id: 'ing_s2_2', name: 'Thịt băm', quantity: 100, unit: 'g' }], note: 'Thêm vài lát gừng đập dập ấm bụng', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_s3', name: 'Canh cà chua trứng đậu phụ', category: 'soup', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_s3_1', name: 'Cà chua', quantity: 3, unit: 'quả' }, { id: 'ing_s3_2', name: 'Đậu phụ', quantity: 2, unit: 'miếng' }, { id: 'ing_s3_3', name: 'Trứng gà', quantity: 1, unit: 'quả' }], note: 'Nấu nhanh, rắc nhiều hành hoa', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_s4', name: 'Canh khoai tây cà rốt sườn', category: 'soup', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_s4_1', name: 'Sườn heo', quantity: 400, unit: 'g' }, { id: 'ing_s4_2', name: 'Khoai tây', quantity: 3, unit: 'củ' }, { id: 'ing_s4_3', name: 'Cà rốt', quantity: 1, unit: 'củ' }], note: 'Hầm sườn nhừ, khoai bở mềm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_s5', name: 'Canh rau ngót nấu thịt nạc', category: 'soup', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_s5_1', name: 'Rau ngót', quantity: 1, unit: 'bó' }, { id: 'ing_s5_2', name: 'Thịt nạc', quantity: 100, unit: 'g' }], note: 'Vò nhẹ lá ngót trước khi nấu cho mềm', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },

    // Món phụ (Side dishes)
    { id: 'dish_p1', name: 'Dưa cải muối chua', category: 'side', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_p1_1', name: 'Dưa cải chua', quantity: 300, unit: 'g' }], note: 'Ăn kèm thịt kho hoặc canh chua', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_p2', name: 'Đậu phụ tẩm hành', category: 'side', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_p2_1', name: 'Đậu phụ', quantity: 3, unit: 'miếng' }, { id: 'ing_p2_2', name: 'Hành hoa', quantity: 30, unit: 'g' }], note: 'Rán vàng nhúng ngay vào mắm hành hoa', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 },
    { id: 'dish_p3', name: 'Cà pháo muối giòn', category: 'side', baseServings: 4, mealTypes: ['lunch', 'dinner'], ingredients: [{ id: 'ing_p3_1', name: 'Cà pháo', quantity: 200, unit: 'g' }], note: 'Ăn kèm rau muống luộc', enabled: true, createdAt: 1727100000000, updatedAt: 1727100000000 }
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

      // Initialize empty members array if key has never existed (strictly null). Never auto-seed fake persons.
      if (localStorage.getItem(STORAGE_KEYS.MEMBERS) === null) {
        this._safeSet(STORAGE_KEYS.MEMBERS, []);
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
     * Scans all meals (breakfast, lunch, dinner) where meal.isEaten === true.
     */
    syncDishLastUsedAtFromMenus() {
      const rawDishes = this._safeGet(STORAGE_KEYS.DISHES, []);
      if (!Array.isArray(rawDishes) || rawDishes.length === 0) return [];

      const menus = this.getMenus();
      const dishLatestEaten = new Map();

      // Scan all menus, days, and meals where isEaten === true
      Object.values(menus).forEach(menu => {
        if (!menu || !Array.isArray(menu.days)) return;
        menu.days.forEach(day => {
          if (!day || !day.date) return;
          const dayTimestamp = new Date(day.date + 'T00:00:00').getTime();

          if (day.meals && typeof day.meals === 'object') {
            ['breakfast', 'lunch', 'dinner'].forEach(mealKey => {
              const meal = day.meals[mealKey];
              if (meal && meal.isEaten) {
                // If single dish (e.g. breakfast)
                if (meal.single && meal.single.id && !String(meal.single.id).startsWith('manual_')) {
                  const current = dishLatestEaten.get(meal.single.id) || 0;
                  if (dayTimestamp > current) {
                    dishLatestEaten.set(meal.single.id, dayTimestamp);
                  }
                }
                // If family slots (lunch/dinner)
                ['main', 'vegetable', 'soup', 'side'].forEach(slot => {
                  const item = meal[slot];
                  if (item && item.id && !String(item.id).startsWith('manual_')) {
                    const current = dishLatestEaten.get(item.id) || 0;
                    if (dayTimestamp > current) {
                      dishLatestEaten.set(item.id, dayTimestamp);
                    }
                  }
                });
              }
            });
          } else if (day.isEaten) {
            // Legacy day fallback
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
            baseServings: 4,
            mealTypes: ['lunch', 'dinner'],
            ingredients: [],
            note: '',
            enabled: true,
            lastUsedAt: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
        }

        const validCategory = ['main', 'vegetable', 'soup', 'side', 'single'].includes(d.category) ? d.category : 'main';
        const missingId = !d.id;
        const missingBaseServings = typeof d.baseServings !== 'number' || d.baseServings <= 0;
        const missingMealTypes = !Array.isArray(d.mealTypes) || d.mealTypes.length === 0;
        const missingIngredients = !Array.isArray(d.ingredients);
        const missingFields = 
          typeof d.name !== 'string' ||
          typeof d.category !== 'string' ||
          typeof d.note !== 'string' ||
          typeof d.enabled !== 'boolean' ||
          !d.createdAt ||
          missingBaseServings ||
          missingMealTypes ||
          missingIngredients;

        if (missingId || missingFields) {
          hasMigrated = true;
        }

        const baseServings = (typeof d.baseServings === 'number' && d.baseServings > 0) ? Math.round(d.baseServings) : 4;
        let mealTypes = Array.isArray(d.mealTypes) ? d.mealTypes.filter(m => ['breakfast', 'lunch', 'dinner'].includes(m)) : [];
        if (mealTypes.length === 0) {
          mealTypes = validCategory === 'single' ? ['breakfast'] : ['lunch', 'dinner'];
        }

        const ingredients = Array.isArray(d.ingredients) ? d.ingredients.map(ing => ({
          id: ing.id || ('ing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
          name: typeof ing.name === 'string' ? ing.name.trim() : '',
          quantity: typeof ing.quantity === 'number' ? ing.quantity : (parseFloat(ing.quantity) || 0),
          unit: typeof ing.unit === 'string' ? ing.unit.trim() : ''
        })).filter(ing => ing.name) : [];

        let image = null;
        if (d.image && typeof d.image === 'object') {
          image = {
            assetId: d.image.assetId || null,
            provider: d.image.provider || 'wikimedia-commons',
            sourcePageUrl: d.image.sourcePageUrl || null,
            originalUrl: d.image.originalUrl || null,
            thumbnailUrl: d.image.thumbnailUrl || null,
            title: d.image.title || '',
            author: d.image.author || '',
            licenseName: d.image.licenseName || '',
            licenseUrl: d.image.licenseUrl || null,
            attributionRequired: d.image.attributionRequired !== false,
            width: typeof d.image.width === 'number' ? d.image.width : null,
            height: typeof d.image.height === 'number' ? d.image.height : null,
            savedLocally: typeof d.image.savedLocally === 'boolean' ? d.image.savedLocally : true,
            updatedAt: d.image.updatedAt || Date.now()
          };
        }

        return {
          id: d.id || ('dish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
          name: typeof d.name === 'string' ? d.name : 'Món chưa đặt tên',
          category: validCategory,
          baseServings,
          mealTypes,
          ingredients,
          note: typeof d.note === 'string' ? d.note : '',
          enabled: typeof d.enabled === 'boolean' ? d.enabled : true,
          lastUsedAt: typeof d.lastUsedAt === 'number' ? d.lastUsedAt : null,
          image,
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
      const validCategory = ['main', 'vegetable', 'soup', 'side', 'single'].includes(dishData.category) ? dishData.category : 'main';
      const baseServings = typeof dishData.baseServings === 'number' && dishData.baseServings > 0 
        ? Math.round(dishData.baseServings) 
        : (parseInt(dishData.baseServings, 10) || 4);

      let mealTypes = Array.isArray(dishData.mealTypes) ? dishData.mealTypes.filter(m => ['breakfast', 'lunch', 'dinner'].includes(m)) : [];
      if (mealTypes.length === 0) {
        mealTypes = validCategory === 'single' ? ['breakfast'] : ['lunch', 'dinner'];
      }

      const ingredients = Array.isArray(dishData.ingredients) ? dishData.ingredients.map(ing => ({
        id: ing.id || ('ing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        name: (ing.name || '').trim(),
        quantity: typeof ing.quantity === 'number' ? ing.quantity : (typeof ing.amount === 'number' ? ing.amount : (parseFloat(ing.quantity || ing.amount) || 0)),
        unit: (ing.unit || '').trim()
      })).filter(ing => ing.name) : [];

      const newDish = {
        id: dishData.id || ('dish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        name: (dishData.name || '').trim(),
        category: validCategory,
        baseServings,
        mealTypes,
        ingredients,
        note: (dishData.note || '').trim(),
        enabled: typeof dishData.enabled === 'boolean' ? dishData.enabled : true,
        lastUsedAt: typeof dishData.lastUsedAt === 'number' ? dishData.lastUsedAt : null,
        image: (dishData.image && typeof dishData.image === 'object') ? dishData.image : null,
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

      const current = dishes[index];
      const validCategory = updates.category !== undefined && ['main', 'vegetable', 'soup', 'side', 'single'].includes(updates.category) 
        ? updates.category 
        : current.category;

      let baseServings = current.baseServings;
      if (updates.baseServings !== undefined) {
        baseServings = typeof updates.baseServings === 'number' && updates.baseServings > 0 
          ? Math.round(updates.baseServings) 
          : (parseInt(updates.baseServings, 10) || 4);
      }

      let mealTypes = current.mealTypes;
      if (updates.mealTypes !== undefined && Array.isArray(updates.mealTypes)) {
        const filtered = updates.mealTypes.filter(m => ['breakfast', 'lunch', 'dinner'].includes(m));
        if (filtered.length > 0) mealTypes = filtered;
      }

      let ingredients = current.ingredients;
      if (updates.ingredients !== undefined && Array.isArray(updates.ingredients)) {
        ingredients = updates.ingredients.map(ing => ({
          id: ing.id || ('ing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
          name: (ing.name || '').trim(),
          quantity: typeof ing.quantity === 'number' ? ing.quantity : (parseFloat(ing.quantity) || 0),
          unit: (ing.unit || '').trim()
        })).filter(ing => ing.name);
      }

      dishes[index] = {
        ...current,
        ...updates,
        name: updates.name !== undefined ? updates.name.trim() : current.name,
        category: validCategory,
        baseServings,
        mealTypes,
        ingredients,
        note: updates.note !== undefined ? updates.note.trim() : current.note,
        image: updates.image !== undefined ? updates.image : (current.image || null),
        updatedAt: Date.now()
      };
      this.saveDishes(dishes);
      return dishes[index];
    }

    deleteDish(id) {
      const dishes = this.getDishes();
      const targetDish = dishes.find(d => d.id === id);
      const filtered = dishes.filter(d => d.id !== id);
      this.saveDishes(filtered);

      // Clean up associated binary image asset from IndexedDB
      if (targetDish && targetDish.image && targetDish.image.assetId) {
        if (typeof window !== 'undefined' && window.ImageStorage && typeof window.ImageStorage.deleteImageAsset === 'function') {
          window.ImageStorage.deleteImageAsset(targetDish.image.assetId).catch(() => {});
        }
      }

      return filtered.length !== dishes.length;
    }

    getDishById(id) {
      const dishes = this.getDishes();
      return dishes.find(d => d.id === id) || null;
    }

    // --- Menus CRUD ---
    _normalizeMenu(menu) {
      if (!menu || typeof menu !== 'object') return null;
      if (!Array.isArray(menu.days)) return menu;

      const normalizedDays = menu.days.map(day => {
        if (!day || typeof day !== 'object') return day;

        const oldAttendance = day.attendance || {};
        let meals = day.meals;

        if (!meals || typeof meals !== 'object') {
          // Migrate V1 legacy day to 3-meal structure
          // dinner gets legacy dishes, isEaten, and attendance
          const hasDinnerDishes = !!(day.main || day.vegetable || day.soup);
          const hasDinnerEaten = !!day.isEaten;
          const dinnerMemberIds = Array.isArray(oldAttendance.dinner?.memberIds)
            ? [...oldAttendance.dinner.memberIds]
            : (Array.isArray(oldAttendance.memberIds) ? [...oldAttendance.memberIds] : []);

          meals = {
            breakfast: {
              type: 'single',
              single: null,
              attendance: {
                memberIds: Array.isArray(oldAttendance.breakfast?.memberIds) ? [...oldAttendance.breakfast.memberIds] : [],
                manualOverride: !!oldAttendance.breakfast?.manualOverride,
                attendanceStatus: (oldAttendance.breakfast?.memberIds?.length > 0) ? 'known' : 'none'
              },
              isEaten: false
            },
            lunch: {
              type: 'family',
              main: null,
              vegetable: null,
              soup: null,
              side: null,
              attendance: {
                memberIds: Array.isArray(oldAttendance.lunch?.memberIds) ? [...oldAttendance.lunch.memberIds] : [],
                manualOverride: !!oldAttendance.lunch?.manualOverride,
                attendanceStatus: (oldAttendance.lunch?.memberIds?.length > 0) ? 'known' : 'none'
              },
              isEaten: false
            },
            dinner: {
              type: 'family',
              main: day.main || null,
              vegetable: day.vegetable || null,
              soup: day.soup || null,
              side: day.side || null,
              attendance: {
                memberIds: dinnerMemberIds,
                manualOverride: !!oldAttendance.dinner?.manualOverride,
                attendanceStatus: (dinnerMemberIds.length > 0) ? 'known' : ((hasDinnerDishes && hasDinnerEaten) ? 'unknown' : 'none')
              },
              isEaten: typeof day.isEaten === 'boolean' ? day.isEaten : false
            }
          };
        } else {
          // Normalize existing meals object - day.meals is canonical source of truth
          const normAttendance = (mealKey) => {
            const att = (meals[mealKey]?.attendance !== undefined)
              ? meals[mealKey].attendance
              : day.attendance?.[mealKey];
            const memberIds = Array.isArray(att?.memberIds) ? att.memberIds.filter(Boolean) : [];
            const hasDishes = !!(meals[mealKey]?.single || meals[mealKey]?.main || meals[mealKey]?.vegetable || meals[mealKey]?.soup || (mealKey === 'dinner' && (day.main || day.vegetable || day.soup)));
            const isEaten = !!(meals[mealKey]?.isEaten || (mealKey === 'dinner' && day.isEaten));
            let status = att?.attendanceStatus;
            if (!status) {
              if (memberIds.length > 0) status = 'known';
              else if (hasDishes && isEaten) status = 'unknown';
              else status = 'none';
            }
            return {
              memberIds: memberIds,
              manualOverride: typeof att?.manualOverride === 'boolean' ? att.manualOverride : false,
              attendanceStatus: status
            };
          };

          const isDinnerEaten = meals.dinner?.isEaten === true || day.isEaten === true;

          meals = {
            breakfast: {
              type: meals.breakfast?.type || 'single',
              single: meals.breakfast?.single || null,
              attendance: normAttendance('breakfast'),
              isEaten: typeof meals.breakfast?.isEaten === 'boolean' ? meals.breakfast.isEaten : false
            },
            lunch: {
              type: meals.lunch?.type || 'family',
              main: meals.lunch?.main || null,
              vegetable: meals.lunch?.vegetable || null,
              soup: meals.lunch?.soup || null,
              side: meals.lunch?.side || null,
              attendance: normAttendance('lunch'),
              isEaten: typeof meals.lunch?.isEaten === 'boolean' ? meals.lunch.isEaten : false
            },
            dinner: {
              type: meals.dinner?.type || 'family',
              main: meals.dinner?.main !== undefined ? meals.dinner.main : (day.main || null),
              vegetable: meals.dinner?.vegetable !== undefined ? meals.dinner.vegetable : (day.vegetable || null),
              soup: meals.dinner?.soup !== undefined ? meals.dinner.soup : (day.soup || null),
              side: meals.dinner?.side !== undefined ? meals.dinner.side : (day.side || null),
              attendance: normAttendance('dinner'),
              isEaten: isDinnerEaten
            }
          };
        }

        // Return day with both canonical 3-meal structure and derived backward-compatible dinner aliases
        return {
          ...day,
          meals: meals,
          main: meals.dinner.main,
          vegetable: meals.dinner.vegetable,
          soup: meals.dinner.soup,
          side: meals.dinner.side,
          isEaten: meals.dinner.isEaten,
          attendance: {
            breakfast: meals.breakfast.attendance,
            lunch: meals.lunch.attendance,
            dinner: meals.dinner.attendance
          }
        };
      });

      return {
        ...menu,
        days: normalizedDays
      };
    }

    getMenus() {
      const raw = this._safeGet(STORAGE_KEYS.MENUS, {});
      if (!raw || typeof raw !== 'object') return {};
      const normalized = {};
      Object.keys(raw).forEach(weekId => {
        normalized[weekId] = this._normalizeMenu(raw[weekId]);
      });
      return normalized;
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
      const normalized = this._normalizeMenu(weekMenu) || weekMenu;
      menus[weekId] = {
        ...normalized,
        updatedAt: Date.now()
      };
      this.saveMenus(menus);
      return menus[weekId];
    }

    // --- Members CRUD ---
    getMembers() {
      const raw = this._safeGet(STORAGE_KEYS.MEMBERS, []);
      if (!Array.isArray(raw)) return [];

      const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      return raw.map(m => {
        if (!m || typeof m !== 'object') return null;

        const id = m.id || ('mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
        const name = typeof m.name === 'string' ? m.name.trim() : 'Thành viên';
        const birthDate = typeof m.birthDate === 'string' ? m.birthDate.trim() : '';
        const portionSize = ['small', 'medium', 'standard', 'large'].includes(m.portionSize) ? m.portionSize : 'standard';
        const dietaryRules = Array.isArray(m.dietaryRules) ? m.dietaryRules.filter(Boolean).map(r => String(r).trim()).filter(Boolean) : [];
        const healthNotes = typeof m.healthNotes === 'string' ? m.healthNotes.trim() : '';

        // Normalize mealSchedule (Monday -> Sunday with breakfast, lunch, dinner)
        const mealSchedule = {};
        DAYS.forEach(day => {
          const daySched = m.mealSchedule?.[day];
          mealSchedule[day] = {
            breakfast: typeof daySched?.breakfast === 'boolean' ? daySched.breakfast : (day === 'saturday' || day === 'sunday'),
            lunch: typeof daySched?.lunch === 'boolean' ? daySched.lunch : (day === 'saturday' || day === 'sunday'),
            dinner: typeof daySched?.dinner === 'boolean' ? daySched.dinner : true
          };
        });

        return {
          id,
          name,
          birthDate,
          portionSize,
          dietaryRules,
          healthNotes,
          mealSchedule,
          createdAt: m.createdAt || Date.now(),
          updatedAt: m.updatedAt || Date.now()
        };
      }).filter(Boolean);
    }

    saveMembers(members) {
      return this._safeSet(STORAGE_KEYS.MEMBERS, members);
    }

    addMember(memberData) {
      const members = this.getMembers();
      const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      const mealSchedule = {};
      DAYS.forEach(day => {
        const daySched = memberData.mealSchedule?.[day];
        mealSchedule[day] = {
          breakfast: typeof daySched?.breakfast === 'boolean' ? daySched.breakfast : (day === 'saturday' || day === 'sunday'),
          lunch: typeof daySched?.lunch === 'boolean' ? daySched.lunch : (day === 'saturday' || day === 'sunday'),
          dinner: typeof daySched?.dinner === 'boolean' ? daySched.dinner : true
        };
      });

      const newMember = {
        id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: (memberData.name || '').trim(),
        birthDate: (memberData.birthDate || '').trim(),
        portionSize: ['small', 'medium', 'standard', 'large'].includes(memberData.portionSize) ? memberData.portionSize : 'standard',
        dietaryRules: Array.isArray(memberData.dietaryRules) ? memberData.dietaryRules.filter(Boolean).map(r => String(r).trim()).filter(Boolean) : [],
        healthNotes: (memberData.healthNotes || '').trim(),
        mealSchedule,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      members.push(newMember);
      this.saveMembers(members);
      return newMember;
    }

    updateMember(id, updates) {
      const members = this.getMembers();
      const index = members.findIndex(m => m.id === id);
      if (index === -1) return null;

      const current = members[index];
      const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      let mealSchedule = current.mealSchedule;
      if (updates.mealSchedule && typeof updates.mealSchedule === 'object') {
        mealSchedule = {};
        DAYS.forEach(day => {
          const daySched = updates.mealSchedule[day] || current.mealSchedule[day];
          mealSchedule[day] = {
            breakfast: typeof daySched?.breakfast === 'boolean' ? daySched.breakfast : false,
            lunch: typeof daySched?.lunch === 'boolean' ? daySched.lunch : false,
            dinner: typeof daySched?.dinner === 'boolean' ? daySched.dinner : false
          };
        });
      }

      members[index] = {
        ...current,
        name: updates.name !== undefined ? updates.name.trim() : current.name,
        birthDate: updates.birthDate !== undefined ? updates.birthDate.trim() : current.birthDate,
        portionSize: updates.portionSize !== undefined && ['small', 'medium', 'standard', 'large'].includes(updates.portionSize) ? updates.portionSize : current.portionSize,
        dietaryRules: updates.dietaryRules !== undefined && Array.isArray(updates.dietaryRules) ? updates.dietaryRules.filter(Boolean).map(r => String(r).trim()).filter(Boolean) : current.dietaryRules,
        healthNotes: updates.healthNotes !== undefined ? updates.healthNotes.trim() : current.healthNotes,
        mealSchedule,
        updatedAt: Date.now()
      };

      this.saveMembers(members);
      return members[index];
    }

    deleteMember(id) {
      const members = this.getMembers();
      const filtered = members.filter(m => m.id !== id);
      this.saveMembers(filtered);
      return filtered.length !== members.length;
    }

    getMemberById(id) {
      const members = this.getMembers();
      return members.find(m => m.id === id) || null;
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

    // --- Shopping Checks CRUD ---
    getShoppingChecks(weekId) {
      const allChecks = this._safeGet(STORAGE_KEYS.SHOPPING_CHECKS, {});
      if (!allChecks || typeof allChecks !== 'object') return {};
      return (weekId && typeof allChecks[weekId] === 'object') ? allChecks[weekId] : {};
    }

    saveShoppingChecks(weekId, checks) {
      if (!weekId) return false;
      const allChecks = this._safeGet(STORAGE_KEYS.SHOPPING_CHECKS, {});
      const safeAll = (allChecks && typeof allChecks === 'object') ? allChecks : {};
      safeAll[weekId] = checks || {};
      return this._safeSet(STORAGE_KEYS.SHOPPING_CHECKS, safeAll);
    }

    toggleShoppingCheck(weekId, itemKey) {
      if (!weekId || !itemKey) return false;
      const checks = this.getShoppingChecks(weekId);
      const nextVal = !checks[itemKey];
      checks[itemKey] = nextVal;
      this.saveShoppingChecks(weekId, checks);
      return nextVal;
    }
  }

  // Export singleton instance
  window.StorageManager = new StorageService();
})(window);
