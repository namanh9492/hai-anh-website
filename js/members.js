/**
 * Members Controller - Family Members & Meal Schedules Management
 */
(function(window) {
  'use strict';

  let members = [];
  let searchQuery = '';

  // DOM Elements
  const membersGrid = document.getElementById('members-grid');
  const searchInput = document.getElementById('search-member-input');
  const btnOpenAdd = document.getElementById('btn-open-add-member');

  // Stats Elements
  const statTotalMembers = document.getElementById('stat-total-members');
  const statTotalMeals = document.getElementById('stat-total-meals');
  const statDietaryCount = document.getElementById('stat-dietary-count');

  // Modal & Form Elements
  const memberModal = document.getElementById('member-modal');
  const memberForm = document.getElementById('member-form');
  const modalTitle = document.getElementById('member-modal-title');
  const inputId = document.getElementById('member-id');
  const inputName = document.getElementById('member-name');
  const inputBirthDate = document.getElementById('member-birthdate');
  const agePreview = document.getElementById('member-age-preview');
  const selectPortion = document.getElementById('member-portion');
  const dietaryContainer = document.getElementById('dietary-rules-container');
  const btnAddDietary = document.getElementById('btn-add-dietary-rule');
  const textareaHealthNotes = document.getElementById('member-health-notes');
  const scheduleTbody = document.getElementById('schedule-tbody');
  const btnCloseModal = document.getElementById('btn-close-member-modal');
  const btnCancelModal = document.getElementById('btn-cancel-member');

  // Schedule Toolbar Buttons
  const btnSchedAll = document.getElementById('btn-sched-all');
  const btnSchedNone = document.getElementById('btn-sched-none');
  const btnSchedDinnerOnly = document.getElementById('btn-sched-dinner-only');
  const btnSchedCopyMon = document.getElementById('btn-sched-copy-mon');

  const DAYS_ORDER = [
    { key: 'monday', label: 'Thứ Hai' },
    { key: 'tuesday', label: 'Thứ Ba' },
    { key: 'wednesday', label: 'Thứ Tư' },
    { key: 'thursday', label: 'Thứ Năm' },
    { key: 'friday', label: 'Thứ Sáu' },
    { key: 'saturday', label: 'Thứ Bảy' },
    { key: 'sunday', label: 'Chủ Nhật' }
  ];

  /**
   * Initialize Members page
   */
  function init() {
    renderScheduleTable();
    loadMembers();
    bindEvents();
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    if (btnOpenAdd) {
      btnOpenAdd.addEventListener('click', () => openModal(null));
    }

    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', closeModal);
    }

    if (btnCancelModal) {
      btnCancelModal.addEventListener('click', closeModal);
    }

    if (memberModal) {
      memberModal.addEventListener('click', (e) => {
        if (e.target === memberModal) closeModal();
      });
    }

    if (memberForm) {
      memberForm.addEventListener('submit', handleFormSubmit);
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = (e.target.value || '').trim().toLowerCase();
        renderMembers();
      });
    }

    if (inputBirthDate) {
      inputBirthDate.addEventListener('input', updateAgePreview);
      inputBirthDate.addEventListener('change', updateAgePreview);
    }

    if (btnAddDietary) {
      btnAddDietary.addEventListener('click', () => addDietaryRuleRow(''));
    }

    // Schedule shortcuts
    if (btnSchedAll) {
      btnSchedAll.addEventListener('click', () => setAllScheduleCheckboxes(true));
    }

    if (btnSchedNone) {
      btnSchedNone.addEventListener('click', () => setAllScheduleCheckboxes(false));
    }

    if (btnSchedDinnerOnly) {
      btnSchedDinnerOnly.addEventListener('click', setDinnerOnlySchedule);
    }

    if (btnSchedCopyMon) {
      btnSchedCopyMon.addEventListener('click', copyMondayScheduleToWeekdays);
    }
  }

  /**
   * Load members from storage and update view
   */
  function loadMembers() {
    members = window.StorageManager.getMembers();
    updateStats();
    renderMembers();
  }

  /**
   * Update top stats cards
   */
  function updateStats() {
    if (statTotalMembers) {
      statTotalMembers.textContent = members.length;
    }

    if (statTotalMeals) {
      let totalMeals = 0;
      members.forEach(m => {
        if (m.mealSchedule) {
          Object.values(m.mealSchedule).forEach(day => {
            if (day.breakfast) totalMeals++;
            if (day.lunch) totalMeals++;
            if (day.dinner) totalMeals++;
          });
        }
      });
      statTotalMeals.textContent = totalMeals;
    }

    if (statDietaryCount) {
      const count = members.filter(m => Array.isArray(m.dietaryRules) && m.dietaryRules.length > 0).length;
      statDietaryCount.textContent = count;
    }
  }

  /**
   * Render member cards grid
   */
  function renderMembers() {
    if (!membersGrid) return;

    let filtered = members;
    if (searchQuery) {
      filtered = members.filter(m => {
        const nameMatch = (m.name || '').toLowerCase().includes(searchQuery);
        const rulesMatch = Array.isArray(m.dietaryRules) && m.dietaryRules.some(r => r.toLowerCase().includes(searchQuery));
        return nameMatch || rulesMatch;
      });
    }

    if (filtered.length === 0) {
      if (members.length === 0) {
        membersGrid.innerHTML = `
          <div class="empty-state-card" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">
              <i data-lucide="users"></i>
            </div>
            <h3 class="empty-state-title">Chưa có thành viên nào trong gia đình</h3>
            <p class="empty-state-desc">
              Thêm các thành viên để quản lý khẩu phần, lịch ăn cơm mặc định và hỗ trợ lên thực đơn phù hợp nhất cho tổ ấm.
            </p>
            <button type="button" class="btn btn-primary" id="btn-empty-add-member">
              <i data-lucide="plus"></i> Thêm thành viên đầu tiên
            </button>
          </div>
        `;
        const emptyAddBtn = document.getElementById('btn-empty-add-member');
        if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => openModal(null));
      } else {
        membersGrid.innerHTML = `
          <div class="empty-state-card" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">
              <i data-lucide="search"></i>
            </div>
            <h3 class="empty-state-title">Không tìm thấy thành viên phù hợp</h3>
            <p class="empty-state-desc">Thử tìm kiếm với từ khóa khác.</p>
          </div>
        `;
      }
      window.AppUtils.initIcons();
      return;
    }

    let html = '';
    filtered.forEach(m => {
      // Calculate age
      const age = m.birthDate ? window.AppUtils.calculateAge(m.birthDate) : null;
      const ageText = age !== null ? `${age} tuổi` : null;

      // Portion info
      const portionInfo = window.AppUtils.PORTION_SIZES[m.portionSize] || { label: 'Tiêu chuẩn', badgeClass: 'badge-portion-standard' };

      // Calculate meals per week
      let weeklyMeals = 0;
      if (m.mealSchedule) {
        Object.values(m.mealSchedule).forEach(day => {
          if (day.breakfast) weeklyMeals++;
          if (day.lunch) weeklyMeals++;
          if (day.dinner) weeklyMeals++;
        });
      }

      // Dietary tags
      const hasDietary = Array.isArray(m.dietaryRules) && m.dietaryRules.length > 0;
      const dietaryHtml = hasDietary
        ? m.dietaryRules.map(r => `<span class="dietary-rule-tag"><i data-lucide="check"></i> ${window.AppUtils.escapeHtml(r)}</span>`).join('')
        : `<span class="text-muted-xs">Không có kiêng cữ</span>`;

      // Health notes preview (sanitized, truncated)
      const hasHealthNotes = !!(m.healthNotes && m.healthNotes.trim());

      // Initials for avatar
      const nameParts = (m.name || 'T').trim().split(/\s+/);
      const initials = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0].slice(0, 2).toUpperCase();

      html += `
        <div class="member-card" data-member-id="${m.id}">
          <div class="member-card-header">
            <div class="member-avatar">${initials}</div>
            <div class="member-title-block">
              <h3 class="member-name">${window.AppUtils.escapeHtml(m.name)}</h3>
              <div class="member-meta-row">
                ${ageText ? `<span class="member-age-pill"><i data-lucide="cake"></i> ${ageText}</span>` : ''}
                <span class="badge ${portionInfo.badgeClass}">Khẩu phần: ${portionInfo.label}</span>
              </div>
            </div>
          </div>

          <div class="member-card-body">
            <!-- Weekly meal summary -->
            <div class="member-schedule-summary">
              <span class="member-schedule-label"><i data-lucide="calendar"></i> Lịch ăn:</span>
              <span class="member-schedule-value">${weeklyMeals} bữa / tuần</span>
            </div>

            <!-- Dietary rules -->
            <div class="member-dietary-section">
              <div class="member-dietary-title">Chế độ & Kiêng cữ:</div>
              <div class="member-dietary-tags">
                ${dietaryHtml}
              </div>
            </div>

            <!-- Health note preview if any -->
            ${hasHealthNotes ? `
              <div class="member-health-box">
                <i data-lucide="heart-pulse"></i>
                <span>${window.AppUtils.escapeHtml(m.healthNotes)}</span>
              </div>
            ` : ''}
          </div>

          <div class="member-card-footer">
            <button type="button" class="btn btn-outline btn-sm btn-edit-member" data-id="${m.id}">
              <i data-lucide="pencil"></i> Sửa
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-delete-member" data-id="${m.id}" style="color: var(--danger-text);">
              <i data-lucide="trash-2"></i> Xóa
            </button>
          </div>
        </div>
      `;
    });

    membersGrid.innerHTML = html;
    bindCardActions();
    window.AppUtils.initIcons();
  }

  /**
   * Bind edit and delete button events on rendered cards
   */
  function bindCardActions() {
    const editBtns = membersGrid.querySelectorAll('.btn-edit-member');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const member = window.StorageManager.getMemberById(id);
        if (member) openModal(member);
      });
    });

    const deleteBtns = membersGrid.querySelectorAll('.btn-delete-member');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const member = window.StorageManager.getMemberById(id);
        if (!member) return;

        window.AppUtils.showConfirmModal({
          title: 'Xóa thành viên?',
          message: `Bạn có chắc muốn xóa thành viên "${member.name}" khỏi danh sách gia đình? (Lưu ý: Các thực đơn cũ vẫn được bảo lưu an toàn).`,
          confirmText: 'Xóa thành viên',
          confirmVariant: 'btn-danger',
          onConfirm: () => {
            window.StorageManager.deleteMember(id);
            loadMembers();
            window.AppUtils.showToast(`Đã xóa thành viên "${member.name}"`, 'info');
          }
        });
      });
    });
  }

  /**
   * Render Schedule Table (7 rows) inside the modal form
   */
  function renderScheduleTable() {
    if (!scheduleTbody) return;

    let html = '';
    DAYS_ORDER.forEach(day => {
      html += `
        <tr>
          <td class="sched-day-label">${day.label}</td>
          <td class="sched-check-cell">
            <input type="checkbox" id="sched_${day.key}_breakfast" data-day="${day.key}" data-meal="breakfast">
          </td>
          <td class="sched-check-cell">
            <input type="checkbox" id="sched_${day.key}_lunch" data-day="${day.key}" data-meal="lunch">
          </td>
          <td class="sched-check-cell">
            <input type="checkbox" id="sched_${day.key}_dinner" data-day="${day.key}" data-meal="dinner">
          </td>
        </tr>
      `;
    });

    scheduleTbody.innerHTML = html;
  }

  /**
   * Dynamic age preview when birthDate input changes
   */
  function updateAgePreview() {
    if (!inputBirthDate || !agePreview) return;
    const val = inputBirthDate.value;
    const age = window.AppUtils.calculateAge(val);
    if (age !== null) {
      agePreview.textContent = `(${age} tuổi)`;
      agePreview.style.display = 'inline-block';
    } else {
      agePreview.textContent = '';
      agePreview.style.display = 'none';
    }
  }

  /**
   * Dietary rule row helper
   */
  function addDietaryRuleRow(value = '') {
    if (!dietaryContainer) return;
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
      <input type="text" class="form-input dietary-rule-input" placeholder="Ví dụ: Không cay, Hạn chế dầu mỡ..." value="${window.AppUtils.escapeHtml(value)}">
      <button type="button" class="btn btn-ghost btn-icon btn-sm btn-remove-dietary" aria-label="Xóa quy tắc">
        <i data-lucide="trash-2"></i>
      </button>
    `;

    const removeBtn = row.querySelector('.btn-remove-dietary');
    removeBtn.addEventListener('click', () => {
      row.remove();
    });

    dietaryContainer.appendChild(row);
    window.AppUtils.initIcons();
  }

  /**
   * Schedule Table Shortcuts
   */
  function setAllScheduleCheckboxes(checked) {
    if (!scheduleTbody) return;
    const checkboxes = scheduleTbody.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => { cb.checked = checked; });
  }

  function setDinnerOnlySchedule() {
    if (!scheduleTbody) return;
    DAYS_ORDER.forEach(day => {
      const b = document.getElementById(`sched_${day.key}_breakfast`);
      const l = document.getElementById(`sched_${day.key}_lunch`);
      const d = document.getElementById(`sched_${day.key}_dinner`);
      if (b) b.checked = false;
      if (l) l.checked = false;
      if (d) d.checked = true;
    });
  }

  function copyMondayScheduleToWeekdays() {
    const monB = document.getElementById('sched_monday_breakfast')?.checked || false;
    const monL = document.getElementById('sched_monday_lunch')?.checked || false;
    const monD = document.getElementById('sched_monday_dinner')?.checked || false;

    ['tuesday', 'wednesday', 'thursday', 'friday'].forEach(dayKey => {
      const b = document.getElementById(`sched_${dayKey}_breakfast`);
      const l = document.getElementById(`sched_${dayKey}_lunch`);
      const d = document.getElementById(`sched_${dayKey}_dinner`);
      if (b) b.checked = monB;
      if (l) l.checked = monL;
      if (d) d.checked = monD;
    });

    window.AppUtils.showToast('Đã sao chép lịch Thứ Hai sang các ngày trong tuần!', 'info');
  }

  /**
   * Open modal for Add or Edit
   */
  function openModal(member = null) {
    if (!memberModal) return;

    // Reset dietary rows
    if (dietaryContainer) dietaryContainer.innerHTML = '';

    if (member) {
      if (modalTitle) modalTitle.textContent = 'Sửa thông tin thành viên';
      if (inputId) inputId.value = member.id;
      if (inputName) inputName.value = member.name || '';
      if (inputBirthDate) inputBirthDate.value = member.birthDate || '';
      if (selectPortion) selectPortion.value = member.portionSize || 'standard';
      if (textareaHealthNotes) textareaHealthNotes.value = member.healthNotes || '';

      // Populate dietary rules
      if (Array.isArray(member.dietaryRules) && member.dietaryRules.length > 0) {
        member.dietaryRules.forEach(rule => addDietaryRuleRow(rule));
      }

      // Populate schedule checkboxes
      DAYS_ORDER.forEach(day => {
        const daySched = member.mealSchedule?.[day.key] || {};
        const b = document.getElementById(`sched_${day.key}_breakfast`);
        const l = document.getElementById(`sched_${day.key}_lunch`);
        const d = document.getElementById(`sched_${day.key}_dinner`);
        if (b) b.checked = !!daySched.breakfast;
        if (l) l.checked = !!daySched.lunch;
        if (d) d.checked = !!daySched.dinner;
      });
    } else {
      if (modalTitle) modalTitle.textContent = 'Thêm thành viên mới';
      if (inputId) inputId.value = '';
      if (inputName) inputName.value = '';
      if (inputBirthDate) inputBirthDate.value = '';
      if (selectPortion) selectPortion.value = 'standard';
      if (textareaHealthNotes) textareaHealthNotes.value = '';

      // Set standard default schedule for new member
      const defaultSched = window.AppUtils.createDefaultMealSchedule();
      DAYS_ORDER.forEach(day => {
        const daySched = defaultSched[day.key];
        const b = document.getElementById(`sched_${day.key}_breakfast`);
        const l = document.getElementById(`sched_${day.key}_lunch`);
        const d = document.getElementById(`sched_${day.key}_dinner`);
        if (b) b.checked = !!daySched.breakfast;
        if (l) l.checked = !!daySched.lunch;
        if (d) d.checked = !!daySched.dinner;
      });
    }

    updateAgePreview();
    memberModal.classList.add('open');
    window.AppUtils.initIcons();
    if (inputName) inputName.focus();
  }

  function closeModal() {
    if (memberModal) memberModal.classList.remove('open');
  }

  /**
   * Handle form submit
   */
  function handleFormSubmit(e) {
    e.preventDefault();

    const name = (inputName?.value || '').trim();
    if (!name) {
      window.AppUtils.showToast('Vui lòng nhập tên thành viên!', 'error');
      return;
    }

    const birthDate = (inputBirthDate?.value || '').trim();
    const portionSize = selectPortion?.value || 'standard';
    const healthNotes = (textareaHealthNotes?.value || '').trim();

    // Extract dietary rules
    const ruleInputs = dietaryContainer.querySelectorAll('.dietary-rule-input');
    const dietaryRules = Array.from(ruleInputs)
      .map(inp => inp.value.trim())
      .filter(Boolean);

    // Extract meal schedule
    const mealSchedule = {};
    DAYS_ORDER.forEach(day => {
      const b = document.getElementById(`sched_${day.key}_breakfast`)?.checked || false;
      const l = document.getElementById(`sched_${day.key}_lunch`)?.checked || false;
      const d = document.getElementById(`sched_${day.key}_dinner`)?.checked || false;
      mealSchedule[day.key] = { breakfast: b, lunch: l, dinner: d };
    });

    const memberData = {
      name,
      birthDate,
      portionSize,
      dietaryRules,
      healthNotes,
      mealSchedule
    };

    const editId = inputId?.value;
    if (editId) {
      window.StorageManager.updateMember(editId, memberData);
      window.AppUtils.showToast(`Đã cập nhật thành viên "${name}"`, 'success');
    } else {
      window.StorageManager.addMember(memberData);
      window.AppUtils.showToast(`Đã thêm thành viên "${name}" vào gia đình!`, 'success');
    }

    closeModal();
    loadMembers();
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', init);
})(window);
