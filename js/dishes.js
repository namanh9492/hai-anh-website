/**
 * DishesPage Controller - Family Home V1.1 Phase 3: Dish Images
 * CRUD dishes with recipes (baseServings, mealTypes, dynamic ingredients),
 * Wikimedia Commons image search, client compression & IndexedDB storage,
 * and automatic ingredient unit normalization.
 */
(function(window) {
  'use strict';

  let currentCategoryFilter = 'all';
  let currentMealFilter = 'all';
  let currentSearchQuery = '';
  let editingDishId = null;

  // Staged Image State
  let currentFormImage = null; // Staged or current image metadata
  let pendingImageResult = null; // Download candidate selected from modal
  let pendingImageDeleted = false; // User clicked "Xóa ảnh"
  let currentSearchResults = [];
  let selectedSearchIndex = null;

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
  const btnSaveDish = document.getElementById('btn-save-dish');

  // Image Form Elements
  const dishFormImagePreview = document.getElementById('dish-form-image-preview');
  const dishFormImageAttribution = document.getElementById('dish-form-image-attribution');
  const btnFindDishImage = document.getElementById('btn-find-dish-image');
  const btnChangeDishImage = document.getElementById('btn-change-dish-image');
  const btnRemoveDishImage = document.getElementById('btn-remove-dish-image');

  // Image Search Modal Elements
  const imageSearchModal = document.getElementById('image-search-modal');
  const imageSearchInput = document.getElementById('image-search-input');
  const btnDoImageSearch = document.getElementById('btn-do-image-search');
  const imageSearchLoading = document.getElementById('image-search-loading');
  const imageSearchLoadingText = document.getElementById('image-search-loading-text');
  const imageSearchResultsGrid = document.getElementById('image-search-results-grid');
  const imageSearchEmptyState = document.getElementById('image-search-empty-state');
  const btnCloseImageModal = document.getElementById('btn-close-image-modal');
  const btnCancelImageSearch = document.getElementById('btn-cancel-image-search');
  const btnApplyDishImage = document.getElementById('btn-apply-dish-image');

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

    // Meal Filter Pills
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

    // Image Form Actions
    if (btnFindDishImage) {
      btnFindDishImage.addEventListener('click', handleOpenImageSearch);
    }
    if (btnChangeDishImage) {
      btnChangeDishImage.addEventListener('click', handleOpenImageSearch);
    }
    if (btnRemoveDishImage) {
      btnRemoveDishImage.addEventListener('click', handleRemoveDishImage);
    }

    // Image Search Modal Actions
    if (btnCloseImageModal) btnCloseImageModal.addEventListener('click', closeImageSearchModal);
    if (btnCancelImageSearch) btnCancelImageSearch.addEventListener('click', closeImageSearchModal);
    if (imageSearchModal) {
      imageSearchModal.addEventListener('click', (e) => {
        if (e.target === imageSearchModal) closeImageSearchModal();
      });
    }

    if (btnDoImageSearch) {
      btnDoImageSearch.addEventListener('click', () => {
        const q = imageSearchInput.value.trim();
        if (q) executeImageSearch(q);
      });
    }

    if (imageSearchInput) {
      imageSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const q = imageSearchInput.value.trim();
          if (q) executeImageSearch(q);
        }
      });
    }

    if (btnApplyDishImage) {
      btnApplyDishImage.addEventListener('click', handleApplySelectedImage);
    }
  }

  /**
   * Render Stats summary and local image storage estimate
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

    // Estimate storage size (Section 20)
    if (window.ImageStorage && typeof window.ImageStorage.getStorageEstimate === 'function') {
      window.ImageStorage.getStorageEstimate().then(est => {
        const estEl = document.getElementById('stat-image-storage-size');
        if (estEl) {
          estEl.textContent = `Ảnh đã lưu: ${est.count} (~${est.formatted})`;
        }
      }).catch(() => {});
    }
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

    // Meal type filter
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

      // Synchronous thumbnail URL if cached
      const syncUrl = window.ImageService ? window.ImageService.getDishImageUrlSync(dish) : null;
      const thumbContent = syncUrl
        ? `<img src="${window.AppUtils.escapeHtml(syncUrl)}" alt="${window.AppUtils.escapeHtml(dish.name)}" class="dish-table-thumb" loading="lazy">`
        : `<div class="dish-table-thumb-placeholder"><i data-lucide="utensils"></i></div>`;

      html += `
        <tr data-dish-id="${dish.id}">
          <td>
            <div class="dish-cell-media">
              <div class="dish-table-thumb-box" data-thumb-id="${dish.id}">
                ${thumbContent}
              </div>
              <div class="dish-cell-info">
                <div class="dish-name-cell">${window.AppUtils.escapeHtml(dish.name)}</div>
                ${dish.note ? `<div class="dish-note-text">${window.AppUtils.escapeHtml(dish.note)}</div>` : ''}
                <div class="dish-recipe-meta">
                  <span class="meta-tag">Khẩu phần: <strong>${baseServings}</strong></span>
                  <span class="meta-tag">Nguyên liệu: <strong>${ingredientsCount}</strong></span>
                  ${dish.image?.licenseName ? `<span class="meta-tag meta-tag-license" title="${window.AppUtils.escapeHtml(dish.image.author || '')}">Ảnh: ${window.AppUtils.escapeHtml(dish.image.licenseName)}</span>` : ''}
                </div>
              </div>
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

    // Asynchronously resolve local IndexedDB blobs for any dishes not yet in sync memory
    dishes.forEach(async (dish) => {
      if (dish.image && window.ImageService) {
        const syncUrl = window.ImageService.getDishImageUrlSync(dish);
        if (!syncUrl) {
          const asyncUrl = await window.ImageService.getDishImageUrl(dish);
          if (asyncUrl) {
            const thumbBox = dishesTableBody.querySelector(`[data-thumb-id="${dish.id}"]`);
            if (thumbBox) {
              thumbBox.innerHTML = `<img src="${window.AppUtils.escapeHtml(asyncUrl)}" alt="${window.AppUtils.escapeHtml(dish.name)}" class="dish-table-thumb" loading="lazy">`;
            }
          }
        }
      }
    });
  }

  /**
   * Bind events on rendered table rows
   */
  function bindTableEvents() {
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

    const editBtns = dishesTableBody.querySelectorAll('.btn-edit-dish');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dishId = btn.dataset.id;
        openModal(dishId);
      });
    });

    const deleteBtns = dishesTableBody.querySelectorAll('.btn-delete-dish');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dishId = btn.dataset.id;
        const dishName = btn.dataset.name;

        window.AppUtils.showConfirmModal({
          title: 'Xóa món ăn?',
          message: `Bạn có chắc chắn muốn xóa món "${dishName}" khỏi danh sách? Ảnh và công thức liên quan cũng sẽ được xóa.`,
          confirmText: 'Xóa vĩnh viễn',
          confirmVariant: 'btn-danger',
          onConfirm: async () => {
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
   * Render dynamic ingredient row
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
   * Update the image preview and attribution inside the dish edit modal
   */
  function updateFormImageDisplay(imageMeta) {
    if (!dishFormImagePreview) return;

    if (imageMeta) {
      // Determine display URL
      let previewUrl = imageMeta.thumbnailUrl || imageMeta.originalUrl;
      if (imageMeta.savedLocally && imageMeta.assetId && window.ImageService) {
        const syncUrl = window.ImageService.getDishImageUrlSync({ image: imageMeta });
        if (syncUrl) previewUrl = syncUrl;
      }

      dishFormImagePreview.innerHTML = `
        <img src="${window.AppUtils.escapeHtml(previewUrl || '')}" alt="${window.AppUtils.escapeHtml(imageMeta.title || 'Ảnh món ăn')}" class="dish-form-preview-img">
      `;

      // If async resolution is needed for local blob
      if (imageMeta.savedLocally && imageMeta.assetId && window.ImageService) {
        window.ImageService.getDishImageUrl({ image: imageMeta }).then(asyncUrl => {
          if (asyncUrl && dishFormImagePreview) {
            dishFormImagePreview.innerHTML = `
              <img src="${window.AppUtils.escapeHtml(asyncUrl)}" alt="${window.AppUtils.escapeHtml(imageMeta.title || 'Ảnh món ăn')}" class="dish-form-preview-img">
            `;
          }
        }).catch(() => {});
      }

      // Show Change / Remove buttons
      if (btnFindDishImage) btnFindDishImage.style.display = 'none';
      if (btnChangeDishImage) btnChangeDishImage.style.display = 'inline-flex';
      if (btnRemoveDishImage) btnRemoveDishImage.style.display = 'inline-flex';

      // Render Attribution
      if (dishFormImageAttribution) {
        const sourceUrl = imageMeta.sourcePageUrl || imageMeta.originalUrl || '#';
        const licenseUrl = imageMeta.licenseUrl;
        const author = imageMeta.author || 'Wikimedia Commons';
        const licenseName = imageMeta.licenseName || 'CC';

        dishFormImageAttribution.innerHTML = `
          <div class="dish-attr-box">
            <i data-lucide="info" style="width: 13px; height: 13px; flex-shrink: 0; margin-top: 2px;"></i>
            <div class="dish-attr-content">
              <span>Nguồn: <a href="${window.AppUtils.escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></span>
              <span> · Tác giả: <strong>${window.AppUtils.escapeHtml(author)}</strong></span>
              <span> · Giấy phép: ${licenseUrl ? `<a href="${window.AppUtils.escapeHtml(licenseUrl)}" target="_blank" rel="noopener noreferrer">${window.AppUtils.escapeHtml(licenseName)}</a>` : window.AppUtils.escapeHtml(licenseName)}</span>
            </div>
          </div>
        `;
        dishFormImageAttribution.style.display = 'block';
      }
    } else {
      // Placeholder state
      dishFormImagePreview.innerHTML = `
        <div class="dish-image-placeholder-large">
          <i data-lucide="image"></i>
          <span>Chưa có ảnh</span>
        </div>
      `;

      if (btnFindDishImage) btnFindDishImage.style.display = 'inline-flex';
      if (btnChangeDishImage) btnChangeDishImage.style.display = 'none';
      if (btnRemoveDishImage) btnRemoveDishImage.style.display = 'none';
      if (dishFormImageAttribution) {
        dishFormImageAttribution.innerHTML = '';
        dishFormImageAttribution.style.display = 'none';
      }
    }

    window.AppUtils.initIcons();
  }

  /**
   * Open modal for add or edit
   */
  function openModal(dishId = null) {
    editingDishId = dishId;
    ingredientRowsContainer.innerHTML = '';
    pendingImageResult = null;
    pendingImageDeleted = false;

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

      currentFormImage = dish.image || null;
      updateFormImageDisplay(currentFormImage);
    } else {
      modalTitle.textContent = 'Thêm món ăn mới';
      dishForm.reset();
      selectDishCategory.value = currentCategoryFilter !== 'all' ? currentCategoryFilter : 'main';
      inputBaseServings.value = 4;
      checkMealBreakfast.checked = false;
      checkMealLunch.checked = true;
      checkMealDinner.checked = true;
      checkDishEnabled.checked = true;
      addIngredientRow({ name: '', quantity: '', unit: 'g' });

      currentFormImage = null;
      updateFormImageDisplay(null);
    }

    dishModal.classList.add('open');
    inputDishName.focus();
    window.AppUtils.initIcons();
  }

  function closeModal() {
    dishModal.classList.remove('open');
    editingDishId = null;
    pendingImageResult = null;
    pendingImageDeleted = false;
    currentFormImage = null;
  }

  /**
   * Handle click "Tìm ảnh tự động" or "Đổi ảnh"
   */
  function handleOpenImageSearch() {
    const dishName = inputDishName.value.trim();
    if (!dishName) {
      window.AppUtils.showToast('Vui lòng nhập tên món ăn trước khi tìm ảnh!', 'info');
      inputDishName.focus();
      return;
    }

    imageSearchInput.value = dishName;
    imageSearchModal.classList.add('open');
    executeImageSearch(dishName);
  }

  function closeImageSearchModal() {
    imageSearchModal.classList.remove('open');
    currentSearchResults = [];
    selectedSearchIndex = null;
    if (btnApplyDishImage) btnApplyDishImage.disabled = true;
  }

  /**
   * Execute Wikimedia Commons search
   */
  async function executeImageSearch(query) {
    if (!query || !window.ImageService) return;

    if (imageSearchLoading) imageSearchLoading.style.display = 'block';
    if (imageSearchResultsGrid) imageSearchResultsGrid.style.display = 'none';
    if (imageSearchEmptyState) imageSearchEmptyState.style.display = 'none';
    if (btnDoImageSearch) btnDoImageSearch.disabled = true;
    if (btnApplyDishImage) btnApplyDishImage.disabled = true;

    selectedSearchIndex = null;

    try {
      const results = await window.ImageService.searchDishImages(query, 12);
      currentSearchResults = results;

      if (imageSearchLoading) imageSearchLoading.style.display = 'none';
      if (btnDoImageSearch) btnDoImageSearch.disabled = false;

      if (!results || results.length === 0) {
        if (imageSearchEmptyState) imageSearchEmptyState.style.display = 'block';
        return;
      }

      // Render search result cards
      renderSearchResultsGrid(results);
    } catch (err) {
      console.error('[DishesPage] Image search failed:', err);
      if (imageSearchLoading) imageSearchLoading.style.display = 'none';
      if (btnDoImageSearch) btnDoImageSearch.disabled = false;
      if (imageSearchEmptyState) {
        imageSearchEmptyState.style.display = 'block';
        const p = imageSearchEmptyState.querySelector('.empty-state-desc');
        if (p) p.textContent = 'Không thể kết nối đến Wikimedia Commons API. Vui lòng kiểm tra kết nối mạng và thử lại.';
      }
      window.AppUtils.showToast('Lỗi tìm kiếm ảnh: ' + (err.message || 'Lỗi mạng'), 'error');
    }
  }

  /**
   * Render candidate cards in search modal
   */
  function renderSearchResultsGrid(results) {
    if (!imageSearchResultsGrid) return;

    let html = '';
    results.forEach((item, idx) => {
      const dims = item.width && item.height ? `${item.width}×${item.height}` : '';
      html += `
        <div class="image-search-card ${idx === selectedSearchIndex ? 'is-selected' : ''}" data-index="${idx}">
          <div class="image-search-card-thumb">
            <img src="${window.AppUtils.escapeHtml(item.thumbnailUrl)}" alt="${window.AppUtils.escapeHtml(item.title)}" loading="lazy">
            ${dims ? `<span class="image-search-dim-tag">${window.AppUtils.escapeHtml(dims)}</span>` : ''}
          </div>
          <div class="image-search-card-info">
            <div class="image-search-card-title" title="${window.AppUtils.escapeHtml(item.title)}">${window.AppUtils.escapeHtml(item.title)}</div>
            <div class="image-search-card-license">${window.AppUtils.escapeHtml(item.licenseName)}</div>
            <div class="image-search-card-author" title="${window.AppUtils.escapeHtml(item.author)}">${window.AppUtils.escapeHtml(item.author)}</div>
          </div>
        </div>
      `;
    });

    imageSearchResultsGrid.innerHTML = html;
    imageSearchResultsGrid.style.display = 'grid';

    // Bind card selection clicks
    const cards = imageSearchResultsGrid.querySelectorAll('.image-search-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index, 10);
        selectedSearchIndex = idx;

        cards.forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');

        if (btnApplyDishImage) {
          btnApplyDishImage.disabled = false;
        }
      });
    });
  }

  /**
   * Apply chosen search candidate to current form
   */
  function handleApplySelectedImage() {
    if (selectedSearchIndex === null || !currentSearchResults[selectedSearchIndex]) return;

    const chosen = currentSearchResults[selectedSearchIndex];
    pendingImageResult = chosen;
    pendingImageDeleted = false;
    currentFormImage = chosen;

    updateFormImageDisplay(chosen);
    closeImageSearchModal();
    window.AppUtils.showToast('Đã chọn ảnh! Nhấn "Lưu món ăn" để tải về và lưu vào máy.', 'success');
  }

  /**
   * User removes current image
   */
  function handleRemoveDishImage() {
    currentFormImage = null;
    pendingImageResult = null;
    pendingImageDeleted = true;
    updateFormImageDisplay(null);
    window.AppUtils.showToast('Đã xóa ảnh món ăn (nhấn Lưu để áp dụng)', 'info');
  }

  /**
   * Handle form submit
   */
  async function handleFormSubmit(e) {
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

    // Disable save button and indicate progress if downloading image
    if (btnSaveDish) {
      btnSaveDish.disabled = true;
      if (pendingImageResult) {
        btnSaveDish.innerHTML = '<div class="spinner-sm"></div> <span>Đang lưu ảnh...</span>';
      }
    }

    try {
      let savedDish = null;
      if (editingDishId) {
        savedDish = window.StorageManager.updateDish(editingDishId, dishPayload);
      } else {
        savedDish = window.StorageManager.addDish(dishPayload);
      }

      // Handle image updates atomically
      if (savedDish && window.ImageService) {
        if (pendingImageResult) {
          try {
            await window.ImageService.saveDishImage(savedDish.id, pendingImageResult);
          } catch (imgErr) {
            console.warn('[DishesPage] Failed to save binary image:', imgErr.message);
            window.AppUtils.showToast('Món đã được lưu, nhưng không thể lưu ảnh cục bộ: ' + imgErr.message, 'warning');
          }
        } else if (pendingImageDeleted) {
          try {
            await window.ImageService.deleteDishImage(savedDish.id);
          } catch (delErr) {
            console.warn('[DishesPage] Failed to delete image asset:', delErr.message);
          }
        }
      }

      window.AppUtils.showToast(editingDishId ? `Đã cập nhật món "${name}" thành công!` : `Đã thêm món "${name}" vào danh sách!`, 'success');
      closeModal();
      renderStats();
      renderDishes();
    } catch (err) {
      console.error('[DishesPage] Form submit error:', err);
      window.AppUtils.showToast('Lỗi khi lưu món: ' + err.message, 'error');
    } finally {
      if (btnSaveDish) {
        btnSaveDish.disabled = false;
        btnSaveDish.innerHTML = '<i data-lucide="check"></i> <span>Lưu món ăn</span>';
        window.AppUtils.initIcons();
      }
    }
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', init);
})(window);
