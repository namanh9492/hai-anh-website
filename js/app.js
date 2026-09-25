/**
 * Shared App Utilities: Toast, Dialog, Sanitization, Icons, Navigation
 */
(function(window) {
  'use strict';

  // Category labels and mappings
  const DISH_CATEGORIES = {
    main: { label: 'Món chính', badgeClass: 'badge-main', slotClass: 'main' },
    vegetable: { label: 'Rau', badgeClass: 'badge-veg', slotClass: 'veg' },
    soup: { label: 'Canh', badgeClass: 'badge-soup', slotClass: 'soup' },
    side: { label: 'Món phụ', badgeClass: 'badge-side', slotClass: 'side' },
    single: { label: 'Món ăn riêng', badgeClass: 'badge-single', slotClass: 'single' }
  };

  const TIP_CATEGORIES = {
    bep: 'Bếp',
    wc: 'WC / Phòng tắm',
    'phong-ngu': 'Phòng ngủ',
    'phong-khach': 'Phòng khách',
    'quan-ao': 'Quần áo',
    'thiet-bi': 'Thiết bị',
    khac: 'Khác'
  };

  /**
   * Escape HTML to safely render dynamic text
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Toast notification
   */
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle-2';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    initIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px) scale(0.96)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 2800);
  }

  /**
   * Global confirmation modal
   */
  function showConfirmModal({ title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', confirmVariant = 'btn-danger', onConfirm }) {
    let modal = document.getElementById('global-confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'global-confirm-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 440px;">
          <div class="modal-header">
            <h3 class="modal-title" id="confirm-modal-title"></h3>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" id="confirm-modal-close" aria-label="Đóng">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="modal-body">
            <p id="confirm-modal-message" style="color: var(--muted-foreground); font-size: 0.95rem; line-height: 1.5;"></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="confirm-modal-cancel"></button>
            <button type="button" class="btn" id="confirm-modal-ok"></button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const closeBtn = document.getElementById('confirm-modal-close');

    titleEl.textContent = title || 'Xác nhận thao tác';
    msgEl.textContent = message || 'Bạn có chắc chắn muốn thực hiện hành động này?';
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    // Reset button variant
    okBtn.className = `btn ${confirmVariant}`;

    function closeModal() {
      modal.classList.remove('open');
      cleanup();
    }

    function handleOk() {
      closeModal();
      if (typeof onConfirm === 'function') onConfirm();
    }

    function cleanup() {
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', closeModal);
      closeBtn.removeEventListener('click', closeModal);
      modal.removeEventListener('click', handleBackdrop);
    }

    function handleBackdrop(e) {
      if (e.target === modal) closeModal();
    }

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', handleBackdrop);

    initIcons();
    modal.classList.add('open');
  }

  /**
   * Safely render Lucide Icons
   */
  function initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  /**
   * Initialize Topbar Mobile Drawer Navigation
   */
  function initMobileNav() {
    const toggle = document.querySelector('.mobile-nav-toggle');
    const drawer = document.querySelector('.mobile-menu-drawer');
    if (toggle && drawer) {
      toggle.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
      });
    }
  }

  /**
   * Validate external URL strictly allowing only http: and https: protocols
   */
  function validateExternalUrl(urlString) {
    if (!urlString || typeof urlString !== 'string') return false;
    const trimmed = urlString.trim();
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (err) {
      return false;
    }
  }

  /**
   * Sanitize external URL returning trimmed URL if valid or null if invalid/unsafe
   */
  function sanitizeExternalUrl(urlString) {
    return validateExternalUrl(urlString) ? urlString.trim() : null;
  }

  // Member portion sizes mapping
  const PORTION_SIZES = {
    small: { label: 'Nhỏ', value: 'small', badgeClass: 'badge-portion-small' },
    medium: { label: 'Vừa', value: 'medium', badgeClass: 'badge-portion-medium' },
    standard: { label: 'Tiêu chuẩn', value: 'standard', badgeClass: 'badge-portion-standard' },
    large: { label: 'Lớn', value: 'large', badgeClass: 'badge-portion-large' }
  };

  const DAYS_OF_WEEK = [
    { key: 'monday', label: 'Thứ Hai', dayIndex: 0 },
    { key: 'tuesday', label: 'Thứ Ba', dayIndex: 1 },
    { key: 'wednesday', label: 'Thứ Tư', dayIndex: 2 },
    { key: 'thursday', label: 'Thứ Năm', dayIndex: 3 },
    { key: 'friday', label: 'Thứ Sáu', dayIndex: 4 },
    { key: 'saturday', label: 'Thứ Bảy', dayIndex: 5 },
    { key: 'sunday', label: 'Chủ Nhật', dayIndex: 6 }
  ];

  const MEAL_TYPES = [
    { key: 'breakfast', label: 'Sáng' },
    { key: 'lunch', label: 'Trưa' },
    { key: 'dinner', label: 'Tối' }
  ];

  /**
   * Calculate age in full years from birthDate string (YYYY-MM-DD)
   * Accurately checks whether birthday has occurred yet in reference year.
   * Handles leap years and invalid dates. Does NOT save calculated age to storage.
   * 
   * @param {string} birthDateStr 'YYYY-MM-DD'
   * @param {Date} [referenceDate=new Date()]
   * @returns {number|null} Age in years, or null if invalid/empty/future
   */
  function calculateAge(birthDateStr, referenceDate = new Date()) {
    if (!birthDateStr || typeof birthDateStr !== 'string') return null;
    const trimmed = birthDateStr.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    // Validate real calendar date (e.g. rejects Feb 31)
    const birthDate = new Date(year, month - 1, day);
    if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
      return null;
    }

    const ref = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();

    let age = ref.getFullYear() - birthDate.getFullYear();
    const mDiff = ref.getMonth() - birthDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && ref.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  /**
   * Create standard default meal schedule
   * Mon-Fri: dinner only (breakfast=false, lunch=false, dinner=true)
   * Sat-Sun: all meals (breakfast=true, lunch=true, dinner=true)
   */
  function createDefaultMealSchedule() {
    const schedule = {};
    DAYS_OF_WEEK.forEach(d => {
      if (d.key === 'saturday' || d.key === 'sunday') {
        schedule[d.key] = { breakfast: true, lunch: true, dinner: true };
      } else {
        schedule[d.key] = { breakfast: false, lunch: false, dinner: true };
      }
    });
    return schedule;
  }

  // Phase 2: Portion Factors mapping (standard = 1 standard serving)
  const PORTION_FACTORS = {
    small: 0.5,
    medium: 0.75,
    standard: 1,
    large: 1.25
  };

  // Phase 2: Supported measurement units
  const SUPPORTED_UNITS = [
    // Khối lượng
    { key: 'g', label: 'g', type: 'weight', baseUnit: 'g', factor: 1 },
    { key: 'kg', label: 'kg', type: 'weight', baseUnit: 'g', factor: 1000 },
    // Thể tích
    { key: 'ml', label: 'ml', type: 'volume', baseUnit: 'ml', factor: 1 },
    { key: 'l', label: 'l', type: 'volume', baseUnit: 'ml', factor: 1000 },
    // Đếm
    { key: 'quả', label: 'quả', type: 'count', baseUnit: 'quả', factor: 1 },
    { key: 'cái', label: 'cái', type: 'count', baseUnit: 'cái', factor: 1 },
    { key: 'gói', label: 'gói', type: 'count', baseUnit: 'gói', factor: 1 },
    { key: 'hộp', label: 'hộp', type: 'count', baseUnit: 'hộp', factor: 1 },
    { key: 'bó', label: 'bó', type: 'count', baseUnit: 'bó', factor: 1 },
    { key: 'củ', label: 'củ', type: 'count', baseUnit: 'củ', factor: 1 },
    { key: 'miếng', label: 'miếng', type: 'count', baseUnit: 'miếng', factor: 1 },
    { key: 'chai', label: 'chai', type: 'count', baseUnit: 'chai', factor: 1 },
    { key: 'lon', label: 'lon', type: 'count', baseUnit: 'lon', factor: 1 },
    { key: 'thìa', label: 'thìa', type: 'count', baseUnit: 'thìa', factor: 1 },
    { key: 'muỗng', label: 'muỗng', type: 'count', baseUnit: 'muỗng', factor: 1 }
  ];

  /**
   * Normalize ingredient name: trim, lowercase, collapse multiple spaces.
   * Keeps Vietnamese diacritics.
   */
  function normalizeIngredientName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Get unit info with base unit and conversion factor
   */
  function getUnitInfo(unit) {
    if (!unit || typeof unit !== 'string') {
      return { key: '', label: '', type: 'other', baseUnit: '', factor: 1 };
    }
    const clean = unit.trim().toLowerCase();
    const found = SUPPORTED_UNITS.find(u => u.key.toLowerCase() === clean);
    if (found) return found;
    return { key: unit.trim(), label: unit.trim(), type: 'other', baseUnit: unit.trim(), factor: 1 };
  }

  /**
   * Convert quantity to base unit (kg -> g, l -> ml)
   */
  function convertToBaseUnit(quantity, unit) {
    const qty = typeof quantity === 'number' ? quantity : parseFloat(quantity) || 0;
    const unitInfo = getUnitInfo(unit);
    const converted = qty * unitInfo.factor;
    return {
      quantity: converted,
      baseQuantity: converted,
      baseUnit: unitInfo.baseUnit,
      type: unitInfo.type
    };
  }

  /**
   * Format ingredient quantity & unit for display.
   * If g >= 1000 -> displays in kg (e.g. 1500 g -> 1.5 kg)
   * If ml >= 1000 -> displays in l (e.g. 1500 ml -> 1.5 l)
   * Returns a String instance that also exposes .amount and .unit properties.
   */
  function formatIngredientDisplay(quantity, unit) {
    const qty = typeof quantity === 'number' ? quantity : parseFloat(quantity) || 0;
    const u = (unit || '').trim().toLowerCase();

    let text = `${qty} ${unit || ''}`.trim();
    let amount = qty;
    let outUnit = unit || '';

    if (u === 'g' || u === 'kg') {
      const totalG = u === 'kg' ? qty * 1000 : qty;
      if (totalG >= 1000) {
        amount = Math.round((totalG / 1000) * 100) / 100;
        outUnit = 'kg';
        text = `${amount} kg`;
      } else {
        amount = Math.round(totalG * 100) / 100;
        outUnit = 'g';
        text = `${amount} g`;
      }
    } else if (u === 'ml' || u === 'l') {
      const totalMl = u === 'l' ? qty * 1000 : qty;
      if (totalMl >= 1000) {
        amount = Math.round((totalMl / 1000) * 100) / 100;
        outUnit = 'l';
        text = `${amount} l`;
      } else {
        amount = Math.round(totalMl * 100) / 100;
        outUnit = 'ml';
        text = `${amount} ml`;
      }
    }

    const str = new String(text);
    str.amount = amount;
    str.unit = outUnit;
    return str;
  }

  /**
   * Calculate total standard servings for a meal from memberIds and members.
   * Safely ignores deleted or missing member IDs.
   */
  function calculateMealServings(memberIds, members) {
    if (!Array.isArray(memberIds) || memberIds.length === 0) return 0;
    const memberMap = new Map();
    if (Array.isArray(members)) {
      members.forEach(m => {
        if (m && m.id) memberMap.set(m.id, m);
      });
    }

    let total = 0;
    memberIds.forEach(id => {
      const mem = memberMap.get(id);
      if (mem) {
        const portionKey = mem.portionSize || 'standard';
        const factor = PORTION_FACTORS[portionKey] !== undefined ? PORTION_FACTORS[portionKey] : 1;
        total += factor;
      }
    });

    return Math.round(total * 100) / 100;
  }

  /**
   * Calculate scaled ingredient quantities for a dish.
   * scale = totalServings / dish.baseServings
   */
  function calculateDishIngredients(dish, totalServings) {
    if (!dish || typeof dish !== 'object') return [];
    const baseServings = typeof dish.baseServings === 'number' && dish.baseServings > 0 ? dish.baseServings : 0;
    if (baseServings <= 0 || !Array.isArray(dish.ingredients) || dish.ingredients.length === 0) {
      return [];
    }
    if (typeof totalServings !== 'number' || totalServings <= 0) {
      return [];
    }
    const scale = totalServings / baseServings;
    return dish.ingredients.map(ing => {
      const qty = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity) || 0;
      return {
        id: ing.id,
        name: ing.name,
        quantity: Math.round(qty * scale * 1000) / 1000,
        scaledQuantity: Math.round(qty * scale * 1000) / 1000,
        unit: ing.unit
      };
    });
  }

  // Centralized Meal Display Invariant States
  const MEAL_DISPLAY_STATES = {
    NO_MEMBERS_CONFIGURED: 'NO_MEMBERS_CONFIGURED',
    NOT_EATING_AT_HOME: 'NOT_EATING_AT_HOME',
    UNKNOWN_LEGACY_ATTENDANCE: 'UNKNOWN_LEGACY_ATTENDANCE',
    HAS_ATTENDEES: 'HAS_ATTENDEES'
  };

  /**
   * Determine the exact semantic display state of a meal.
   * Centralized invariant across Today Hero, Week Cards, Shopping, and Editor.
   * 
   * @param {Object} meal - meal object (e.g. day.meals.breakfast | lunch | dinner)
   * @param {Array} members - list of members from StorageManager.getMembers()
   * @returns {string} State from MEAL_DISPLAY_STATES
   */
  function getMealDisplayState(meal, members = []) {
    const hasDishes = !!(meal && (meal.single || meal.main || meal.vegetable || meal.soup));
    const isEaten = !!(meal && meal.isEaten);
    const memberIds = (meal && meal.attendance && Array.isArray(meal.attendance.memberIds)) ? meal.attendance.memberIds : [];
    const attendanceStatus = meal?.attendance?.attendanceStatus;

    // 1. If meal has historical dishes (migrated from V1 or marked eaten) but attendance is empty/unknown:
    if (hasDishes && (attendanceStatus === 'unknown' || (isEaten && memberIds.length === 0))) {
      return MEAL_DISPLAY_STATES.UNKNOWN_LEGACY_ATTENDANCE;
    }

    // 2. If no members are configured in the family:
    if (!Array.isArray(members) || members.length === 0) {
      return MEAL_DISPLAY_STATES.NO_MEMBERS_CONFIGURED;
    }

    // 3. If members are configured and this meal has attending member IDs:
    if (memberIds.length > 0) {
      return MEAL_DISPLAY_STATES.HAS_ATTENDEES;
    }

    // 4. If members are configured but no one is attending this meal:
    return MEAL_DISPLAY_STATES.NOT_EATING_AT_HOME;
  }

  // Export
  window.AppUtils = {
    DISH_CATEGORIES,
    TIP_CATEGORIES,
    PORTION_SIZES,
    PORTION_FACTORS,
    SUPPORTED_UNITS,
    DAYS_OF_WEEK,
    MEAL_TYPES,
    MEAL_DISPLAY_STATES,
    getMealDisplayState,
    calculateAge,
    createDefaultMealSchedule,
    calculateMealServings,
    calculateDishIngredients,
    normalizeIngredientName,
    getUnitInfo,
    convertToBaseUnit,
    formatIngredientDisplay,
    escapeHtml,
    showToast,
    showConfirmModal,
    initIcons,
    initMobileNav,
    validateExternalUrl,
    sanitizeExternalUrl
  };

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initIcons();
  });
})(window);
