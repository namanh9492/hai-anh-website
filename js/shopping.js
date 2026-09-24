/**
 * Shopping List Module - Family Home V1.1 Phase 2
 * Aggregates ingredients across weekly menu scaled to attending members' portion factors.
 * Handles unit normalization (kg/g, l/ml), missing recipe warnings, and persistent checks.
 */
(function(window) {
  'use strict';

  /**
   * Aggregate ingredients for a given week menu, all dishes, and members.
   * Derives all quantities dynamically from current attendance and recipes.
   * Safely ignores deleted members and un-attended meals.
   * 
   * @param {Object} weekMenu 
   * @param {Array} allDishes 
   * @param {Array} members 
   * @returns {Object} { items: Array, missingDishes: Array, mealsCount: number, totalItems: number }
   */
  function aggregateWeeklyIngredients(weekMenu, allDishes = [], members = []) {
    if (!weekMenu || !Array.isArray(weekMenu.days)) {
      return { items: [], missingDishes: [], mealsCount: 0, totalItems: 0 };
    }

    const {
      calculateMealServings,
      calculateDishIngredients,
      normalizeIngredientName,
      getUnitInfo,
      formatIngredientDisplay
    } = window.AppUtils;

    // Fast lookup for dishes by ID
    const dishMap = new Map();
    if (Array.isArray(allDishes)) {
      allDishes.forEach(d => {
        if (d && d.id) dishMap.set(d.id, d);
      });
    }

    // Aggregator map: itemKey -> aggregated object
    const aggregatedMap = new Map();
    // Missing recipes map: dishId -> { id, name, days: [] }
    const missingMap = new Map();
    let attendingMealsCount = 0;

    const MEAL_LABELS = {
      breakfast: 'Sáng',
      lunch: 'Trưa',
      dinner: 'Tối'
    };

    weekMenu.days.forEach(day => {
      if (!day) return;
      const dayLabel = day.dayLabel || day.date;
      const meals = day.meals;

      ['breakfast', 'lunch', 'dinner'].forEach(mealKey => {
        let mealObj = null;
        let mealAttendance = null;

        if (meals && meals[mealKey]) {
          mealObj = meals[mealKey];
          mealAttendance = mealObj.attendance;
        } else if (mealKey === 'dinner') {
          // Fallback to top-level legacy day
          mealObj = day;
          mealAttendance = day.attendance?.dinner || day.attendance;
        }

        if (!mealObj) return;

        const memberIds = Array.isArray(mealAttendance?.memberIds) ? mealAttendance.memberIds.filter(Boolean) : [];
        // Only count meals where at least 1 person is eating
        if (memberIds.length === 0) return;

        attendingMealsCount++;
        const totalServings = calculateMealServings(memberIds, members);
        if (totalServings <= 0) return;

        // Collect dishes in this meal
        const mealDishes = [];
        if (mealObj.single && mealObj.single.id) {
          mealDishes.push(mealObj.single);
        }
        ['main', 'vegetable', 'soup', 'side'].forEach(slot => {
          if (mealObj[slot] && mealObj[slot].id) {
            mealDishes.push(mealObj[slot]);
          }
        });

        mealDishes.forEach(dishRef => {
          const fullDish = dishMap.get(dishRef.id) || dishRef;
          const baseServings = typeof fullDish.baseServings === 'number' && fullDish.baseServings > 0 ? fullDish.baseServings : 0;
          const hasIngredients = Array.isArray(fullDish.ingredients) && fullDish.ingredients.length > 0 && baseServings > 0;

          if (!hasIngredients) {
            // Add to missing recipe warnings
            if (!missingMap.has(fullDish.id || fullDish.name)) {
              missingMap.set(fullDish.id || fullDish.name, {
                id: fullDish.id,
                name: fullDish.name || 'Món chưa đặt tên',
                occurrences: [`${dayLabel} (${MEAL_LABELS[mealKey] || mealKey})`]
              });
            } else {
              missingMap.get(fullDish.id || fullDish.name).occurrences.push(`${dayLabel} (${MEAL_LABELS[mealKey] || mealKey})`);
            }
            return;
          }

          // Calculate scaled ingredients for this dish
          const scaledIngredients = calculateDishIngredients(fullDish, totalServings);
          scaledIngredients.forEach(ing => {
            const rawName = (ing.name || '').trim();
            if (!rawName) return;

            const normName = normalizeIngredientName(rawName);
            const unitInfo = getUnitInfo(ing.unit);
            const qty = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity) || 0;
            const baseQty = qty * unitInfo.factor;

            // Canonical key: normalizedName + '|' + baseUnit
            const itemKey = `${normName}|${unitInfo.baseUnit}`;

            if (aggregatedMap.has(itemKey)) {
              const existing = aggregatedMap.get(itemKey);
              existing.totalBaseQuantity += baseQty;
              existing.occurrences.push({
                dishName: fullDish.name,
                dayLabel,
                mealLabel: MEAL_LABELS[mealKey] || mealKey,
                scaledQty: qty,
                unit: ing.unit
              });
            } else {
              aggregatedMap.set(itemKey, {
                key: itemKey,
                canonicalName: normName,
                displayName: rawName, // Keep nice casing from first occurrence
                baseUnit: unitInfo.baseUnit,
                unitType: unitInfo.type,
                totalBaseQuantity: baseQty,
                occurrences: [{
                  dishName: fullDish.name,
                  dayLabel,
                  mealLabel: MEAL_LABELS[mealKey] || mealKey,
                  scaledQty: qty,
                  unit: ing.unit
                }]
              });
            }
          });
        });
      });
    });

    // Convert map to sorted array with formatted quantities
    const items = Array.from(aggregatedMap.values()).map(item => {
      const displayStr = formatIngredientDisplay(item.totalBaseQuantity, item.baseUnit);
      return {
        ...item,
        totalQuantity: item.totalBaseQuantity,
        displayQuantity: displayStr,
        displayAmount: displayStr.amount !== undefined ? displayStr.amount : item.totalBaseQuantity,
        displayUnit: displayStr.unit || item.baseUnit
      };
    });

    // Sort alphabetically by canonical name
    items.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, 'vi'));

    const missingDishes = Array.from(missingMap.values());

    return {
      items,
      missingDishes,
      mealsCount: attendingMealsCount,
      totalItems: items.length
    };
  }

  // --- UI Controller ---
  class ShoppingPageController {
    constructor() {
      this.currentMonday = null;
      this.weekMenu = null;
      this.allDishes = [];
      this.allMembers = [];
      this.shoppingData = { items: [], missingDishes: [], mealsCount: 0, totalItems: 0 };
    }

    init() {
      // Determine initial week from URL query or current date
      const urlParams = new URLSearchParams(window.location.search);
      const weekParam = urlParams.get('week');
      if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
        this.currentMonday = window.MenuGenerator.getMonday(weekParam);
      } else {
        this.currentMonday = window.MenuGenerator.getMonday(new Date());
      }

      this._bindEvents();
      this.loadAndRender();
    }

    _bindEvents() {
      const prevBtn = document.getElementById('btn-shopping-prev');
      const thisBtn = document.getElementById('btn-shopping-current');
      const nextBtn = document.getElementById('btn-shopping-next');
      const quickNextBtn = document.getElementById('btn-quick-next-week');
      const copyBtn = document.getElementById('btn-copy-shopping');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          this.currentMonday = window.MenuGenerator.getPreviousMonday(this.currentMonday);
          this.loadAndRender();
        });
      }

      if (thisBtn) {
        thisBtn.addEventListener('click', () => {
          this.currentMonday = window.MenuGenerator.getMonday(new Date());
          this.loadAndRender();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          this.currentMonday = window.MenuGenerator.getNextMonday(this.currentMonday);
          this.loadAndRender();
        });
      }

      if (quickNextBtn) {
        quickNextBtn.addEventListener('click', () => {
          this.currentMonday = window.MenuGenerator.getNextMonday(new Date());
          this.loadAndRender();
        });
      }

      if (copyBtn) {
        copyBtn.addEventListener('click', () => this.copyShoppingListToClipboard());
      }
    }

    loadAndRender() {
      const weekId = window.MenuGenerator.getWeekId(this.currentMonday);
      this.allDishes = window.StorageManager.getDishes();
      this.allMembers = window.StorageManager.getMembers();
      this.weekMenu = window.StorageManager.getMenuForWeek(weekId);

      this.renderWeekNavigator(weekId);

      if (!this.weekMenu) {
        this.renderEmptyState('Tuần này chưa có thực đơn.', 'Vui lòng vào trang Thực đơn và bấm "Lên thực đơn tuần" để hệ thống tính danh sách đi chợ.');
        this.updateStats(0, 0, 0);
        this.hideMissingWarning();
        return;
      }

      // Aggregate ingredients
      this.shoppingData = aggregateWeeklyIngredients(this.weekMenu, this.allDishes, this.allMembers);

      this.renderMissingWarnings(this.shoppingData.missingDishes);
      this.renderShoppingList(weekId, this.shoppingData.items);
      this.updateStatsBar(weekId, this.shoppingData);
    }

    renderWeekNavigator(weekId) {
      const weekDates = window.MenuGenerator.getWeekDates(this.currentMonday);
      const startStr = window.MenuGenerator.formatDateShort(weekDates[0]);
      const endStr = window.MenuGenerator.formatDateVN(weekDates[6]);

      const rangeEl = document.getElementById('shopping-week-range-text');
      const badgeEl = document.getElementById('shopping-week-badge');

      if (rangeEl) {
        rangeEl.textContent = `Tuần ${startStr} – ${endStr}`;
      }

      if (badgeEl) {
        const todayMonday = window.MenuGenerator.getWeekId(new Date());
        const nextMonday = window.MenuGenerator.getWeekId(window.MenuGenerator.getNextMonday(new Date()));
        const prevMonday = window.MenuGenerator.getWeekId(window.MenuGenerator.getPreviousMonday(new Date()));

        if (weekId === todayMonday) {
          badgeEl.textContent = 'Tuần này';
          badgeEl.className = 'week-badge';
        } else if (weekId === nextMonday) {
          badgeEl.textContent = 'Tuần sau';
          badgeEl.className = 'week-badge badge-next';
        } else if (weekId === prevMonday) {
          badgeEl.textContent = 'Tuần trước';
          badgeEl.className = 'week-badge badge-prev';
        } else {
          badgeEl.textContent = weekId;
          badgeEl.className = 'week-badge badge-custom';
        }
      }
    }

    updateStatsBar(weekId, data) {
      const checks = window.StorageManager.getShoppingChecks(weekId);
      let checkedCount = 0;
      data.items.forEach(item => {
        if (checks[item.key]) checkedCount++;
      });

      this.updateStats(data.totalItems, checkedCount, data.mealsCount);
    }

    updateStats(totalItems, checkedCount, mealsCount) {
      const totalEl = document.getElementById('stat-total-items');
      const checkedEl = document.getElementById('stat-checked-items');
      const mealsEl = document.getElementById('stat-meals-count');

      if (totalEl) totalEl.textContent = `${totalItems} loại`;
      if (checkedEl) checkedEl.textContent = `${checkedCount} / ${totalItems}`;
      if (mealsEl) mealsEl.textContent = `${mealsCount} bữa`;
    }

    renderMissingWarnings(missingDishes) {
      const banner = document.getElementById('missing-recipe-banner');
      const listEl = document.getElementById('missing-dish-list');
      if (!banner || !listEl) return;

      if (!Array.isArray(missingDishes) || missingDishes.length === 0) {
        this.hideMissingWarning();
        return;
      }

      listEl.innerHTML = '';
      missingDishes.forEach(dish => {
        const li = document.createElement('li');
        li.className = 'missing-dish-item';
        li.innerHTML = `
          <strong>${window.AppUtils.escapeHtml(dish.name)}</strong>
          <span class="missing-dish-occ">${window.AppUtils.escapeHtml(dish.occurrences.join(', '))}</span>
        `;
        listEl.appendChild(li);
      });

      banner.style.display = 'block';
      window.AppUtils.initIcons();
    }

    hideMissingWarning() {
      const banner = document.getElementById('missing-recipe-banner');
      if (banner) banner.style.display = 'none';
    }

    renderShoppingList(weekId, items) {
      const container = document.getElementById('shopping-items-list');
      if (!container) return;

      if (!Array.isArray(items) || items.length === 0) {
        this.renderEmptyState('Không có nguyên liệu nào cần mua.', 'Các bữa ăn trong tuần này chưa được lên món hoặc không có ai ăn tại nhà.');
        return;
      }

      const checks = window.StorageManager.getShoppingChecks(weekId);
      container.innerHTML = '';

      items.forEach((item, index) => {
        const isChecked = !!checks[item.key];
        const card = document.createElement('div');
        card.className = `shopping-item-card ${isChecked ? 'purchased' : ''}`;
        card.id = `shop-item-${index}`;

        // Summary of meals using this ingredient
        const dishSummary = item.occurrences.map(o => `${o.dishName} (${o.dayLabel})`).slice(0, 3).join(' · ');
        const extraCount = item.occurrences.length > 3 ? ` +${item.occurrences.length - 3}` : '';

        card.innerHTML = `
          <label class="shopping-item-label" for="chk-${index}">
            <input 
              type="checkbox" 
              id="chk-${index}" 
              class="shopping-checkbox" 
              data-item-key="${window.AppUtils.escapeHtml(item.key)}"
              ${isChecked ? 'checked' : ''}
            >
            <div class="shopping-item-info">
              <span class="shopping-item-name">${window.AppUtils.escapeHtml(item.displayName)}</span>
              <span class="shopping-item-dishes">${window.AppUtils.escapeHtml(dishSummary + extraCount)}</span>
            </div>
            <div class="shopping-item-quantity">
              <span class="quantity-badge">${window.AppUtils.escapeHtml(item.displayQuantity)}</span>
            </div>
          </label>
        `;

        const chk = card.querySelector('.shopping-checkbox');
        if (chk) {
          chk.addEventListener('change', (e) => {
            const nextChecked = e.target.checked;
            window.StorageManager.toggleShoppingCheck(weekId, item.key);
            card.classList.toggle('purchased', nextChecked);
            this.updateStatsBar(weekId, this.shoppingData);
          });
        }

        container.appendChild(card);
      });
    }

    renderEmptyState(title, subtitle) {
      const container = document.getElementById('shopping-items-list');
      if (!container) return;

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-box">
            <i data-lucide="shopping-bag" style="width: 32px; height: 32px; color: var(--muted-foreground);"></i>
          </div>
          <h3>${window.AppUtils.escapeHtml(title)}</h3>
          <p>${window.AppUtils.escapeHtml(subtitle)}</p>
          <div style="margin-top: 1rem;">
            <a href="index.html" class="btn btn-primary btn-sm">
              <i data-lucide="calendar"></i>
              <span>Xem trang thực đơn</span>
            </a>
          </div>
        </div>
      `;
      window.AppUtils.initIcons();
    }

    copyShoppingListToClipboard() {
      if (!this.shoppingData || !Array.isArray(this.shoppingData.items) || this.shoppingData.items.length === 0) {
        window.AppUtils.showToast('Không có nguyên liệu nào để sao chép', 'info');
        return;
      }

      const weekDates = window.MenuGenerator.getWeekDates(this.currentMonday);
      const startStr = window.MenuGenerator.formatDateShort(weekDates[0]);
      const endStr = window.MenuGenerator.formatDateVN(weekDates[6]);

      let text = `🛒 DANH SÁCH ĐI CHỢ TUẦN ${startStr} – ${endStr}\n`;
      text += `Tổng cộng: ${this.shoppingData.items.length} loại nguyên liệu\n\n`;

      this.shoppingData.items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.displayName}: ${item.displayQuantity}\n`;
      });

      if (this.shoppingData.missingDishes.length > 0) {
        text += `\n⚠ Món chưa có nguyên liệu:\n`;
        this.shoppingData.missingDishes.forEach(d => {
          text += `- ${d.name} (${d.occurrences.join(', ')})\n`;
        });
      }

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(() => {
          window.AppUtils.showToast('Đã sao chép danh sách đi chợ vào clipboard!', 'success');
        }).catch(err => {
          console.error('Failed to copy text: ', err);
          window.AppUtils.showToast('Không thể sao chép tự động', 'error');
        });
      } else {
        window.AppUtils.showToast('Trình duyệt không hỗ trợ tự động sao chép', 'info');
      }
    }
  }

  // Export
  window.ShoppingService = {
    aggregateWeeklyIngredients,
    ShoppingPageController
  };

  // Run on page load if container exists
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('shopping-items-list')) {
      const controller = new ShoppingPageController();
      controller.init();
      window._shoppingController = controller;
    }
  });

})(window);
