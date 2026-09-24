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
    side: { label: 'Món phụ', badgeClass: 'badge-side', slotClass: 'side' }
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

  // Export
  window.AppUtils = {
    DISH_CATEGORIES,
    TIP_CATEGORIES,
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
