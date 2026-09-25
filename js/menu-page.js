/**
 * MenuPage Controller - Weekly Menu and Daily Meal Planner (Phase 2)
 * Full 3-meal support (Sáng, Trưa, Tối), attendance display, meal-level eaten toggles,
 * "Lên thực đơn tuần sau" button, and responsive day cards.
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
  const btnGenerateNextWeek = document.getElementById('btn-generate-next-week');

  // Manual Edit Modal Elements
  const manualModal = document.getElementById('manual-dish-modal');
  const manualForm = document.getElementById('manual-dish-form');
  const manualModalTitle = document.getElementById('manual-modal-title');
  const manualSelectDish = document.getElementById('manual-dish-select');
  const manualCustomName = document.getElementById('manual-dish-custom');
  const btnCloseManual = document.getElementById('btn-close-manual');
  const btnCancelManual = document.getElementById('btn-cancel-manual');

  let currentEditingContext = null; // { dayIndex, slotKey, mealKey }
  let currentAttendanceContext = null; // { dayIndex, mealKey }

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

    if (btnGenerateNextWeek) {
      btnGenerateNextWeek.addEventListener('click', handleGenerateNextWeekClick);
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

    // If viewing current week and no menu exists yet, generate initial menu only if members are configured
    const isCurrentCalendarWeek = isCurrentWeek(mondayDate);
    const members = window.StorageManager.getMembers();
    if (!menu && isCurrentCalendarWeek && members.length > 0) {
      const allDishes = window.StorageManager.getDishes();
      const prevMonday = window.MenuGenerator.getPreviousMonday(mondayDate);
      const prevWeekMenu = window.StorageManager.getMenuForWeek(window.MenuGenerator.getWeekId(prevMonday));
      menu = window.MenuGenerator.generateWeeklyMenu(mondayDate, allDishes, null, prevWeekMenu, members);
      if (menu && menu.days && menu.days.length > 0) {
        window.StorageManager.saveMenuForWeek(weekId, menu);
      }
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
   * Render the top "Hôm nay ăn gì?" banner with 3 meals
   */
  function renderTodayHero() {
    if (!heroTodayContainer) return;

    const todayDate = new Date();
    const todayISO = window.MenuGenerator.formatDateISO(todayDate);
    const allMembers = window.StorageManager.getMembers();

    // Case 1: No members configured
    if (!allMembers || allMembers.length === 0) {
      heroTodayContainer.innerHTML = `
        <div class="today-hero-card">
          <div class="today-hero-header">
            <div class="today-badge-group">
              <span class="today-tag">Hôm nay</span>
              <span class="today-date-text">${window.MenuGenerator.formatDateVN(todayDate)}</span>
            </div>
            <a href="members.html" class="btn btn-primary btn-sm">
              <i data-lucide="user-plus"></i> Thiết lập thành viên
            </a>
          </div>
          <p style="color: var(--muted-foreground); font-size: 0.92rem; margin-top: 6px;">
            Gia đình chưa thiết lập danh sách thành viên. Vui lòng thiết lập thành viên và lịch ăn trước khi lên thực đơn.
          </p>
        </div>
      `;
      window.AppUtils.initIcons();
      return;
    }

    // Look for today's entry in currently displayed menu
    let todayDay = null;
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

    const currentHour = todayDate.getHours();
    // Highlight meal based on time of day
    let activeMeal = 'dinner';
    if (currentHour < 10) activeMeal = 'breakfast';
    else if (currentHour < 14) activeMeal = 'lunch';

    const meals = todayDay.meals || {
      breakfast: { single: null, attendance: { memberIds: [] }, isEaten: false },
      lunch: { main: null, vegetable: null, soup: null, side: null, attendance: { memberIds: [] }, isEaten: false },
      dinner: { main: todayDay.main, vegetable: todayDay.vegetable, soup: todayDay.soup, side: todayDay.side, attendance: todayDay.attendance?.dinner || { memberIds: [] }, isEaten: todayDay.isEaten }
    };

    // Centralized meal state representation for Hero
    const getHeroMealInfo = (mealObj, mealKey) => {
      const state = window.AppUtils.getMealDisplayState(mealObj, allMembers);
      let attendeesHtml = '';
      let dishHtml = '';
      let canToggle = false;

      switch (state) {
        case window.AppUtils.MEAL_DISPLAY_STATES.NO_MEMBERS_CONFIGURED:
          attendeesHtml = `<span class="meal-no-members-tag"><i data-lucide="user-x"></i> Chưa thiết lập thành viên</span>`;
          dishHtml = `<span class="dish-slot-empty">Chưa thiết lập thành viên</span>`;
          break;

        case window.AppUtils.MEAL_DISPLAY_STATES.NOT_EATING_AT_HOME:
          attendeesHtml = `<span class="meal-no-attendance-tag"><i data-lucide="home"></i> Không ăn tại nhà</span>`;
          dishHtml = `<span class="dish-slot-empty">Không ăn tại nhà</span>`;
          break;

        case window.AppUtils.MEAL_DISPLAY_STATES.UNKNOWN_LEGACY_ATTENDANCE:
          attendeesHtml = `<span class="meal-legacy-att-tag"><i data-lucide="help-circle"></i> Chưa có dữ liệu người ăn</span>`;
          dishHtml = formatHeroDishesText(mealObj, mealKey);
          canToggle = true;
          break;

        case window.AppUtils.MEAL_DISPLAY_STATES.HAS_ATTENDEES:
        default:
          const ids = mealObj?.attendance?.memberIds || [];
          const names = ids.map(id => {
            const m = allMembers.find(mem => mem.id === id);
            return m ? m.name : 'Thành viên cũ';
          }).join(' · ');
          attendeesHtml = `<i data-lucide="users"></i> <span>${window.AppUtils.escapeHtml(names)}</span>`;
          dishHtml = formatHeroDishesText(mealObj, mealKey);
          canToggle = true;
          break;
      }

      return { state, attendeesHtml, dishHtml, canToggle };
    };

    const formatHeroDishesText = (mealObj, mealKey) => {
      if (mealKey === 'breakfast') {
        return mealObj?.single ? window.AppUtils.escapeHtml(mealObj.single.name) : '<span class="dish-slot-empty">Chưa có món</span>';
      }
      const list = [];
      if (mealObj?.main) list.push(mealObj.main.name);
      if (mealObj?.vegetable) list.push(mealObj.vegetable.name);
      if (mealObj?.soup) list.push(mealObj.soup.name);
      if (mealObj?.side) list.push(mealObj.side.name);
      return list.length > 0 ? window.AppUtils.escapeHtml(list.join(' · ')) : '<span class="dish-slot-empty">Chưa có món</span>';
    };

    const bInfo = getHeroMealInfo(meals.breakfast, 'breakfast');
    const lInfo = getHeroMealInfo(meals.lunch, 'lunch');
    const dInfo = getHeroMealInfo(meals.dinner, 'dinner');

    heroTodayContainer.innerHTML = `
      <div class="today-hero-card">
        <div class="today-hero-header">
          <div class="today-badge-group">
            <span class="today-tag">Hôm nay ăn gì?</span>
            <span class="today-date-text">${window.AppUtils.escapeHtml(todayDay.dayLabel)} – ${window.MenuGenerator.formatDateVN(todayDate)}</span>
          </div>
          <span style="font-size: 0.8rem; color: var(--muted-foreground);">3 bữa trong ngày</span>
        </div>

        <div class="today-meals-trio">
          <!-- Breakfast -->
          <div class="today-meal-box ${activeMeal === 'breakfast' ? 'active-meal' : ''}">
            <div class="today-meal-box-header">
              <span class="meal-tag-pill meal-breakfast"><i data-lucide="sun"></i> Sáng</span>
              ${meals.breakfast.isEaten ? '<span class="badge badge-enabled"><i data-lucide="check"></i> Đã ăn</span>' : ''}
            </div>
            <div class="today-meal-box-food">${bInfo.dishHtml}</div>
            <div class="today-meal-box-attendees">${bInfo.attendeesHtml}</div>
            ${bInfo.canToggle ? `
              <button type="button" class="btn btn-xs ${meals.breakfast.isEaten ? 'btn-outline' : 'btn-soft'} btn-hero-toggle-meal" data-meal="breakfast" data-date="${todayISO}">
                <i data-lucide="${meals.breakfast.isEaten ? 'rotate-ccw' : 'check'}"></i>
                ${meals.breakfast.isEaten ? 'Chưa ăn' : 'Đã ăn'}
              </button>
            ` : ''}
          </div>

          <!-- Lunch -->
          <div class="today-meal-box ${activeMeal === 'lunch' ? 'active-meal' : ''}">
            <div class="today-meal-box-header">
              <span class="meal-tag-pill meal-lunch"><i data-lucide="sun-medium"></i> Trưa</span>
              ${meals.lunch.isEaten ? '<span class="badge badge-enabled"><i data-lucide="check"></i> Đã ăn</span>' : ''}
            </div>
            <div class="today-meal-box-food">${lInfo.dishHtml}</div>
            <div class="today-meal-box-attendees">${lInfo.attendeesHtml}</div>
            ${lInfo.canToggle ? `
              <button type="button" class="btn btn-xs ${meals.lunch.isEaten ? 'btn-outline' : 'btn-soft'} btn-hero-toggle-meal" data-meal="lunch" data-date="${todayISO}">
                <i data-lucide="${meals.lunch.isEaten ? 'rotate-ccw' : 'check'}"></i>
                ${meals.lunch.isEaten ? 'Chưa ăn' : 'Đã ăn'}
              </button>
            ` : ''}
          </div>

          <!-- Dinner -->
          <div class="today-meal-box ${activeMeal === 'dinner' ? 'active-meal' : ''}">
            <div class="today-meal-box-header">
              <span class="meal-tag-pill meal-dinner"><i data-lucide="moon"></i> Tối</span>
              ${meals.dinner.isEaten ? '<span class="badge badge-enabled"><i data-lucide="check"></i> Đã ăn</span>' : ''}
            </div>
            <div class="today-meal-box-food">${dInfo.dishHtml}</div>
            <div class="today-meal-box-attendees">${dInfo.attendeesHtml}</div>
            ${dInfo.canToggle ? `
              <button type="button" class="btn btn-xs ${meals.dinner.isEaten ? 'btn-outline' : 'btn-soft'} btn-hero-toggle-meal" data-meal="dinner" data-date="${todayISO}">
                <i data-lucide="${meals.dinner.isEaten ? 'rotate-ccw' : 'check'}"></i>
                ${meals.dinner.isEaten ? 'Chưa ăn' : 'Đã ăn'}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Bind hero toggles
    const heroToggles = heroTodayContainer.querySelectorAll('.btn-hero-toggle-meal');
    heroToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const mealKey = btn.dataset.meal;
        const targetDate = btn.dataset.date;
        const realMonday = window.MenuGenerator.getMonday(new Date(targetDate + 'T00:00:00'));
        const realWeekId = window.MenuGenerator.getWeekId(realMonday);
        let menuToUpdate = displayedWeekMenu;
        if (!displayedWeekMenu || displayedWeekMenu.weekId !== realWeekId) {
          menuToUpdate = window.StorageManager.getMenuForWeek(realWeekId);
        }

        if (menuToUpdate && Array.isArray(menuToUpdate.days)) {
          const idx = menuToUpdate.days.findIndex(d => d.date === targetDate);
          if (idx !== -1) {
            window.MenuGenerator.toggleEatenMeal(menuToUpdate, idx, mealKey);
            window.StorageManager.saveMenuForWeek(menuToUpdate.weekId, menuToUpdate);
            window.StorageManager.syncDishLastUsedAtFromMenus();
            loadWeek(currentMonday);
            const isNowEaten = menuToUpdate.days[idx].meals[mealKey]?.isEaten;
            window.AppUtils.showToast(isNowEaten ? `Đã đánh dấu bữa ${getMealLabelVN(mealKey).toLowerCase()} là đã ăn!` : `Đã chuyển bữa ${getMealLabelVN(mealKey).toLowerCase()} thành chưa ăn!`, 'success');
          }
        }
      });
    });

    window.AppUtils.initIcons();
  }

  /**
   * Helper to get meal Vietnamese label
   */
  function getMealLabelVN(mealKey) {
    if (mealKey === 'breakfast') return 'Sáng';
    if (mealKey === 'lunch') return 'Trưa';
    return 'Tối';
  }

  /**
   * Render the 7-day grid with 3 meals per day
   */
  function renderWeekGrid() {
    if (!weekGrid) return;

    const allMembers = window.StorageManager.getMembers();

    if (!displayedWeekMenu || !Array.isArray(displayedWeekMenu.days) || displayedWeekMenu.days.length === 0) {
      if (allMembers.length === 0) {
        weekGrid.innerHTML = `
          <div class="card" style="grid-column: 1 / -1; padding: 40px; text-align: center;">
            <div class="empty-state">
              <div class="empty-state-icon">
                <i data-lucide="users"></i>
              </div>
              <h3 class="empty-state-title">Chưa thiết lập thành viên</h3>
              <p class="empty-state-desc">
                Gia đình chưa thiết lập danh sách thành viên. Vui lòng thiết lập thành viên và lịch ăn trước khi lên thực đơn.
              </p>
              <div style="display: flex; gap: 10px; justify-content: center; margin-top: 16px;">
                <a href="members.html" class="btn btn-primary">
                  <i data-lucide="user-plus"></i> Thiết lập thành viên
                </a>
              </div>
            </div>
          </div>
        `;
        window.AppUtils.initIcons();
        return;
      }

      weekGrid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; padding: 40px; text-align: center;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i data-lucide="calendar"></i>
            </div>
            <h3 class="empty-state-title">Chưa có thực đơn cho tuần này</h3>
            <p class="empty-state-desc">
              Nhấn nút "Lên thực đơn tuần này" hoặc "Lên thực đơn tuần sau" để tự động sắp xếp bữa sáng, trưa, tối theo khẩu phần gia đình.
            </p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 16px;">
              <button type="button" class="btn btn-primary" id="btn-empty-generate">
                <i data-lucide="sparkles"></i> Lên thực đơn tuần này
              </button>
            </div>
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
    const allMembers = window.StorageManager.getMembers();

    let html = '';
    displayedWeekMenu.days.forEach((day, dayIndex) => {
      const isToday = day.date === todayISO;
      const dateParts = day.date.split('-');
      const dateFormatted = `${dateParts[2]}/${dateParts[1]}`;
      const meals = day.meals || {
        breakfast: { single: null, attendance: { memberIds: [] }, isEaten: false },
        lunch: { main: null, vegetable: null, soup: null, side: null, attendance: { memberIds: [] }, isEaten: false },
        dinner: { main: day.main, vegetable: day.vegetable, soup: day.soup, side: day.side, attendance: day.attendance?.dinner || { memberIds: [] }, isEaten: !!day.isEaten }
      };

      html += `
        <div class="day-card ${isToday ? 'is-today' : ''}" data-day-index="${dayIndex}">
          <!-- Day Header -->
          <div class="day-card-header">
            <div class="day-name-block">
              <span class="day-name">${window.AppUtils.escapeHtml(day.dayLabel)}</span>
              <span class="day-date">${dateFormatted}</span>
            </div>
            <div>
              ${isToday ? `<span class="day-status-pill today">Hôm nay</span>` : ''}
            </div>
          </div>

          <!-- 3 Meals Container -->
          <div class="day-meals-container">
            <!-- 1. BỮA SÁNG -->
            ${renderMealSection(dayIndex, 'breakfast', 'Sáng', meals.breakfast, allMembers)}

            <!-- 2. BỮA TRƯA -->
            ${renderMealSection(dayIndex, 'lunch', 'Trưa', meals.lunch, allMembers)}

            <!-- 3. BỮA TỐI -->
            ${renderMealSection(dayIndex, 'dinner', 'Tối', meals.dinner, allMembers)}
          </div>
        </div>
      `;
    });

    weekGrid.innerHTML = html;
    bindMealActionEvents();
    window.AppUtils.initIcons();
  }

  /**
   * Render one of the 3 meal sections inside a day card
   */
  function renderMealSection(dayIndex, mealKey, mealLabel, mealObj, allMembers) {
    const isEaten = !!mealObj?.isEaten;
    const isOverride = !!mealObj?.attendance?.manualOverride;
    const state = window.AppUtils.getMealDisplayState(mealObj, allMembers);

    let attendeesHtml = '';
    let foodHtml = '';
    let showEatenFooter = false;

    // Icon & class per meal
    let iconName = 'sun';
    let pillClass = 'meal-breakfast';
    if (mealKey === 'lunch') {
      iconName = 'sun-medium';
      pillClass = 'meal-lunch';
    } else if (mealKey === 'dinner') {
      iconName = 'moon';
      pillClass = 'meal-dinner';
    }

    switch (state) {
      case window.AppUtils.MEAL_DISPLAY_STATES.NO_MEMBERS_CONFIGURED:
        attendeesHtml = `
          <div class="meal-attendees-chips">
            <span class="meal-no-members-tag">
              <i data-lucide="user-x"></i> Chưa thiết lập thành viên
            </span>
            <a href="members.html" class="meal-setup-link" title="Thiết lập thành viên">
              <i data-lucide="external-link"></i> Thiết lập
            </a>
          </div>
        `;
        foodHtml = `
          <div class="meal-empty-notice">
            <span>Chưa thiết lập thành viên</span>
          </div>
        `;
        showEatenFooter = false;
        break;

      case window.AppUtils.MEAL_DISPLAY_STATES.NOT_EATING_AT_HOME:
        attendeesHtml = `<span class="meal-no-attendance-tag"><i data-lucide="home"></i> Không ăn tại nhà</span>`;
        foodHtml = `
          <div class="meal-empty-notice">
            <span>Không ăn tại nhà</span>
          </div>
        `;
        showEatenFooter = false;
        break;

      case window.AppUtils.MEAL_DISPLAY_STATES.UNKNOWN_LEGACY_ATTENDANCE:
        attendeesHtml = `<span class="meal-legacy-att-tag"><i data-lucide="help-circle"></i> Chưa có dữ liệu người ăn</span>`;
        if (mealKey === 'breakfast') {
          const dish = mealObj?.single;
          foodHtml = `
            <div class="meal-single-dish-row">
              <div class="meal-dish-name">
                ${dish && dish.name ? window.AppUtils.escapeHtml(dish.name) : '<span class="dish-slot-empty">Chưa có món</span>'}
              </div>
            </div>
          `;
        } else {
          foodHtml = `
            <div class="meal-family-slots">
              ${renderFamilyDishRow(dayIndex, mealKey, 'main', 'Món chính', mealObj?.main)}
              ${renderFamilyDishRow(dayIndex, mealKey, 'vegetable', 'Rau', mealObj?.vegetable)}
              ${renderFamilyDishRow(dayIndex, mealKey, 'soup', 'Canh', mealObj?.soup)}
              ${renderFamilyDishRow(dayIndex, mealKey, 'side', 'Món phụ', mealObj?.side, true)}
            </div>
          `;
        }
        showEatenFooter = true;
        break;

      case window.AppUtils.MEAL_DISPLAY_STATES.HAS_ATTENDEES:
      default:
        const memberIds = mealObj?.attendance?.memberIds || [];
        const names = memberIds.map(id => {
          const m = allMembers.find(mem => mem.id === id);
          return m ? window.AppUtils.escapeHtml(m.name) : 'Thành viên cũ';
        }).join(' · ');

        attendeesHtml = `
          <div class="meal-attendees-chips">
            <i data-lucide="users"></i>
            <span class="meal-attendees-text" title="${names}">Người ăn: <strong>${names}</strong></span>
            ${isOverride ? `<span class="badge-attendance-override" title="Chỉnh riêng so với lịch mặc định">Chỉnh riêng</span>` : ''}
          </div>
        `;

        if (mealKey === 'breakfast') {
          const dish = mealObj?.single;
          const isManual = !!dish?.manual;
          foodHtml = `
            <div class="meal-single-dish-row ${isManual ? 'is-manual' : ''}">
              <div class="meal-dish-name">
                ${dish && dish.name ? window.AppUtils.escapeHtml(dish.name) : '<span class="dish-slot-empty">Chưa có món</span>'}
                ${isManual ? `<i data-lucide="lock" style="width: 12px; height: 12px; color: #8B5CF6;" title="Đã khóa món"></i>` : ''}
              </div>
              <div class="meal-actions-group">
                <button type="button" class="btn btn-ghost btn-xs btn-swap-meal-slot" data-day="${dayIndex}" data-meal="breakfast" data-slot="single" title="Đổi món ăn sáng khác">
                  <i data-lucide="refresh-cw"></i> <span>Đổi</span>
                </button>
                <button type="button" class="btn btn-ghost btn-xs btn-edit-meal-slot" data-day="${dayIndex}" data-meal="breakfast" data-slot="single" title="Sửa thủ công">
                  <i data-lucide="pencil"></i> <span>Sửa</span>
                </button>
              </div>
            </div>
          `;
        } else {
          foodHtml = `
            <div class="meal-family-slots">
              ${renderFamilyDishRow(dayIndex, mealKey, 'main', 'Món chính', mealObj?.main)}
              ${renderFamilyDishRow(dayIndex, mealKey, 'vegetable', 'Rau', mealObj?.vegetable)}
              ${renderFamilyDishRow(dayIndex, mealKey, 'soup', 'Canh', mealObj?.soup)}
              ${renderFamilyDishRow(dayIndex, mealKey, 'side', 'Món phụ', mealObj?.side, true)}
            </div>
          `;
        }
        showEatenFooter = true;
        break;
    }

    return `
      <div class="meal-section meal-${mealKey} ${isEaten ? 'is-eaten' : ''}">
        <div class="meal-section-header">
          <div class="meal-header-left">
            <span class="meal-tag-pill ${pillClass}">
              <i data-lucide="${iconName}"></i> ${mealLabel}
            </span>
            ${isEaten ? `<span class="badge badge-enabled"><i data-lucide="check"></i> Đã ăn</span>` : ''}
          </div>
          <div class="meal-header-right">
            <button type="button" class="btn-edit-attendance" data-day="${dayIndex}" data-meal="${mealKey}" title="Chỉnh người ăn bữa ${mealLabel.toLowerCase()}">
              <i data-lucide="users"></i>
              <span>Chỉnh</span>
            </button>
          </div>
        </div>

        <div class="meal-attendees-bar">
          ${attendeesHtml}
        </div>

        <div class="meal-food-body">
          ${foodHtml}
        </div>

        ${showEatenFooter ? `
          <div class="meal-section-footer">
            <label class="meal-eaten-toggle">
              <input type="checkbox" class="toggle-meal-eaten-checkbox" data-day="${dayIndex}" data-meal="${mealKey}" ${isEaten ? 'checked' : ''}>
              <span>${isEaten ? 'Đã ăn xong' : 'Đánh dấu đã ăn'}</span>
            </label>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Helper to render one family dish slot row for lunch/dinner
   */
  function renderFamilyDishRow(dayIndex, mealKey, slotKey, slotLabel, dish, isOptional = false) {
    const slotCategoryInfo = window.AppUtils.DISH_CATEGORIES[slotKey] || { slotClass: 'main' };
    const hasDish = dish && dish.name;
    const isManual = dish && dish.manual;

    if (!hasDish) {
      if (isOptional) {
        return `
          <div class="family-dish-row optional-row">
            <span class="slot-type-mini ${slotCategoryInfo.slotClass}">${slotLabel}</span>
            <button type="button" class="btn btn-ghost btn-xs btn-add-side" data-day="${dayIndex}" data-meal="${mealKey}" data-slot="${slotKey}" title="Thêm món phụ">
              <i data-lucide="plus"></i> Thêm
            </button>
          </div>
        `;
      }
      return `
        <div class="family-dish-row empty-row">
          <span class="slot-type-mini ${slotCategoryInfo.slotClass}">${slotLabel}</span>
          <span class="dish-slot-empty">Chưa có món</span>
          <button type="button" class="btn btn-ghost btn-xs btn-swap-meal-slot" data-day="${dayIndex}" data-meal="${mealKey}" data-slot="${slotKey}" title="Chọn món">
            <i data-lucide="plus"></i>
          </button>
        </div>
      `;
    }

    return `
      <div class="family-dish-row ${isManual ? 'is-manual' : ''}">
        <span class="slot-type-mini ${slotCategoryInfo.slotClass}">
          ${slotLabel}
          ${isManual ? `<i data-lucide="lock" style="width: 10px; height: 10px; color: #8B5CF6;" title="Đã khóa món"></i>` : ''}
        </span>
        <span class="family-dish-name" title="${window.AppUtils.escapeHtml(dish.name)}">${window.AppUtils.escapeHtml(dish.name)}</span>
        <div class="family-dish-actions">
          <button type="button" class="slot-action-btn btn-swap-meal-slot" data-day="${dayIndex}" data-meal="${mealKey}" data-slot="${slotKey}" title="Đổi món ngẫu nhiên">
            <i data-lucide="refresh-cw"></i>
          </button>
          <button type="button" class="slot-action-btn btn-edit-meal-slot" data-day="${dayIndex}" data-meal="${mealKey}" data-slot="${slotKey}" title="Sửa / Khóa món">
            <i data-lucide="pencil"></i>
          </button>
          ${isOptional ? `
            <button type="button" class="slot-action-btn delete btn-delete-meal-slot" data-day="${dayIndex}" data-meal="${mealKey}" data-slot="${slotKey}" title="Xóa món phụ">
              <i data-lucide="trash-2"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Bind event handlers for meal buttons & toggles
   */
  function bindMealActionEvents() {
    // Eaten toggle checkboxes
    const eatenCheckboxes = weekGrid.querySelectorAll('.toggle-meal-eaten-checkbox');
    eatenCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const dayIdx = parseInt(e.target.dataset.day, 10);
        const mealKey = e.target.dataset.meal;
        window.MenuGenerator.toggleEatenMeal(displayedWeekMenu, dayIdx, mealKey);
        window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);
        window.StorageManager.syncDishLastUsedAtFromMenus();
        renderTodayHero();
        renderWeekGrid();
      });
    });

    // Swap single dish
    const swapBtns = weekGrid.querySelectorAll('.btn-swap-meal-slot');
    swapBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.day, 10);
        const mealKey = btn.dataset.meal;
        const slotKey = btn.dataset.slot;
        const allDishes = window.StorageManager.getDishes();

        const swapResult = window.MenuGenerator.swapSingleDish(displayedWeekMenu, dayIdx, slotKey, allDishes, mealKey);
        if (!swapResult || !swapResult.changed) {
          window.AppUtils.showToast('Không có món khác phù hợp đang bật để đổi.', 'info');
          return;
        }

        window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);

        const targetMeal = displayedWeekMenu.days[dayIdx]?.meals?.[mealKey];
        if (targetMeal && targetMeal.isEaten) {
          window.StorageManager.syncDishLastUsedAtFromMenus();
        }

        const newDish = swapResult.newDish || (targetMeal ? targetMeal[slotKey] : null);
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
        const mealKey = btn.dataset.meal;
        const slotKey = btn.dataset.slot;
        openManualModal(dayIdx, slotKey, mealKey);
      });
    });

    // Edit manual dish
    const editBtns = weekGrid.querySelectorAll('.btn-edit-meal-slot');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.day, 10);
        const mealKey = btn.dataset.meal;
        const slotKey = btn.dataset.slot;
        openManualModal(dayIdx, slotKey, mealKey);
      });
    });

    // Delete dish from slot
    const deleteBtns = weekGrid.querySelectorAll('.btn-delete-meal-slot');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.day, 10);
        const mealKey = btn.dataset.meal;
        const slotKey = btn.dataset.slot;

        window.MenuGenerator.setManualDish(displayedWeekMenu, dayIdx, slotKey, null, mealKey);
        window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);

        const targetMeal = displayedWeekMenu.days[dayIdx]?.meals?.[mealKey];
        if (targetMeal && targetMeal.isEaten) {
          window.StorageManager.syncDishLastUsedAtFromMenus();
        }

        renderTodayHero();
        renderWeekGrid();
        window.AppUtils.showToast('Đã xóa món khỏi bữa này', 'info');
      });
    });

    // Edit attendance button on each meal
    const attendanceBtns = weekGrid.querySelectorAll('.btn-edit-attendance');
    attendanceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dayIdx = parseInt(btn.dataset.day, 10);
        const mealKey = btn.dataset.meal;
        openAttendanceModal(dayIdx, mealKey);
      });
    });
  }

  /**
   * Handle Generate Menu Button Click for Current Week
   */
  function handleGenerateMenuClick() {
    const members = window.StorageManager.getMembers();
    if (!members || members.length === 0) {
      window.AppUtils.showToast('Hãy thêm thành viên và lịch ăn trước khi lên thực đơn.', 'error');
      return;
    }

    const weekId = window.MenuGenerator.getWeekId(currentMonday);
    const existingMenu = window.StorageManager.getMenuForWeek(weekId);

    const hasAnyFood = existingMenu && existingMenu.days && existingMenu.days.some(d => {
      return d.main || d.meals?.breakfast?.single || d.meals?.lunch?.main || d.meals?.dinner?.main;
    });

    if (hasAnyFood) {
      window.AppUtils.showConfirmModal({
        title: 'Tạo lại thực đơn tuần?',
        message: 'Tuần này đã có thực đơn. Bạn có chắc muốn tạo mới không? (Lưu ý: Các bữa đã ăn hoặc món đã sửa thủ công/khóa sẽ được giữ nguyên).',
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
   * Handle Generate Menu Button Click for NEXT Week
   */
  function handleGenerateNextWeekClick() {
    const members = window.StorageManager.getMembers();
    if (!members || members.length === 0) {
      window.AppUtils.showToast('Hãy thêm thành viên và lịch ăn trước khi lên thực đơn.', 'error');
      return;
    }

    const nextMonday = window.MenuGenerator.getNextMonday(new Date());
    const nextWeekId = window.MenuGenerator.getWeekId(nextMonday);
    const existingNextMenu = window.StorageManager.getMenuForWeek(nextWeekId);

    const hasAnyFood = existingNextMenu && existingNextMenu.days && existingNextMenu.days.some(d => {
      return d.main || d.meals?.breakfast?.single || d.meals?.lunch?.main || d.meals?.dinner?.main;
    });

    if (hasAnyFood) {
      window.AppUtils.showConfirmModal({
        title: 'Tuần sau đã có thực đơn',
        message: 'Tuần sau đã có thực đơn. Bạn có muốn tạo lại các bữa chưa ăn/chưa khóa không?',
        confirmText: 'Tạo lại thực đơn tuần sau',
        confirmVariant: 'btn-primary',
        onConfirm: () => {
          generateAndSwitchToNextWeek(true);
        }
      });
    } else {
      generateAndSwitchToNextWeek(false);
    }
  }

  /**
   * Core generator call for Next Week
   */
  function generateAndSwitchToNextWeek(preserveExisting = true) {
    const members = window.StorageManager.getMembers();
    if (!members || members.length === 0) {
      window.AppUtils.showToast('Hãy thêm thành viên và lịch ăn trước khi lên thực đơn.', 'error');
      return;
    }

    const allDishes = window.StorageManager.getDishes();
    const enabledDishes = allDishes.filter(d => d.enabled);

    if (enabledDishes.length === 0) {
      window.AppUtils.showToast('Chưa có món ăn nào được bật. Vui lòng vào Danh sách món để thêm hoặc bật món!', 'error');
      return;
    }

    const nextMonday = window.MenuGenerator.getNextMonday(new Date());
    const nextWeekId = window.MenuGenerator.getWeekId(nextMonday);
    const thisMonday = window.MenuGenerator.getMonday(new Date());
    const thisWeekMenu = window.StorageManager.getMenuForWeek(window.MenuGenerator.getWeekId(thisMonday));
    const currentExisting = preserveExisting ? window.StorageManager.getMenuForWeek(nextWeekId) : null;

    const newNextMenu = window.MenuGenerator.generateWeeklyMenu(nextMonday, allDishes, currentExisting, thisWeekMenu, members);
    if (!newNextMenu || newNextMenu.generated === false) {
      window.AppUtils.showToast('Hãy thêm thành viên và lịch ăn trước khi lên thực đơn.', 'error');
      return;
    }

    window.StorageManager.saveMenuForWeek(nextWeekId, newNextMenu);
    window.StorageManager.syncDishLastUsedAtFromMenus();

    currentMonday = nextMonday;
    loadWeek(currentMonday);
    window.AppUtils.showToast('Đã lên thực đơn cho tuần sau thành công!', 'success');
  }

  /**
   * Core generator call for current week view
   */
  function generateNewMenuForCurrentWeek(preserveManual = true) {
    const members = window.StorageManager.getMembers();
    if (!members || members.length === 0) {
      window.AppUtils.showToast('Hãy thêm thành viên và lịch ăn trước khi lên thực đơn.', 'error');
      return;
    }

    const allDishes = window.StorageManager.getDishes();
    const enabledDishes = allDishes.filter(d => d.enabled);

    if (enabledDishes.length === 0) {
      window.AppUtils.showToast('Chưa có món ăn nào được bật. Vui lòng vào Danh sách món để thêm hoặc bật món!', 'error');
      return;
    }

    const prevMonday = window.MenuGenerator.getPreviousMonday(currentMonday);
    const prevWeekMenu = window.StorageManager.getMenuForWeek(window.MenuGenerator.getWeekId(prevMonday));
    const currentExisting = preserveManual ? displayedWeekMenu : null;

    const newMenu = window.MenuGenerator.generateWeeklyMenu(currentMonday, allDishes, currentExisting, prevWeekMenu, members);
    if (!newMenu || newMenu.generated === false) {
      window.AppUtils.showToast('Hãy thêm thành viên và lịch ăn trước khi lên thực đơn.', 'error');
      return;
    }

    displayedWeekMenu = newMenu;
    window.StorageManager.saveMenuForWeek(newMenu.weekId, newMenu);
    window.StorageManager.syncDishLastUsedAtFromMenus();

    renderWeekHeader();
    renderTodayHero();
    renderWeekGrid();

    window.AppUtils.showToast('Đã lên thực đơn tuần thành công!', 'success');
  }

  /**
   * Open manual edit/lock modal for a specific meal and slot
   */
  function openManualModal(dayIndex, slotKey, mealKey = 'dinner') {
    currentEditingContext = { dayIndex, slotKey, mealKey };
    const day = displayedWeekMenu.days[dayIndex];
    const categoryInfo = window.AppUtils.DISH_CATEGORIES[slotKey] || { label: slotKey };
    const mealLabel = getMealLabelVN(mealKey);

    manualModalTitle.textContent = `Chọn món cho ${day.dayLabel} – Bữa ${mealLabel} (${categoryInfo.label})`;

    const allDishes = window.StorageManager.getDishes();
    let suitableDishes = [];

    const hasMealType = (d, mType) => {
      if (!mType) return true;
      if (Array.isArray(d.mealTypes) && d.mealTypes.length > 0) return d.mealTypes.includes(mType);
      if (d.category === 'single') return mType === 'breakfast';
      return mType === 'lunch' || mType === 'dinner';
    };

    if (slotKey === 'single') {
      suitableDishes = allDishes.filter(d => d.enabled && hasMealType(d, 'breakfast'));
    } else {
      suitableDishes = allDishes.filter(d => d.category === slotKey && d.enabled && hasMealType(d, mealKey));
    }

    let optionsHtml = '<option value="">-- Chọn món có sẵn trong danh sách --</option>';
    suitableDishes.forEach(d => {
      optionsHtml += `<option value="${d.id}">${window.AppUtils.escapeHtml(d.name)}</option>`;
    });
    manualSelectDish.innerHTML = optionsHtml;

    // Prefill if existing
    const targetMeal = day.meals ? day.meals[mealKey] : null;
    const currentDish = (targetMeal && targetMeal[slotKey]) ? targetMeal[slotKey] : (mealKey === 'dinner' ? day[slotKey] : null);

    if (currentDish) {
      const match = suitableDishes.find(d => d.id === currentDish.id);
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

    const { dayIndex, slotKey, mealKey } = currentEditingContext;
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

    window.MenuGenerator.setManualDish(displayedWeekMenu, dayIndex, slotKey, dishObj, mealKey);
    window.StorageManager.saveMenuForWeek(displayedWeekMenu.weekId, displayedWeekMenu);

    const targetMeal = displayedWeekMenu.days[dayIndex]?.meals?.[mealKey];
    if (targetMeal && targetMeal.isEaten) {
      window.StorageManager.syncDishLastUsedAtFromMenus();
    }

    closeManualModal();
    renderTodayHero();
    renderWeekGrid();
    window.AppUtils.showToast(`Đã khóa món "${dishObj.name}" cho bữa ${getMealLabelVN(mealKey).toLowerCase()} ${displayedWeekMenu.days[dayIndex].dayLabel}!`, 'success');
  }

  /**
   * Open attendance editing modal for a specific meal
   */
  function openAttendanceModal(dayIndex, mealKey = 'dinner') {
    if (!displayedWeekMenu || !displayedWeekMenu.days || !displayedWeekMenu.days[dayIndex]) return;
    currentAttendanceContext = { dayIndex, mealKey };

    const day = displayedWeekMenu.days[dayIndex];
    const mealLabel = getMealLabelVN(mealKey);
    const modalTitle = document.getElementById('attendance-modal-title');
    const modalSubtitle = document.getElementById('attendance-modal-subtitle');
    const membersListEl = document.getElementById('attendance-modal-members-list');
    const overrideNotice = document.getElementById('attendance-override-notice');
    const attendanceModal = document.getElementById('attendance-modal');

    if (modalTitle) modalTitle.textContent = `Người ăn – ${day.dayLabel} (Bữa ${mealLabel})`;
    if (modalSubtitle) modalSubtitle.textContent = `Ngày ${window.MenuGenerator.formatDateVN(new Date(day.date + 'T00:00:00'))}`;

    const currentAttendance = day.meals?.[mealKey]?.attendance || day.attendance?.[mealKey] || { memberIds: [], manualOverride: false };
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

    // If attendees changed from 0 to >0 and meal currently has no dishes, auto-populate initial dishes
    const day = displayedWeekMenu.days[dayIndex];
    const targetMeal = day?.meals?.[mealKey];
    if (selectedIds.length > 0 && targetMeal) {
      const allDishes = window.StorageManager.getDishes();
      if (mealKey === 'breakfast' && !targetMeal.single) {
        window.MenuGenerator.swapSingleDish(displayedWeekMenu, dayIndex, 'single', allDishes, 'breakfast');
      } else if ((mealKey === 'lunch' || mealKey === 'dinner') && (!targetMeal.main && !targetMeal.vegetable && !targetMeal.soup)) {
        window.MenuGenerator.swapSingleDish(displayedWeekMenu, dayIndex, 'main', allDishes, mealKey);
        window.MenuGenerator.swapSingleDish(displayedWeekMenu, dayIndex, 'vegetable', allDishes, mealKey);
        window.MenuGenerator.swapSingleDish(displayedWeekMenu, dayIndex, 'soup', allDishes, mealKey);
      }
    }

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
