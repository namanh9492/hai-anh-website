/**
 * TipsPage Controller - Household cleaning and maintenance tips
 * Features:
 * - Search by keyword (title, content, preparation items)
 * - Category filter tabs
 * - Dynamic preparation items (add/remove inputs)
 * - Dynamic reference links (add/remove inputs with title & url)
 * - Detailed modal viewer with checklist & safe external links
 * - Full CRUD with safe XSS escaping and modal confirmation
 */
(function(window) {
  'use strict';

  let currentCategoryFilter = 'all';
  let currentSearchQuery = '';
  let editingTipId = null;

  // DOM Elements
  const tipsGrid = document.getElementById('tips-grid');
  const searchInput = document.getElementById('tip-search-input');
  const categoryFilterContainer = document.getElementById('tip-category-filter');
  const btnOpenAddModal = document.getElementById('btn-open-add-tip');

  // Form Modal Elements
  const tipModal = document.getElementById('tip-form-modal');
  const tipForm = document.getElementById('tip-form');
  const formModalTitle = document.getElementById('tip-form-modal-title');
  const inputTipTitle = document.getElementById('tip-title-input');
  const selectTipCategory = document.getElementById('tip-category-select');
  const inputTipContent = document.getElementById('tip-content-input');
  const inputTipNote = document.getElementById('tip-note-input');
  const prepListContainer = document.getElementById('prep-items-container');
  const btnAddPrepRow = document.getElementById('btn-add-prep-item');
  const linksListContainer = document.getElementById('links-container');
  const btnAddLinkRow = document.getElementById('btn-add-link-item');
  const btnCloseFormModal = document.getElementById('btn-close-tip-form');
  const btnCancelFormModal = document.getElementById('btn-cancel-tip-form');

  // Detail Modal Elements
  const detailModal = document.getElementById('tip-detail-modal');
  const detailTitle = document.getElementById('detail-tip-title');
  const detailBadge = document.getElementById('detail-tip-badge');
  const detailPrepSection = document.getElementById('detail-prep-section');
  const detailPrepList = document.getElementById('detail-prep-list');
  const detailContent = document.getElementById('detail-tip-content');
  const detailLinksSection = document.getElementById('detail-links-section');
  const detailLinksList = document.getElementById('detail-links-list');
  const detailNoteSection = document.getElementById('detail-note-section');
  const detailNote = document.getElementById('detail-tip-note');
  const btnCloseDetailModal = document.getElementById('btn-close-tip-detail');
  const btnCloseDetailFooter = document.getElementById('btn-close-detail-footer');
  const btnDetailEdit = document.getElementById('btn-detail-edit');
  const btnDetailDelete = document.getElementById('btn-detail-delete');

  let activeDetailTipId = null;

  /**
   * Initialize Tips Page
   */
  function init() {
    renderTips();
    bindEvents();
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        renderTips();
      });
    }

    if (categoryFilterContainer) {
      categoryFilterContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.filter-pill');
        if (!target) return;

        categoryFilterContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        target.classList.add('active');
        currentCategoryFilter = target.dataset.category || 'all';
        renderTips();
      });
    }

    if (btnOpenAddModal) {
      btnOpenAddModal.addEventListener('click', () => openFormModal(null));
    }

    // Dynamic prep item rows
    if (btnAddPrepRow) {
      btnAddPrepRow.addEventListener('click', () => addPrepItemRow(''));
    }

    // Dynamic link item rows
    if (btnAddLinkRow) {
      btnAddLinkRow.addEventListener('click', () => addLinkItemRow('', ''));
    }

    // Form Modal close buttons
    if (btnCloseFormModal) btnCloseFormModal.addEventListener('click', closeFormModal);
    if (btnCancelFormModal) btnCancelFormModal.addEventListener('click', closeFormModal);
    if (tipModal) {
      tipModal.addEventListener('click', (e) => {
        if (e.target === tipModal) closeFormModal();
      });
    }

    // Detail Modal close buttons
    if (btnCloseDetailModal) btnCloseDetailModal.addEventListener('click', closeDetailModal);
    if (btnCloseDetailFooter) btnCloseDetailFooter.addEventListener('click', closeDetailModal);
    if (detailModal) {
      detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) closeDetailModal();
      });
    }

    if (btnDetailEdit) {
      btnDetailEdit.addEventListener('click', () => {
        const id = activeDetailTipId;
        closeDetailModal();
        if (id) openFormModal(id);
      });
    }

    if (btnDetailDelete) {
      btnDetailDelete.addEventListener('click', () => {
        const id = activeDetailTipId;
        const tip = window.StorageManager.getTipById(id);
        if (!tip) return;

        window.AppUtils.showConfirmModal({
          title: 'Xóa mẹo chăm sóc nhà?',
          message: `Bạn có chắc muốn xóa mẹo "${tip.title}"? Thao tác này không thể hoàn tác.`,
          confirmText: 'Xóa vĩnh viễn',
          confirmVariant: 'btn-danger',
          onConfirm: () => {
            window.StorageManager.deleteTip(id);
            closeDetailModal();
            renderTips();
            window.AppUtils.showToast(`Đã xóa mẹo "${tip.title}"!`, 'success');
          }
        });
      });
    }

    if (tipForm) {
      tipForm.addEventListener('submit', handleFormSubmit);
    }
  }

  /**
   * Render tips grid
   */
  function renderTips() {
    if (!tipsGrid) return;

    let tips = window.StorageManager.getTips();

    // Filter by Category
    if (currentCategoryFilter !== 'all') {
      tips = tips.filter(t => t.category === currentCategoryFilter);
    }

    // Filter by Search Query
    if (currentSearchQuery) {
      tips = tips.filter(t => {
        const titleMatch = t.title && t.title.toLowerCase().includes(currentSearchQuery);
        const contentMatch = t.content && t.content.toLowerCase().includes(currentSearchQuery);
        const noteMatch = t.note && t.note.toLowerCase().includes(currentSearchQuery);
        const prepMatch = Array.isArray(t.preparationItems) && t.preparationItems.some(item => item.toLowerCase().includes(currentSearchQuery));
        return titleMatch || contentMatch || noteMatch || prepMatch;
      });
    }

    if (tips.length === 0) {
      tipsGrid.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; padding: 48px 20px; text-align: center;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i data-lucide="sparkles"></i>
            </div>
            <h4 class="empty-state-title">Chưa có mẹo nào phù hợp</h4>
            <p class="empty-state-desc">Hãy thử thay đổi tiêu chí lọc hoặc thêm mẹo dọn dẹp, bảo quản đồ dùng mới cho gia đình.</p>
            <button type="button" class="btn btn-primary btn-sm" id="btn-empty-add-tip">
              <i data-lucide="plus"></i> Thêm mẹo mới
            </button>
          </div>
        </div>
      `;

      const emptyAddBtn = document.getElementById('btn-empty-add-tip');
      if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', () => openFormModal(null));
      }
      window.AppUtils.initIcons();
      return;
    }

    let html = '';
    tips.forEach(tip => {
      const categoryName = window.AppUtils.TIP_CATEGORIES[tip.category] || 'Khác';
      const prepItems = Array.isArray(tip.preparationItems) ? tip.preparationItems : [];
      const links = Array.isArray(tip.links) ? tip.links : [];

      let prepPillsHtml = '';
      if (prepItems.length > 0) {
        const displayItems = prepItems.slice(0, 3);
        displayItems.forEach(item => {
          prepPillsHtml += `<span class="tip-prep-tag">${window.AppUtils.escapeHtml(item)}</span>`;
        });
        if (prepItems.length > 3) {
          prepPillsHtml += `<span class="tip-prep-tag">+${prepItems.length - 3}</span>`;
        }
      }

      html += `
        <div class="tip-card" data-tip-id="${tip.id}">
          <div class="tip-card-header">
            <div>
              <span class="badge" style="background: var(--primary-soft); color: var(--primary); margin-bottom: 6px;">
                ${window.AppUtils.escapeHtml(categoryName)}
              </span>
              <h3 class="tip-title">${window.AppUtils.escapeHtml(tip.title)}</h3>
            </div>
          </div>

          <div class="tip-card-body">
            ${prepPillsHtml ? `
              <div class="tip-prep-pills">
                ${prepPillsHtml}
              </div>
            ` : ''}

            <p class="tip-preview-text">
              ${window.AppUtils.escapeHtml(tip.content || tip.note || 'Nhấn để xem chi tiết hướng dẫn...')}
            </p>
          </div>

          <div class="tip-card-footer">
            <span style="display: flex; align-items: center; gap: 4px;">
              <i data-lucide="link-2" style="width: 13px; height: 13px;"></i>
              ${links.length} liên kết
            </span>
            <span style="display: flex; align-items: center; gap: 4px; color: var(--primary); font-weight: 600;">
              Xem chi tiết <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
            </span>
          </div>
        </div>
      `;
    });

    tipsGrid.innerHTML = html;
    bindCardClicks();
    window.AppUtils.initIcons();
  }

  /**
   * Bind click event on tip cards to open detail modal
   */
  function bindCardClicks() {
    const cards = tipsGrid.querySelectorAll('.tip-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const tipId = card.dataset.tipId;
        openDetailModal(tipId);
      });
    });
  }

  /**
   * Open Tip Detail Modal
   */
  function openDetailModal(tipId) {
    const tip = window.StorageManager.getTipById(tipId);
    if (!tip) return;

    activeDetailTipId = tipId;

    const categoryName = window.AppUtils.TIP_CATEGORIES[tip.category] || 'Khác';
    detailTitle.textContent = tip.title;
    detailBadge.textContent = categoryName;

    // Preparation list
    const prepItems = Array.isArray(tip.preparationItems) ? tip.preparationItems : [];
    if (prepItems.length > 0) {
      detailPrepSection.style.display = 'block';
      let prepHtml = '';
      prepItems.forEach((item, idx) => {
        prepHtml += `
          <li class="tip-detail-prep-item">
            <input type="checkbox" id="prep-item-${idx}" style="accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer;">
            <label for="prep-item-${idx}" style="cursor: pointer; flex: 1;">${window.AppUtils.escapeHtml(item)}</label>
          </li>
        `;
      });
      detailPrepList.innerHTML = prepHtml;
    } else {
      detailPrepSection.style.display = 'none';
      detailPrepList.innerHTML = '';
    }

    // Content
    detailContent.textContent = tip.content || 'Chưa có hướng dẫn chi tiết.';

    // Links
    const links = Array.isArray(tip.links) ? tip.links : [];
    if (links.length > 0) {
      detailLinksSection.style.display = 'block';
      let linksHtml = '';
      links.forEach(l => {
        const linkTitle = l.title || l.url;
        const isSafe = window.AppUtils.validateExternalUrl(l.url);
        if (isSafe) {
          linksHtml += `
            <div>
              <a href="${window.AppUtils.escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="tip-link-anchor">
                <i data-lucide="external-link" style="width: 15px; height: 15px;"></i>
                <span>${window.AppUtils.escapeHtml(linkTitle)}</span>
              </a>
            </div>
          `;
        } else {
          linksHtml += `
            <div style="font-size: 0.86rem; color: var(--muted-foreground); display: flex; align-items: center; gap: 6px;">
              <i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: var(--warning-text);"></i>
              <span>${window.AppUtils.escapeHtml(linkTitle)} (URL không hợp lệ hoặc không an toàn)</span>
            </div>
          `;
        }
      });
      detailLinksList.innerHTML = linksHtml;
    } else {
      detailLinksSection.style.display = 'none';
      detailLinksList.innerHTML = '';
    }

    // Note
    if (tip.note && tip.note.trim()) {
      detailNoteSection.style.display = 'block';
      detailNote.textContent = tip.note;
    } else {
      detailNoteSection.style.display = 'none';
      detailNote.textContent = '';
    }

    detailModal.classList.add('open');
    window.AppUtils.initIcons();
  }

  function closeDetailModal() {
    detailModal.classList.remove('open');
    activeDetailTipId = null;
  }

  /**
   * Helper to create preparation item dynamic row
   */
  function addPrepItemRow(value = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
      <input type="text" class="form-input prep-item-input" placeholder="Ví dụ: Baking soda, Khăn lau mềm..." value="${window.AppUtils.escapeHtml(value)}">
      <button type="button" class="btn btn-ghost btn-icon btn-sm btn-remove-row" title="Xóa dòng" aria-label="Xóa">
        <i data-lucide="trash-2"></i>
      </button>
    `;

    row.querySelector('.btn-remove-row').addEventListener('click', () => {
      row.remove();
    });

    prepListContainer.appendChild(row);
    window.AppUtils.initIcons();
  }

  /**
   * Helper to create reference link dynamic row
   */
  function addLinkItemRow(title = '', url = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
      <input type="text" class="form-input link-title-input" placeholder="Tên bài viết / Video" value="${window.AppUtils.escapeHtml(title)}" style="max-width: 40%;">
      <input type="url" class="form-input link-url-input" placeholder="https://..." value="${window.AppUtils.escapeHtml(url)}">
      <button type="button" class="btn btn-ghost btn-icon btn-sm btn-remove-row" title="Xóa dòng" aria-label="Xóa">
        <i data-lucide="trash-2"></i>
      </button>
    `;

    row.querySelector('.btn-remove-row').addEventListener('click', () => {
      row.remove();
    });

    linksListContainer.appendChild(row);
    window.AppUtils.initIcons();
  }

  /**
   * Open form modal for Add or Edit
   */
  function openFormModal(tipId = null) {
    editingTipId = tipId;
    prepListContainer.innerHTML = '';
    linksListContainer.innerHTML = '';

    if (tipId) {
      const tip = window.StorageManager.getTipById(tipId);
      if (!tip) return;

      formModalTitle.textContent = 'Chỉnh sửa mẹo';
      inputTipTitle.value = tip.title || '';
      selectTipCategory.value = tip.category || 'bep';
      inputTipContent.value = tip.content || '';
      inputTipNote.value = tip.note || '';

      // Fill prep items
      if (Array.isArray(tip.preparationItems) && tip.preparationItems.length > 0) {
        tip.preparationItems.forEach(item => addPrepItemRow(item));
      } else {
        addPrepItemRow('');
      }

      // Fill links
      if (Array.isArray(tip.links) && tip.links.length > 0) {
        tip.links.forEach(link => addLinkItemRow(link.title || '', link.url || ''));
      }
    } else {
      formModalTitle.textContent = 'Thêm mẹo chăm sóc nhà mới';
      tipForm.reset();
      selectTipCategory.value = currentCategoryFilter !== 'all' ? currentCategoryFilter : 'bep';
      addPrepItemRow('');
    }

    tipModal.classList.add('open');
    inputTipTitle.focus();
    window.AppUtils.initIcons();
  }

  function closeFormModal() {
    tipModal.classList.remove('open');
    editingTipId = null;
  }

  /**
   * Handle form submit
   */
  function handleFormSubmit(e) {
    e.preventDefault();

    const title = inputTipTitle.value.trim();
    const category = selectTipCategory.value;
    const content = inputTipContent.value.trim();
    const note = inputTipNote.value.trim();

    if (!title) {
      window.AppUtils.showToast('Vui lòng nhập tiêu đề mẹo!', 'error');
      inputTipTitle.focus();
      return;
    }

    // Collect prep items
    const prepInputs = prepListContainer.querySelectorAll('.prep-item-input');
    const preparationItems = [];
    prepInputs.forEach(input => {
      const val = input.value.trim();
      if (val) preparationItems.push(val);
    });

    // Collect links with strict protocol validation
    const linkRows = linksListContainer.querySelectorAll('.dynamic-row');
    const links = [];
    for (let i = 0; i < linkRows.length; i++) {
      const row = linkRows[i];
      const titleInput = row.querySelector('.link-title-input');
      const urlInput = row.querySelector('.link-url-input');
      const linkTitle = titleInput ? titleInput.value.trim() : '';
      const linkUrl = urlInput ? urlInput.value.trim() : '';

      if (linkUrl) {
        if (!window.AppUtils.validateExternalUrl(linkUrl)) {
          window.AppUtils.showToast(`Liên kết "${linkTitle || linkUrl}" không hợp lệ. Chỉ chấp nhận link http:// hoặc https://!`, 'error');
          if (urlInput) urlInput.focus();
          return;
        }
        links.push({
          title: linkTitle || linkUrl,
          url: linkUrl
        });
      }
    }

    if (editingTipId) {
      // Update
      window.StorageManager.updateTip(editingTipId, {
        title,
        category,
        preparationItems,
        content,
        links,
        note
      });
      window.AppUtils.showToast(`Đã cập nhật mẹo "${title}" thành công!`, 'success');
    } else {
      // Create
      window.StorageManager.addTip({
        title,
        category,
        preparationItems,
        content,
        links,
        note
      });
      window.AppUtils.showToast(`Đã thêm mẹo "${title}" thành công!`, 'success');
    }

    closeFormModal();
    renderTips();
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', init);
})(window);
