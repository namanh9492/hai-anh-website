/**
 * DishesPage Controller - Family Home V1.1 Phase 2
 * CRUD dishes with recipes (baseServings, mealTypes, dynamic ingredients),
 * dual filtering by Meal type & Category, and automatic ingredient unit normalization.
 */
(function(window) {
  'use strict';

  let currentCategoryFilter = 'all';
  let currentMealFilter = 'all';
  let currentSearchQuery = '';
  let editingDishId = null;

  // DOM Elements
  const dishesTableBody = document.getElementById('dishes-table-body');
  const searchInput = document.getElementById('dish-search-input');
  const categoryFilterContainer = document.getElementById('category-filter-container');
  const mealFilterContainer = document.getElementById('meal-filter-container');
  const btnOpenAddModal = document.getElementById('btn-open-add-dish');

  // Stats
  const statTotal = document.getElementById('stat-total-dishes');
  const statMain = document.getElementById('stat-main-dishes');
  const statVeg = document.getElementById('stat-veg-dishes');
  const statSoup = document.getElementById('stat-soup-dishes');

  // Modal & Form Elements
  const dishModal = document.getElementById('dish-modal');
  const dishForm = document.getElementById('dish-form');
  const modalTitle = document.getElementById('dish-modal-title');
  const inputDishName = document.getElementById('dish-name-input');
  const selectDishCategory = document.getElementById('dish-category-select');
  const inputBaseServings = document.getElementById('dish-base-servings-input');
  const checkMealBreakfast = document.getElementById('dish-meal-breakfast');
  const checkMealLunch = document.getElementById('dish-meal-lunch');
  const checkMealDinner = document.getElementById('dish-meal-dinner');
  const ingredientRowsContainer = document.getElementById('ingredient-rows-container');
  const btnAddIngredientRow = document.getElementById('btn-add-ingredient-row');
  const inputDishNote = document.getElementById('dish-note-input');
  const checkDishEnabled = document.getElementById('dish-enabled-check');
  const btnCloseModal = document.getElementById('btn-close-dish-modal');
  const btnCancelModal = document.getElementById('btn-cancel-dish-modal');

  /**
   * Initialize Dishes Page
   */
  function init() {
    renderDishes();
    renderStats();
    bindEvents();
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        renderDishes();
      });
    }

    // Category Filter Pills
    if (categoryFilterContainer) {
      categoryFilterContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.filter-pill');
        if (!target) return;

        categoryFilterContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        target.classList.add('active');
        currentCategoryFilter = target.dataset.category || 'all';
        renderDishes();
      });
    }

    // Meal Filter Pills (Section 27)
    if (mealFilterContainer) {
      mealFilterContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.filter-pill');
        if (!target) return;

        mealFilterContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        target.classList.add('active');
        currentMealFilter = target.dataset.meal || 'all';
        renderDishes();
      });
    }

    if (btnOpenAddModal) {
      btnOpenAddModal.addEventListener('click', () => openModal(null));
    }

    if (btnAddIngredientRow) {
      btnAddIngredientRow.addEventListener('click', () => {
        addIngredientRow();
      });
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
    if (dishModal) {
      dishModal.addEventListener('click', (e) => {
        if (e.target === dishModal) closeModal();
      });
    }

    if (dishForm) {
      dishForm.addEventListener('submit', handleFormSubmit);
    }
  }

  /**
   * Render Stats summary
   */
  function renderStats() {
    const dishes = window.StorageManager.getDishes();
    const total = dishes.length;
    const mains = dishes.filter(d => d.category === 'main').length;
    const vegs = dishes.filter(d => d.category === 'vegetable').length;
    const soups = dishes.filter(d => d.category === 'soup').length;

    if (statTotal) statTotal.textContent = total;
    if (statMain) statMain.textContent = mains;
    if (statVeg) statVeg.textContent = vegs;
    if (statSoup) statSoup.textContent = soups;
  }

  /**
   * Filter and render dishes table
   */
  function renderDishes() {
    if (!dishesTableBody) return;

    let dishes = window.StorageManager.getDishes();

    // Category filter
    if (currentCategoryFilter !== 'all') {
      dishes = dishes.filter(d => d.category === currentCategoryFilter);
    }

    // Meal type filter (Section 27)
    if (currentMealFilter !== 'all') {
      dishes = dishes.filter(d => {
        if (Array.isArray(d.mealTypes)) {
          return d.mealTypes.includes(currentMealFilter);
        }
        if (d.category === 'single') return currentMealFilter === 'breakfast';
        return currentMealFilter === 'lunch' || currentMealFilter === 'dinner';
      });
    }

    // Search query filter
    if (currentSearchQuery) {
      dishes = dishes.filter(d => 
        (d.name && d.name.toLowerCase().includes(currentSearchQuery)) ||
        (d.note && d.note.toLowerCase().includes(currentSearchQuery))
      );
    }

    if (dishes.length === 0) {
      dishesTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px 20px;">
            <div class="empty-state">
              <div class="empty-state-icon">
                <i data-lucide="utensils-crossed"></i>
              </div>
              <h4 class="empty-state-title">Không tìm thấy món ăn nào</h4>
              <p class="empty-state-desc">Hãy thử đổi từ khóa tìm kiếm hoặc nhấn nút "Thêm món mới" để bổ sung vào thực đơn.</p>
              <button type="button" class="btn btn-primary btn-sm" id="btn-empty-add-dish">
                <i data-lucide="plus"></i> Thêm món mới
              </button>
            </div>
          </td>
        </tr>
      `;

      const emptyAddBtn = document.getElementById('btn-empty-add-dish');
      if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', () => openModal(null));
      }
      window.AppUtils.initIcons();
      return;
    }

    const MEAL_LABELS = {
      breakfast: 'Sáng',
      lunch: 'Trưa',
      dinner: 'Tối'
    };

    let html = '';
    dishes.forEach(dish => {
      const catInfo = window.AppUtils.DISH_CATEGORIES[dish.category] || { label: 'Khác', badgeClass: 'badge-main' };
      const isEnabled = !!dish.enabled;
      const baseServings = dish.baseServings || 4;
      const ingredientsCount = Array.isArray(dish.ingredients) ? dish.ingredients.length : 0;
      const mealTypes = Array.isArray(dish.mealTypes) && dish.mealTypes.length > 0 
        ? dish.mealTypes 
        : (dish.category === 'single' ? ['breakfast'] : ['lunch', 'dinner']);

      const mealBadges = mealTypes.map(m => `
        <span class="badge badge-meal badge-meal-${m}">${MEAL_LABELS[m] || m}</span>
      `).join(' ');

      html += `
        <tr data-dish-id="${dish.id}">
          <td>
            <div class="dish-name-cell">${window.AppUtils.escapeHtml(dish.name)}</div>
            ${dish.note ? `<div class="dish-note-text">${window.AppUtils.escapeHtml(dish.note)}</div>` : ''}
            <div class="dish-recipe-meta">
              <span class="meta-tag">Khẩu phần chuẩn: <strong>${baseServings}</strong></span>
              <span class="meta-tag">Nguyên liệu: <strong>${ingredientsCount}</strong></span>
            </div>
          </td>
          <td>
            <div style="margin-bottom: 6px;">
              <span class="badge ${catInfo.badgeClass}">
                ${window.AppUtils.escapeHtml(catInfo.label)}
              </span>
            </div>
            <div class="meal-types-tags">
              ${mealBadges}
            </div>
          </td>
          <td>
            <label class="switch-label">
              <input type="checkbox" class="switch-input toggle-dish-enabled" data-id="${dish.id}" ${isEnabled ? 'checked' : ''}>
              <span class="switch-track"><span class="switch-thumb"></span></span>
              <span style="font-size: 0.8rem; color: ${isEnabled ? 'var(--success-text)' : 'var(--muted-foreground)'}; font-weight: 600;">
                ${isEnabled ? 'Đang dùng' : 'Tạm tắt'}
              </span>
            </label>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn btn-outline btn-icon btn-sm btn-edit-dish" data-id="${dish.id}" title="Chỉnh sửa món">
                <i data-lucide="pencil"></i>
              </button>
              <button type="button" class="btn btn-danger-soft btn-icon btn-sm btn-delete-dish" data-id="${dish.id}" data-name="${window.AppUtils.escapeHtml(dish.name)}" title="Xóa món">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    dishesTableBody.innerHTML = html;
    bindTableEvents();
    window.AppUtils.initIcons();
  }

  /**
   * Bind events on rendered table rows
   */
  function bindTableEvents() {
    // Toggle enabled/disabled switch
    const toggleInputs = dishesTableBody.querySelectorAll('.toggle-dish-enabled');
    toggleInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const dishId = e.target.dataset.id;
        const newEnabled = e.target.checked;
        window.StorageManager.updateDish(dishId, { enabled: newEnabled });
        renderStats();
        renderDishes();
        window.AppUtils.showToast(newEnabled ? 'Đã bật món cho thực đơn tự động' : 'Đã tạm tắt món khỏi thực đơn tự động', 'info');
      });
    });

    // Edit button
    const editBtns = dishesTableBody.querySelectorAll('.btn-edit-dish');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dishId = btn.dataset.id;
        openModal(dishId);
      });
    });

    // Delete button
    const deleteBtns = dishesTableBody.querySelectorAll('.btn-delete-dish');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dishId = btn.dataset.id;
        const dishName = btn.dataset.name;

        window.AppUtils.showConfirmModal({
          title: 'Xóa món ăn?',
          message: `Bạn có chắc chắn muốn xóa món "${dishName}" khỏi danh sách? Thao tác này không thể hoàn tác.`,
          confirmText: 'Xóa vĩnh viễn',
          confirmVariant: 'btn-danger',
          onConfirm: () => {
            window.StorageManager.deleteDish(dishId);
            renderStats();
            renderDishes();
            window.AppUtils.showToast(`Đã xóa món "${dishName}" thành công!`, 'success');
          }
        });
      });
    });
  }

  /**
   * Render a dynamic ingredient row
   */
  function addIngredientRow(data = { name: '', quantity: '', unit: 'g' }) {
    if (!ingredientRowsContainer) return;

    const row = document.createElement('div');
    row.className = 'ingredient-input-row';

    const unitOptions = window.AppUtils.SUPPORTED_UNITS.map(u => `
      <option value="${u.key}" ${u.key === (data.unit || 'g') ? 'selected' : ''}>${u.label}</option>
    `).join('');

    row.innerHTML = `
      <input type="text" class="form-input ing-name-input" placeholder="Tên nguyên liệu (VD: Thịt lợn)" value="${window.AppUtils.escapeHtml(data.name || '')}" required>
      <input type="number" class="form-input ing-qty-input" placeholder="Số lượng" value="${data.quantity !== undefined ? data.quantity : ''}" min="0.01" step="any" required>
      <select class="form-select ing-unit-select">
        ${unitOptions}
      </select>
      <button type="button" class="btn btn-ghost btn-icon btn-sm ing-delete-btn" title="Xóa nguyên liệu này">
        <i data-lucide="trash-2"></i>
      </button>
    `;

    const delBtn = row.querySelector('.ing-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        row.remove();
      });
    }

    ingredientRowsContainer.appendChild(row);
    window.AppUtils.initIcons();
  }

  /**
   * Open modal for add or edit
   */
  function openModal(dishId = null) {
    editingDishId = dishId;
    ingredientRowsContainer.innerHTML = '';

    if (dishId) {
      const dish = window.StorageManager.getDishById(dishId);
      if (!dish) return;
      modalTitle.textContent = 'Chỉnh sửa món ăn';
      inputDishName.value = dish.name || '';
      selectDishCategory.value = dish.category || 'main';
      inputBaseServings.value = dish.baseServings || 4;

      const mealTypes = Array.isArray(dish.mealTypes) && dish.mealTypes.length > 0 
        ? dish.mealTypes 
        : (dish.category === 'single' ? ['breakfast'] : ['lunch', 'dinner']);

      checkMealBreakfast.checked = mealTypes.includes('breakfast');
      checkMealLunch.checked = mealTypes.includes('lunch');
      checkMealDinner.checked = mealTypes.includes('dinner');

      inputDishNote.value = dish.note || '';
      checkDishEnabled.checked = typeof dish.enabled === 'boolean' ? dish.enabled : true;

      // Populate ingredient rows
      if (Array.isArray(dish.ingredients) && dish.ingredients.length > 0) {
        dish.ingredients.forEach(ing => addIngredientRow(ing));
      }
    } else {
      modalTitle.textContent = 'Thêm món ăn mới';
      dishForm.reset();
      selectDishCategory.value = currentCategoryFilter !== 'all' ? currentCategoryFilter : 'main';
      inputBaseServings.value = 4;
      checkMealBreakfast.checked = false;
      checkMealLunch.checked = true;
      checkMealDinner.checked = true;
      checkDishEnabled.checked = true;
      // Single empty row for convenience
      addIngredientRow({ name: '', quantity: '', unit: 'g' });
    }

    dishModal.classList.add('open');
    inputDishName.focus();
    window.AppUtils.initIcons();
  }

  function closeModal() {
    dishModal.classList.remove('open');
    editingDishId = null;
  }

  /**
   * Handle form submit
   */
  function handleFormSubmit(e) {
    e.preventDefault();

    const name = inputDishName.value.trim();
    const category = selectDishCategory.value;
    const baseServings = Math.max(1, parseInt(inputBaseServings.value, 10) || 4);
    const note = inputDishNote.value.trim();
    const enabled = checkDishEnabled.checked;

    // Collect mealTypes
    const mealTypes = [];
    if (checkMealBreakfast.checked) mealTypes.push('breakfast');
    if (checkMealLunch.checked) mealTypes.push('lunch');
    if (checkMealDinner.checked) mealTypes.push('dinner');

    if (!name) {
      window.AppUtils.showToast('Vui lòng nhập tên món ăn!', 'error');
      inputDishName.focus();
      return;
    }

    if (mealTypes.length === 0) {
      window.AppUtils.showToast('Vui lòng chọn ít nhất một bữa ăn phù hợp cho món!', 'error');
      return;
    }

    // Collect ingredients
    const ingredients = [];
    const rows = ingredientRowsContainer.querySelectorAll('.ingredient-input-row');
    rows.forEach(row => {
      const ingName = row.querySelector('.ing-name-input')?.value.trim();
      const ingQty = parseFloat(row.querySelector('.ing-qty-input')?.value);
      const ingUnit = row.querySelector('.ing-unit-select')?.value.trim();

      if (ingName && !isNaN(ingQty) && ingQty > 0) {
        ingredients.push({
          name: ingName,
          quantity: ingQty,
          unit: ingUnit || 'g'
        });
      }
    });

    const dishPayload = {
      name,
      category,
      baseServings,
      mealTypes,
      ingredients,
      note,
      enabled
    };

    if (editingDishId) {
      // Update
      window.StorageManager.updateDish(editingDishId, dishPayload);
      window.AppUtils.showToast(`Đã cập nhật món "${name}" thành công!`, 'success');
    } else {
      // Create
      window.StorageManager.addDish(dishPayload);
      window.AppUtils.showToast(`Đã thêm món "${name}" vào danh sách!`, 'success');
    }

    closeModal();
    renderStats();
    renderDishes();
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', init);
})(window);
