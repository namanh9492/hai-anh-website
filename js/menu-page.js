/**
 * MenuPage Controller - Weekly Menu and Daily Meal Planner
 */
(function(window) {
  'use strict';

  let currentMonday = window.MenuGenerator.getMonday(new Date());
  let displayedWeekMenu = null;

  // DOM Elements
  const heroTodayContainer = document.getElementById('today-hero-container');
  const weekGrid = document.getElementById('week-grid');
  const weekRangeText = document.getElementById('week-range-text');
  const weekBadge = document.getElementById('week-badge');
  const btnPrevWeek = document.getElementById('btn-prev-week');
  const btnThisWeek = document.getElementById('btn-this-week');
  const btnNextWeek = document.getElementById('btn-next-week');
  const btnGenerateMenu = document.getElementById('btn-generate-menu');

  // Manual Edit Modal Elements
  const manualModal = document.getElementById('manual-dish-modal');
  const manualForm = document.getElementById('manual-dish-form');
  const manualModalTitle = document.getElementById('manual-modal-title');
  const manualSelectDish = document.getElementById('manual-dish-select');
  const manualCustomName = document.getElementById('manual-dish-custom');
  const btnCloseManual = document.getElementById('btn-close-manual');
  const btnCancelManual = document.getElementById('btn-cancel-manual');

  let currentEditingContext = null; // { dayIndex, slotKey }

  /**
   * Initialize Menu Page
   */
  function init() {
    window.StorageManager.syncDishLastUsedAtFromMenus();
    loadWeek(currentMonday);
    bindEvents();
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    if (btnPrevWeek) {
      btnPrevWeek.addEventListener('click', () => {
        currentMonday = window.MenuGenerator.getPreviousMonday(currentMonday);
        loadWeek(currentMonday);
      });
    }

    if (btnNextWeek) {
      btnNextWeek.addEventListener('click', () => {
        currentMonday = window.MenuGenerator.getNextMonday(currentMonday);
        loadWeek(currentMonday);
      });
    }

    if (btnThisWeek) {
      btnThisWeek.addEventListener('click', () => {
        currentMonday = window.MenuGenerator.getMonday(new Date());
        loadWeek(currentMonday);
      });
    }

    if (btnGenerateMenu) {
      btnGenerateMenu.addEventListener('click', handleGenerateMenuClick);
    }

    // Modal controls
    if (btnCloseManual) btnCloseManual.addEventListener('click', closeManualModal);
    if (btnCancelManual) btnCancelManual.addEventListener('click', closeManualModal);
    if (manualModal) {
      manualModal.addEventListener('click', (e) => {
        if (e.target === manualModal) closeManualModal();
      });
    }
    if (manualForm) {
      manualForm.addEventListener('submit', handleManualFormSubmit);
    }
    if (manualSelectDish) {
      manualSelectDish.addEventListener('change', () => {
        if (manualSelectDish.value) {
          manualCustomName.value = '';
        }
      });
    }

    // Attendance Modal Listeners
    const btnCloseAttendance = document.getElementById('btn-close-attendance-modal');
    if (btnCloseAttendance) {
      btnCloseAttendance.addEventListener('click', closeAttendanceModal);
    }

    const btnCancelAttendance = document.getElementById('btn-cancel-attendance');
    if (btnCancelAttendance) {
      btnCancelAttendance.addEventListener('click', closeAttendanceModal);
    }

    const btnSaveAttendance = document.getElementById('btn-save-attendance');
    if (btnSaveAttendance) {
      btnSaveAttendance.addEventListener('click', handleAttendanceSave);
    }

    const btnResetAttendanceDefault = document.getElementById('btn-reset-attendance-default');
    if (btnResetAttendanceDefault) {
      btnResetAttendanceDefault.addEventListener('click', handleAttendanceResetDefault);
    }

    const attendanceModalEl = document.getElementById('attendance-modal');
    if (attendanceModalEl) {
      attendanceModalEl.addEventListener('click', (e) => {
        if (e.target === attendanceModalEl) closeAttendanceModal();
      });
    }
  }

  /**
   * Load week menu from storage or auto-create if current week has none
   */
  function loadWeek(mondayDate) {
    const weekId = window.MenuGenerator.getWeekId(mondayDate);
    let menu = window.StorageManager.getMenuForWeek(weekId);

    // If viewing current week and no menu exists yet, generate initial menu seamlessly
    const isCurrentCalendarWeek = isCurrentWeek(mondayDate);
    if (!menu && isCurrentCalendarWeek) {
      const allDishes = window.StorageManager.getDishes();
      const prevMonday = window.MenuGenerator.getPreviousMonday(mondayDate);
      const prevWeekMenu = window.StorageManager.getMenuForWeek(window.MenuGenerator.getWeekId(prevMonday));
      menu = window.MenuGenerator.generateWeeklyMenu(mondayDate, allDishes, null, prevWeekMenu);
      window.StorageManager.saveMenuForWeek(weekId, menu);
    }

    displayedWeekMenu = menu;
    renderWeekHeader();
    renderTodayHero();
    renderWeekGrid();
  }

  /**
   * Check if given date belongs to the actual current calendar week
   */
  function isCurrentWeek(mondayDate) {
    const realThisMonday = window.MenuGenerator.getMonday(new Date());
    return window.MenuGenerator.getWeekId(mondayDate) === window.MenuGenerator.getWeekId(realThisMonday);
  }

  /**
   * Render week header navigation details
   */
  function renderWeekHeader() {
    const monday = window.MenuGenerator.getMonday(currentMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const isThisWeek = isCurrentWeek(currentMonday);

    if (weekRangeText) {
      weekRangeText.textContent = `${window.MenuGenerator.formatDateShort(monday)} – ${window.MenuGenerator.formatDateVN(sunday)}`;
    }

    if (weekBadge) {
      if (isThisWeek) {
        weekBadge.textContent = 'Tuần này';
        weekBadge.className = 'week-badge';
        weekBadge.style.background = 'var(--primary-soft)';
        weekBadge.style.color = 'var(--primary)';
        weekBadge.style.fontWeight = '700';
      } else {
        const today = new Date();
        const diffWeeks = Math.round((monday - window.MenuGenerator.getMonday(today)) / (7 * 24 * 3600 * 1000));
        weekBadge.textContent = diffWeeks > 0 ? `+${diffWeeks} tuần tới` : `${diffWeeks} tuần trước`;
        weekBadge.className = 'week-badge';
        weekBadge.style.background = 'var(--muted)';
        weekBadge.style.color = 'var(--muted-foreground)';
        weekBadge.style.fontWeight = '600';
      }
    }

    if (btnThisWeek) {
      if (isThisWeek) {
        btnThisWeek.className = 'btn btn-primary btn-sm';
      } else {
        btnThisWeek.className = 'btn btn-outline btn-sm';
      }
    }
  }

  /**
   * Render the top "Hôm nay ăn gì?" banner
   */
  function renderTodayHero() {
    if (!heroTodayContainer) return;

    const todayDate = new Date();
    const todayISO = window.MenuGenerator.formatDateISO(todayDate);

    // Look for today's entry in currently displayed menu
    let todayDay = null;
    let dayLabel = '';

    if (displayedWeekMenu && Array.isArray(displayedWeekMenu.days)) {
      todayDay = displayedWeekMenu.days.find(d => d.date === todayISO);
    }

    // If today is not in this week, check the real current week menu
    if (!todayDay) {
      const realMonday = window.MenuGenerator.getMonday(todayDate);
      const realMenu = window.StorageManager.getMenuForWeek(window.MenuGenerator.getWeekId(realMonday));
      if (realMenu && Array.isArray(realMenu.days)) {
        todayDay = realMenu.days.find(d => d.date === todayISO);
      }
    }

    if (!todayDay) {
      heroTodayContainer.innerHTML = `
        <div class="today-hero-card">
          <div class="today-hero-header">
            <div class="today-badge-group">
              <span class="today-tag">Hôm nay</span>
              <span class="today-date-text">${window.MenuGenerator.formatDateVN(todayDate)}</span>
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="btn-hero-quick-gen">
              <i data-lucide="sparkles"></i> Lên thực đơn ngay
            </button>
          </div>
          <p style="color: var(--muted-foreground); font-size: 0.92rem;">
            Chưa có thực đơn cho hôm nay. Nhấn "Lên thực đơn ngay" để tự động tạo thực đơn ngon lành cho gia đình!
          </p>
        </div>
      `;

      const quickBtn = document.getElementById('btn-hero-quick-gen');
      if (quickBtn) {
        quickBtn.addEventListener('click', () => {
          currentMonday = window.MenuGenerator.getMonday(new Date());
          generateNewMenuForCurrentWeek(false);
        });
      }
      window.AppUtils.initIcons();
      return;
    }

    const mainName = todayDay.main ? window.AppUtils.escapeHtml(todayDay.main.name) : 'Chưa chọn';
    const vegName = todayDay.vegetable ? window.AppUtils.escapeHtml(todayDay.vegetable.name) : 'Chưa chọn';
    const soupName = todayDay.soup ? window.AppUtils.escapeHtml(todayDay.soup.name) : 'Chưa chọn';
    const sideName = todayDay.side ? window.AppUtils.escapeHtml(todayDay.side.name) : null;

    const eatenBadge = todayDay.isEaten 
      ? `<span class="badge badge-enabled" style="font-size: 0.8rem;"><i data-lucide="check"></i> Đã ăn xong</span>`
      : `<span class="badge" style="background: #F1F5F9; color: var(--muted-foreground); font-size: 0.8rem;">Chưa ăn</span>`;

    heroTodayContainer.innerHTML = `
      <div class="today-hero-card">
        <div class="today-hero-header">
          <div class="today-badge-group">
            <span class="today-tag">Hôm nay ăn gì?</span>
            <span class="today-date-text">${todayDay.dayLabel} – ${window.MenuGenerator.formatDateVN(todayDate)}</span>
            ${eatenBadge}
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn ${todayDay.isEaten ? 'btn-outline' : 'btn-soft'} btn-sm" id="btn-hero-toggle-eaten">
              <i data-lucide="${todayDay.isEaten ? 'rotate-ccw' : 'check'}"></i>
              ${todayDay.isEaten ? 'Đánh dấu chưa ăn' : 'Đánh dấu đã ăn'}
            </button>
          </div>
        </div>

        <div class="today-dishes-grid">
          <div class="today-dish-pill">
            <span class="today-dish-type" style="color: var(--category-main);">Món chính</span>
            <span class="today-dish-name">${mainName}</span>
          </div>
          <div class="today-dish-pill">
            <span class="today-dish-type" style="color: var(--category-veg);">Rau</span>
            <span class="today-dish-name">${vegName}</span>
          </div>
          <div class="today-dish-pill">
            <span class="today-dish-type" style="color: var(--category-soup);">Canh</span>
            <span class="today-dish-name">${soupName}</span>
          </div>
          ${sideName ? `
            <div class="today-dish-pill">
              <span class="today-dish-type" style="color: var(--category-side);">Món phụ</span>
              <span class="today-dish-name">${sideName}</span>
            </div>
          ` : ''}
        </div>

        <!-- Today Attendance Row -->
        ${renderTodayHeroAttendance(todayDay)}
      </div>
    `;

    const toggleBtn = document.getElementById('btn-hero-toggle-eaten');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const realMonday = window.MenuGenerator.getMonday(todayDate);
        const realWeekId = window.MenuGenerator.getWeekId(realMonday);
        let menuToUpdate = displayedWeekMenu;
        if (!displayedWeekMenu || displayedWeekMenu.weekId !== realWeekId) {
          menuToUpdate = window.StorageManager.getMenuForWeek(realWeekId);
        }

        if (menuToUpdate && Array.isArray(menuToUpdate.days)) {
          const idx = menuToUpdate.days.findIndex(d => d.date === todayISO);
          if (idx !== -1) {
            window.MenuGenerator.toggleEatenDay(menuToUpdate, idx);
            window.StorageManager.saveMenuForWeek(menuToUpdate.weekId, menuToUpdate);
            window.StorageManager.syncDishLastUsedAtFromMenus();
            loadWeek(currentMonday);
            window.AppUtils.showToast(menuToUpdate.days[idx].isEaten ? 'Đã đánh dấu bữa hôm nay là đã ăn!' : 'Đã chuyển thành chưa ăn!', 'success');
          }
        }
      });
    }

    window.AppUtils.initIcons();
  }

  /**
   * Render the 7-day grid
   */
  function renderWeekGrid() {
    if (!weekGrid) return;

    if (!displayedWeekMenu || !Array.isArray(displayedWeekMenu.days) || displayedWeekMenu.days.length === 0) {
      weekGrid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; padding: 40px; text-align: center;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i data-lucide="calendar"></i>
            </div>
            <h3 class="empty-state-title">Chưa có thực đơn cho tuần này</h3>
            <p class="empty-state-desc">
              Nhấn nút "Lên thực đơn tuần" bên trên để hệ thống tự động sắp xếp món ăn ngon, đa dạng và cân đối dinh dưỡng.
            </p>
            <button type="button" class="btn btn-primary" id="btn-empty-generate">
              <i data-lucide="sparkles"></i> Lên thực đơn tuần này
            </button>
          </div>
        </div>
      `;

      const genBtn = document.getElementById('btn-empty-generate');
      if (genBtn) {
        genBtn.addEventListener('click', () => generateNewMenuForCurrentWeek(false));
      }
      window.AppUtils.initIcons();
      return;
    }

    const todayISO = window.MenuGenerator.formatDateISO(new Date());

    let html = '';
    displayedWeekMenu.days.forEach((day, index) => {
      const isToday = day.date === todayISO;
      const isEaten = !!day.isEaten;
      const dateParts = day.date.split('-');
      const dateFormatted = `${dateParts[2]}/${dateParts[1]}`;

      html += `
        <div class="day-card ${isToday ? 'is-today' : ''} ${isEaten ? 'is-eaten' : ''}" data-day-index="${index}">
          <!-- Day Header -->
          <div class="day-card-header">
            <div class="day-name-block">
              <span class="day-name">${window.AppUtils.escapeHtml(day.dayLabel)}</span>
              <span class="day-date">${dateFormatted}</span>
            </div>
            <div>
              ${isToday ? `<span class="day-status-pill today">Hôm nay</span>` : ''}
              ${isEaten ? `<span class="day-status-pill eaten">Đã ăn</span>` : ''}
            </div>
          </div>

          <!-- Slots List -->
          <div class="day-slots-list">
            <!-- 1. Main Dish -->
            ${renderSlotItem(index, 'main', 'Món chính', day.main)}

            <!-- 2. Vegetable -->
            ${renderSlotItem(index, 'vegetable', 'Rau', day.vegetable)}

            <!-- 3. Soup -->
            ${renderSlotItem(index, 'soup', 'Canh', day.soup)}

            <!-- 4. Side Dish (Optional) -->
            ${renderSlotItem(index, 'side', 'Món phụ', day.side, true)}
          </div>

          <!-- Attendance Section (Dinner) -->
          ${renderDayAttendance(index, day)}

          <!-- Day Footer -->
          <div class="day-card-footer">
            <label class="eaten-toggle-label">
              <input type="checkbox" class="toggle-eaten-checkbox" data-day-index="${index}" ${isEaten ? 'checked' : ''}>
              <span>${isEaten ? 'Đã ăn' : 'Chưa ăn'}</span>
            </label>
          </div>
        </div>
      `;
    });

    weekGrid.innerHTML = html;
    bindSlotActionEvents();
    window.AppUtils.initIcons();
  }

  /**
   * Helper to render one meal slot item
   */
  function renderSlotItem(dayIndex, slotKey, slotLabel, dish, isOptional = false) {
    const slotCategoryInfo = window.AppUtils.DISH_CATEGORIES[slotKey] || { slotClass: 'main' };
    const hasDish = dish && dish.name;
    const isManual = dish && dish.manual;

    if (!hasDish) {
      if (isOptional) {
        return `
          <div class="dish-slot-item" style="border-style: dashed; background: transparent; padding: 6px 10px;">
            <div class="dish-slot-header" style="margin-bottom: 0;">
              <span class="slot-type-label ${slotCategoryInfo.slotClass}">${slotLabel}</span>
              <button type="button" class="btn btn-ghost btn-xs btn-add-side" data-day="${dayIndex}" data-slot="${slotKey}" title="Thêm món phụ">
                <i data-lucide="plus"></i> Thêm
              </button>
            </div>
          </div>
        `;
      }
      return `
        <div class="dish-slot-item" style="border-style: dashed;">
          <div class="dish-slot-header">
            <span class="slot-type-label ${slotCategoryInfo.slotClass}">${slotLabel}</span>
            <button type="button" class="slot-action-btn btn-swap-slot" data-day="${dayIndex}" data-slot="${slotKey}" title="Chọn món">
              <i data-lucide="plus"></i>
            </button>
          </div>
          <div class="dish-slot-empty">Chưa có món</div>
        </div>
      `;
    }

    return `
      <div class="dish-slot-item ${isManual ? 'is-manual' : ''}">
        <div class="dish-slot-header">
          <span class="slot-type-label ${slotCategoryInfo.slotClass}">
            ${slotLabel}
            ${isManual ? `<i data-lucide="lock" style="width: 10px; height: 10px; color: #8B5CF6;" title="Đã khóa / Sửa thủ công"></i>` : ''}
          </span>
          <div class="dish-slot-actions">
            <button type="button" class="slot-action-btn btn-swap-slot" data-day="${dayIndex}" data-slot="${slotKey}" title="Đổi món ngẫu nhiên khác">
              <i data-lucide="refresh-cw"></i>
            </button>
            <button type="button" class="slot-action-btn btn-edit-slot" data-day="${dayIndex}" data-slot="${slotKey}" title="Sửa thủ công / Khóa món">
              <i data-lucide="pencil"></i>
            </button>
            <button type="button" class="slot-action-btn delete btn-delete-slot" data-day="${dayIndex}" data-slot="${slotKey}" title="Xóa món khỏi ngày">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
        <div class="dish-slot-name">${window.AppUtils.escapeHtml(dish.name)}</div>
      </div>
    `;
  }

  /**
   * Bind events for slot buttons
   */
  function bindSlotActionEvents() {
    // Checkbox eaten toggle
    const eatenCheckboxes = weekGrid.querySelectorAll('.toggle-eaten-checkbox');
    eatenCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const dayIdx = parseInt(e.target.dataset.dayIndex, 10);
        window.MenuGenerator.toggleEatenDay(displayedWeekMenu, dayIdx);
        window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);
        window.StorageManager.syncDishLastUsedAtFromMenus();
        renderTodayHero();
        renderWeekGrid();
      });
    });

    // Swap single dish
    const swapBtns = weekGrid.querySelectorAll('.btn-swap-slot');
    swapBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.day, 10);
        const slotKey = btn.dataset.slot;
        const allDishes = window.StorageManager.getDishes();
        
        const swapResult = window.MenuGenerator.swapSingleDish(displayedWeekMenu, dayIdx, slotKey, allDishes);
        if (!swapResult || !swapResult.changed) {
          window.AppUtils.showToast('Không có món khác đang bật để đổi.', 'info');
          return;
        }

        window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);
        
        if (displayedWeekMenu.days[dayIdx].isEaten) {
          window.StorageManager.syncDishLastUsedAtFromMenus();
        }

        const newDish = swapResult.newDish || displayedWeekMenu.days[dayIdx][slotKey];
        renderTodayHero();
        renderWeekGrid();
        window.AppUtils.showToast(`Đã đổi sang: ${newDish ? newDish.name : 'Món mới'}`, 'success');
      });
    });

    // Add optional side dish
    const addSideBtns = weekGrid.querySelectorAll('.btn-add-side');
    addSideBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.day, 10);
        const slotKey = btn.dataset.slot;
        openManualModal(dayIdx, slotKey);
      });
    });

    // Edit manual dish
    const editBtns = weekGrid.querySelectorAll('.btn-edit-slot');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.day, 10);
        const slotKey = btn.dataset.slot;
        openManualModal(dayIdx, slotKey);
      });
    });

    // Delete dish from slot
    const deleteBtns = weekGrid.querySelectorAll('.btn-delete-slot');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.day, 10);
        const slotKey = btn.dataset.slot;
        
        window.MenuGenerator.setManualDish(displayedWeekMenu, dayIdx, slotKey, null);
        window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);

        if (displayedWeekMenu.days[dayIdx].isEaten) {
          window.StorageManager.syncDishLastUsedAtFromMenus();
        }

        renderTodayHero();
        renderWeekGrid();
        window.AppUtils.showToast('Đã xóa món khỏi ngày này', 'info');
      });
    });

    // Edit attendance button on each day card
    const attendanceBtns = weekGrid.querySelectorAll('.btn-edit-attendance');
    attendanceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.day, 10);
        const mealKey = btn.dataset.meal || 'dinner';
        openAttendanceModal(dayIdx, mealKey);
      });
    });
  }

  /**
   * Handle Generate Menu Button Click
   */
  function handleGenerateMenuClick() {
    const weekId = window.MenuGenerator.getWeekId(currentMonday);
    const existingMenu = window.StorageManager.getMenuForWeek(weekId);

    if (existingMenu && existingMenu.days && existingMenu.days.some(d => d.main || d.vegetable || d.soup)) {
      window.AppUtils.showConfirmModal({
        title: 'Tạo lại thực đơn tuần?',
        message: 'Tuần này đã có thực đơn. Bạn có chắc muốn tạo mới không? (Lưu ý: Các món bạn đã chỉnh sửa thủ công hoặc khóa sẽ được giữ nguyên).',
        confirmText: 'Tạo lại thực đơn',
        confirmVariant: 'btn-primary',
        onConfirm: () => {
          generateNewMenuForCurrentWeek(true);
        }
      });
    } else {
      generateNewMenuForCurrentWeek(false);
    }
  }

  /**
   * Core generator call
   */
  function generateNewMenuForCurrentWeek(preserveManual = true) {
    const allDishes = window.StorageManager.getDishes();
    const enabledDishes = allDishes.filter(d => d.enabled);

    if (enabledDishes.length === 0) {
      window.AppUtils.showToast('Chưa có món ăn nào được bật. Vui lòng vào Danh sách món để thêm hoặc bật món!', 'error');
      return;
    }

    const prevMonday = window.MenuGenerator.getPreviousMonday(currentMonday);
    const prevWeekMenu = window.StorageManager.getMenuForWeek(window.MenuGenerator.getWeekId(prevMonday));
    const currentExisting = preserveManual ? displayedWeekMenu : null;

    const newMenu = window.MenuGenerator.generateWeeklyMenu(currentMonday, allDishes, currentExisting, prevWeekMenu);
    displayedWeekMenu = newMenu;
    window.StorageManager.saveMenuForWeek(newMenu.weekId, newMenu);
    window.StorageManager.syncDishLastUsedAtFromMenus();

    renderWeekHeader();
    renderTodayHero();
    renderWeekGrid();

    window.AppUtils.showToast('Đã lên thực đơn tuần thành công!', 'success');
  }

  /**
   * Open manual edit/lock modal
   */
  function openManualModal(dayIndex, slotKey) {
    currentEditingContext = { dayIndex, slotKey };
    const day = displayedWeekMenu.days[dayIndex];
    const categoryInfo = window.AppUtils.DISH_CATEGORIES[slotKey] || { label: slotKey };

    manualModalTitle.textContent = `Chọn món cho ${day.dayLabel} (${categoryInfo.label})`;

    // Populate dropdown with dishes of this category
    const allDishes = window.StorageManager.getDishes();
    const categoryDishes = allDishes.filter(d => d.category === slotKey && d.enabled);

    let optionsHtml = '<option value="">-- Chọn món có sẵn trong danh sách --</option>';
    categoryDishes.forEach(d => {
      optionsHtml += `<option value="${d.id}">${window.AppUtils.escapeHtml(d.name)}</option>`;
    });
    manualSelectDish.innerHTML = optionsHtml;

    // Prefill if existing
    const currentDish = day[slotKey];
    if (currentDish) {
      const match = categoryDishes.find(d => d.id === currentDish.id);
      if (match) {
        manualSelectDish.value = currentDish.id;
        manualCustomName.value = '';
      } else {
        manualSelectDish.value = '';
        manualCustomName.value = currentDish.name || '';
      }
    } else {
      manualSelectDish.value = '';
      manualCustomName.value = '';
    }

    manualModal.classList.add('open');
    window.AppUtils.initIcons();
  }

  function closeManualModal() {
    manualModal.classList.remove('open');
    currentEditingContext = null;
  }

  function handleManualFormSubmit(e) {
    e.preventDefault();
    if (!currentEditingContext) return;

    const { dayIndex, slotKey } = currentEditingContext;
    const selectedDishId = manualSelectDish.value;
    const customName = manualCustomName.value.trim();

    let dishObj = null;

    if (selectedDishId) {
      const dish = window.StorageManager.getDishById(selectedDishId);
      if (dish) {
        dishObj = { id: dish.id, name: dish.name };
      }
    } else if (customName) {
      dishObj = { id: 'manual_' + Date.now(), name: customName };
    }

    if (!dishObj) {
      window.AppUtils.showToast('Vui lòng chọn món hoặc nhập tên món thủ công!', 'error');
      return;
    }

    window.MenuGenerator.setManualDish(displayedWeekMenu, dayIndex, slotKey, dishObj);
    window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);

    if (displayedWeekMenu.days[dayIndex].isEaten) {
      window.StorageManager.syncDishLastUsedAtFromMenus();
    }

    closeManualModal();
    renderTodayHero();
    renderWeekGrid();
    window.AppUtils.showToast(`Đã khóa món "${dishObj.name}" cho ${displayedWeekMenu.days[dayIndex].dayLabel}!`, 'success');
  }

  /**
   * Render Today Attendance summary in Hero Card
   */
  function renderTodayHeroAttendance(todayDay) {
    const allMembers = window.StorageManager.getMembers();
    const dinnerIds = todayDay.attendance?.dinner?.memberIds || [];
    const isOverride = !!todayDay.attendance?.dinner?.manualOverride;

    let chips = '';
    if (dinnerIds.length === 0) {
      chips = `<span class="attendance-empty-text">Chưa có người ăn tối nay</span>`;
    } else {
      chips = dinnerIds.map(id => {
        const m = allMembers.find(mem => mem.id === id);
        const name = m ? m.name : 'Thành viên cũ';
        return `<span class="attendance-chip"><i data-lucide="user"></i><span>${window.AppUtils.escapeHtml(name)}</span></span>`;
      }).join('');
    }

    return `
      <div class="today-attendance-row">
        <div class="today-attendance-label">
          <i data-lucide="users"></i>
          <span>Người ăn tối nay:</span>
          ${isOverride ? `<span class="badge-attendance-override">Chỉnh riêng</span>` : ''}
        </div>
        <div class="today-attendance-chips">
          ${chips}
        </div>
      </div>
    `;
  }

  /**
   * Render Attendance Section on Day Cards in Weekly Grid
   */
  function renderDayAttendance(dayIndex, day) {
    const allMembers = window.StorageManager.getMembers();
    const dinnerAttendance = day.attendance?.dinner || { memberIds: [], manualOverride: false };
    const memberIds = dinnerAttendance.memberIds || [];
    const isOverride = !!dinnerAttendance.manualOverride;

    let chipsHtml = '';
    if (memberIds.length === 0) {
      chipsHtml = `<span class="attendance-empty-text">Chưa có người ăn</span>`;
    } else {
      chipsHtml = memberIds.map(id => {
        const member = allMembers.find(m => m.id === id);
        const name = member ? member.name : 'Thành viên cũ';
        return `<span class="attendance-chip" title="${window.AppUtils.escapeHtml(name)}">
          <i data-lucide="user"></i>
          <span>${window.AppUtils.escapeHtml(name)}</span>
        </span>`;
      }).join('');
    }

    return `
      <div class="day-attendance-block">
        <div class="attendance-header">
          <div class="attendance-label-group">
            <span class="attendance-label">Người ăn:</span>
            ${isOverride ? `<span class="badge-attendance-override" title="Đã chỉnh riêng cho bữa này">Chỉnh riêng</span>` : ''}
          </div>
          <button type="button" class="btn-edit-attendance" data-day="${dayIndex}" data-meal="dinner" title="Chỉnh người ăn cho bữa tối">
            <i data-lucide="users"></i>
            <span>Chỉnh</span>
          </button>
        </div>
        <div class="attendance-chips-list">
          ${chipsHtml}
        </div>
      </div>
    `;
  }

  let currentAttendanceContext = null; // { dayIndex, mealKey }

  /**
   * Open attendance editing modal
   */
  function openAttendanceModal(dayIndex, mealKey = 'dinner') {
    if (!displayedWeekMenu || !displayedWeekMenu.days || !displayedWeekMenu.days[dayIndex]) return;
    currentAttendanceContext = { dayIndex, mealKey };

    const day = displayedWeekMenu.days[dayIndex];
    const mealLabel = mealKey === 'dinner' ? 'Bữa Tối' : (mealKey === 'lunch' ? 'Bữa Trưa' : 'Bữa Sáng');
    const modalTitle = document.getElementById('attendance-modal-title');
    const modalSubtitle = document.getElementById('attendance-modal-subtitle');
    const membersListEl = document.getElementById('attendance-modal-members-list');
    const overrideNotice = document.getElementById('attendance-override-notice');
    const attendanceModal = document.getElementById('attendance-modal');

    if (modalTitle) modalTitle.textContent = `Người ăn – ${day.dayLabel} (${mealLabel})`;
    if (modalSubtitle) modalSubtitle.textContent = `Ngày ${window.MenuGenerator.formatDateVN(new Date(day.date + 'T00:00:00'))}`;

    const currentAttendance = day.attendance?.[mealKey] || { memberIds: [], manualOverride: false };
    const currentMemberIds = Array.isArray(currentAttendance.memberIds) ? currentAttendance.memberIds : [];
    const isOverride = !!currentAttendance.manualOverride;

    if (overrideNotice) {
      overrideNotice.style.display = isOverride ? 'flex' : 'none';
    }

    const allMembers = window.StorageManager.getMembers();
    if (allMembers.length === 0) {
      membersListEl.innerHTML = `
        <div class="attendance-no-members">
          <p style="color: var(--muted-foreground); font-size: 0.9rem; margin-bottom: 10px;">Chưa có thành viên nào trong danh sách gia đình.</p>
          <a href="members.html" class="btn btn-outline btn-sm">
            <i data-lucide="users"></i> Đi tới trang Thành viên
          </a>
        </div>
      `;
    } else {
      membersListEl.innerHTML = allMembers.map(member => {
        const isChecked = currentMemberIds.includes(member.id);
        const age = member.birthDate ? window.AppUtils.calculateAge(member.birthDate) : null;
        const portionLabel = window.AppUtils.PORTION_SIZES[member.portionSize]?.label || 'Tiêu chuẩn';
        const metaText = [
          age !== null ? `${age} tuổi` : null,
          `Khẩu phần ${portionLabel}`
        ].filter(Boolean).join(' · ');

        return `
          <label class="attendance-member-checkbox-item">
            <input type="checkbox" class="attendance-member-checkbox" value="${member.id}" ${isChecked ? 'checked' : ''}>
            <div class="attendance-member-info">
              <span class="attendance-member-name">${window.AppUtils.escapeHtml(member.name)}</span>
              <span class="attendance-member-meta">${window.AppUtils.escapeHtml(metaText)}</span>
            </div>
          </label>
        `;
      }).join('');
    }

    if (attendanceModal) {
      attendanceModal.classList.add('open');
      window.AppUtils.initIcons();
    }
  }

  function closeAttendanceModal() {
    const attendanceModal = document.getElementById('attendance-modal');
    if (attendanceModal) attendanceModal.classList.remove('open');
    currentAttendanceContext = null;
  }

  function handleAttendanceSave() {
    if (!currentAttendanceContext || !displayedWeekMenu) return;
    const { dayIndex, mealKey } = currentAttendanceContext;
    const checkboxes = document.querySelectorAll('.attendance-member-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    window.MenuGenerator.updateMealAttendance(displayedWeekMenu, dayIndex, mealKey, selectedIds, true);
    window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);

    closeAttendanceModal();
    renderTodayHero();
    renderWeekGrid();
    window.AppUtils.showToast('Đã lưu danh sách người ăn!', 'success');
  }

  function handleAttendanceResetDefault() {
    if (!currentAttendanceContext || !displayedWeekMenu) return;
    const { dayIndex, mealKey } = currentAttendanceContext;
    const allMembers = window.StorageManager.getMembers();

    window.MenuGenerator.resetMealAttendanceToDefault(displayedWeekMenu, dayIndex, mealKey, allMembers);
    window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);

    closeAttendanceModal();
    renderTodayHero();
    renderWeekGrid();
    window.AppUtils.showToast('Đã khôi phục người ăn theo lịch mặc định!', 'info');
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', init);
})(window);
