/**
 * MenuGenerator - Smart weekly menu planner and dish selector
 * Features:
 * - Only enabled dishes
 * - Week diversity (no repetition if pool >= 7)
 * - LRU / Recency weighting (prioritize dishes eaten long ago or not eaten recently)
 * - Respects previous week's menu to reduce immediate repeats
 * - Preserves manually locked or modified dishes
 * - Graceful fallback when dishes are scarce
 * - Single dish swap without touching other days/slots
 */
(function(window) {
  'use strict';

  const DAY_LABELS = [
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
    'Chủ Nhật'
  ];

  class MenuGeneratorService {
    /**
     * Get Monday of the week for any given date
     * Safely parses YYYY-MM-DD strings without timezone shift.
     * @param {Date|string} d
     * @returns {Date} Monday 00:00:00
     */
    getMonday(d) {
      let date;
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
        const parts = d.trim().split('-').map(Number);
        // Noon avoids timezone shifts across days
        date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      } else {
        date = new Date(d);
      }
      const day = date.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      date.setDate(diff);
      date.setHours(0, 0, 0, 0);
      return date;
    }

    /**
     * Format date to YYYY-MM-DD
     */
    formatDateISO(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    /**
     * Format date to DD/MM/YYYY
     */
    formatDateVN(date) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }

    /**
     * Format date to DD/MM
     */
    formatDateShort(date) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}`;
    }

    /**
     * Build week ID based on Monday ISO string (e.g., "2026-09-21")
     */
    getWeekId(mondayDate) {
      return this.formatDateISO(this.getMonday(mondayDate));
    }

    /**
     * Get 7 dates of the week starting from Monday
     */
    getWeekDates(mondayDate) {
      const start = this.getMonday(mondayDate);
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        dates.push(current);
      }
      return dates;
    }

    /**
     * Get previous Monday
     */
    getPreviousMonday(currentMonday) {
      const prev = new Date(this.getMonday(currentMonday));
      prev.setDate(prev.getDate() - 7);
      return prev;
    }

    /**
     * Get next Monday
     */
    getNextMonday(currentMonday) {
      const next = new Date(this.getMonday(currentMonday));
      next.setDate(next.getDate() + 7);
      return next;
    }

    /**
     * Select a dish for a specific slot considering:
     * 1. Category matches and enabled === true
     * 2. Lowest occurrence count in current week (balanced distribution when < 7 dishes)
     * 3. Avoids choosing the same dish as immediately preceding day (previousDayDishId) and next day (nextDayDishId)
     * 4. Prioritizes dishes never eaten or with older lastUsedAt
     * 5. Discourages dishes that appeared in previous week
     * 6. Gentle randomness among top tied candidates
     * 
     * @param {string} category 'main' | 'vegetable' | 'soup' | 'side'
     * @param {Array} allDishes
     * @param {Map<string, number>} currentWeekCountsMap dishId -> count
     * @param {Set<string>} usedInPrevWeekDishIds
     * @param {string|null} excludeDishId Dish currently in this slot (when swapping)
     * @param {string|null} previousDayDishId Dish from yesterday to avoid consecutive repetition
     * @param {string|null} nextDayDishId Dish from tomorrow to avoid consecutive repetition
     * @returns {Object|null} Selected dish
     */
    selectDish(category, allDishes, currentWeekCountsMap = new Map(), usedInPrevWeekDishIds = new Set(), excludeDishId = null, previousDayDishId = null, nextDayDishId = null) {
      const pool = allDishes.filter(d => d.category === category && d.enabled);

      if (pool.length === 0) return null;
      if (pool.length === 1) return pool[0];

      // Exclude specific dish if swapping
      let candidates = pool;
      if (excludeDishId && pool.length > 1) {
        const filtered = pool.filter(d => d.id !== excludeDishId);
        if (filtered.length > 0) candidates = filtered;
      }

      // Helper to get count in current week
      const getCount = (id) => (currentWeekCountsMap && currentWeekCountsMap.get(id)) || 0;

      // Rule 1: Find candidates with the LOWEST occurrence count in current week
      const minCount = Math.min(...candidates.map(d => getCount(d.id)));
      let bestPool = candidates.filter(d => getCount(d.id) === minCount);

      // Rule 2: Avoid both previousDayDishId AND nextDayDishId
      const withoutBoth = bestPool.filter(d => d.id !== previousDayDishId && d.id !== nextDayDishId);
      if (withoutBoth.length > 0) {
        bestPool = withoutBoth;
      } else {
        // If bestPool cannot avoid both, check if candidates with count <= minCount + 1 can avoid both
        const altWithoutBoth = candidates.filter(d => d.id !== previousDayDishId && d.id !== nextDayDishId && getCount(d.id) <= minCount + 1);
        if (altWithoutBoth.length > 0) {
          bestPool = altWithoutBoth;
        } else {
          // Priority: avoid previousDayDishId first, then nextDayDishId
          const withoutPrev = bestPool.filter(d => d.id !== previousDayDishId);
          if (withoutPrev.length > 0) {
            bestPool = withoutPrev;
          } else {
            const withoutNext = bestPool.filter(d => d.id !== nextDayDishId);
            if (withoutNext.length > 0) {
              bestPool = withoutNext;
            }
          }
        }
      }

      // Rule 3: Rank remaining candidates by recency (lastUsedAt), previous week penalty, gentle randomness
      const scored = bestPool.map(dish => {
        let score = Math.random() * 5; // gentle randomness to avoid rigid ordering

        // If never used, give high boost
        if (!dish.lastUsedAt) {
          score += 100;
        } else {
          // Days since last used
          const daysAgo = (Date.now() - dish.lastUsedAt) / (1000 * 60 * 60 * 24);
          score += Math.min(daysAgo * 5, 80);
        }

        // Moderate penalty if used in previous week
        if (usedInPrevWeekDishIds && usedInPrevWeekDishIds.has(dish.id)) {
          score -= 30;
        }

        return { dish, score };
      });

      scored.sort((a, b) => b.score - a.score);

      // Pick top scored dish (or randomly between top 2 if tied closely)
      const topScore = scored[0].score;
      const topTied = scored.filter(s => topScore - s.score < 2);
      const picked = topTied[Math.floor(Math.random() * topTied.length)].dish;

      return picked;
    }

    /**
     * Generate full 7-day weekly menu
     * Preserves:
     * 1. Any day marked as isEaten === true (historical/finalized day - never overwritten)
     * 2. Any dish slot marked as manual === true in uneaten days
     * 
     * @param {Date|string} mondayDate 
     * @param {Array} allDishes 
     * @param {Object|null} existingMenu
     * @param {Object|null} prevWeekMenu
     * @param {Array|null} allMembers
     * @returns {Object} Complete week menu object
     */
    generateWeeklyMenu(mondayDate, allDishes, existingMenu = null, prevWeekMenu = null, allMembers = null) {
      const monday = this.getMonday(mondayDate);
      const weekId = this.getWeekId(monday);
      const weekDates = this.getWeekDates(monday);

      const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      // Fetch or use provided members list
      let members = allMembers;
      if (!Array.isArray(members)) {
        if (typeof window !== 'undefined' && window.StorageManager && typeof window.StorageManager.getMembers === 'function') {
          members = window.StorageManager.getMembers();
        } else {
          members = [];
        }
      }

      // Track dishes used in previous week
      const usedInPrevWeek = new Set();
      if (prevWeekMenu && Array.isArray(prevWeekMenu.days)) {
        prevWeekMenu.days.forEach(day => {
          if (day.main && day.main.id) usedInPrevWeek.add(day.main.id);
          if (day.vegetable && day.vegetable.id) usedInPrevWeek.add(day.vegetable.id);
          if (day.soup && day.soup.id) usedInPrevWeek.add(day.soup.id);
        });
      }

      // Track dish occurrence counts in current week
      const currentWeekMainsCount = new Map();
      const currentWeekVegsCount = new Map();
      const currentWeekSoupsCount = new Map();

      // First pass: collect manual/locked dishes OR finalized eaten days from existing menu
      const preservedDays = [];
      for (let i = 0; i < 7; i++) {
        const existingDay = existingMenu && existingMenu.days ? existingMenu.days[i] : null;
        preservedDays.push(existingDay);

        if (existingDay) {
          const isEatenDay = !!existingDay.isEaten;
          if (existingDay.main && (existingDay.main.manual || isEatenDay) && existingDay.main.id) {
            currentWeekMainsCount.set(existingDay.main.id, (currentWeekMainsCount.get(existingDay.main.id) || 0) + 1);
          }
          if (existingDay.vegetable && (existingDay.vegetable.manual || isEatenDay) && existingDay.vegetable.id) {
            currentWeekVegsCount.set(existingDay.vegetable.id, (currentWeekVegsCount.get(existingDay.vegetable.id) || 0) + 1);
          }
          if (existingDay.soup && (existingDay.soup.manual || isEatenDay) && existingDay.soup.id) {
            currentWeekSoupsCount.set(existingDay.soup.id, (currentWeekSoupsCount.get(existingDay.soup.id) || 0) + 1);
          }
        }
      }

      const days = [];
      let prevMainId = null;
      let prevVegId = null;
      let prevSoupId = null;

      for (let i = 0; i < 7; i++) {
        const currentDate = weekDates[i];
        const dateISO = this.formatDateISO(currentDate);
        const dayLabel = DAY_LABELS[i];
        const dayKey = DAY_KEYS[i];
        const existingDay = preservedDays[i];
        const isEatenDay = existingDay ? !!existingDay.isEaten : false;

        // Compute default attendance snapshot for this day from current member schedules
        const defaultDayAttendance = {
          breakfast: {
            memberIds: members.filter(m => m && m.mealSchedule && m.mealSchedule[dayKey] && m.mealSchedule[dayKey].breakfast).map(m => m.id),
            manualOverride: false
          },
          lunch: {
            memberIds: members.filter(m => m && m.mealSchedule && m.mealSchedule[dayKey] && m.mealSchedule[dayKey].lunch).map(m => m.id),
            manualOverride: false
          },
          dinner: {
            memberIds: members.filter(m => m && m.mealSchedule && m.mealSchedule[dayKey] && m.mealSchedule[dayKey].dinner).map(m => m.id),
            manualOverride: false
          }
        };

        // CRITICAL: Eaten days are historical/finalized. Preserve entire day and attendance!
        if (isEatenDay) {
          const eatenAttendance = (existingDay && existingDay.attendance) ? {
            breakfast: {
              memberIds: Array.isArray(existingDay.attendance.breakfast?.memberIds) ? [...existingDay.attendance.breakfast.memberIds] : [...defaultDayAttendance.breakfast.memberIds],
              manualOverride: !!existingDay.attendance.breakfast?.manualOverride
            },
            lunch: {
              memberIds: Array.isArray(existingDay.attendance.lunch?.memberIds) ? [...existingDay.attendance.lunch.memberIds] : [...defaultDayAttendance.lunch.memberIds],
              manualOverride: !!existingDay.attendance.lunch?.manualOverride
            },
            dinner: {
              memberIds: Array.isArray(existingDay.attendance.dinner?.memberIds) ? [...existingDay.attendance.dinner.memberIds] : [...defaultDayAttendance.dinner.memberIds],
              manualOverride: !!existingDay.attendance.dinner?.manualOverride
            }
          } : defaultDayAttendance;

          days.push({
            date: dateISO,
            dayIndex: i,
            dayLabel: dayLabel,
            isEaten: true,
            main: existingDay.main,
            vegetable: existingDay.vegetable,
            soup: existingDay.soup,
            side: existingDay.side,
            attendance: eatenAttendance
          });
          prevMainId = existingDay.main ? existingDay.main.id : null;
          prevVegId = existingDay.vegetable ? existingDay.vegetable.id : null;
          prevSoupId = existingDay.soup ? existingDay.soup.id : null;
          continue;
        }

        // Look ahead: check if next day is already preserved (eaten or manual)
        const nextPreserved = preservedDays[i + 1];
        const nextMainId = nextPreserved && nextPreserved.main && (nextPreserved.main.manual || nextPreserved.isEaten) ? nextPreserved.main.id : null;
        const nextVegId = nextPreserved && nextPreserved.vegetable && (nextPreserved.vegetable.manual || nextPreserved.isEaten) ? nextPreserved.vegetable.id : null;
        const nextSoupId = nextPreserved && nextPreserved.soup && (nextPreserved.soup.manual || nextPreserved.isEaten) ? nextPreserved.soup.id : null;

        // 1. Main Dish
        let mainDish = null;
        if (existingDay && existingDay.main && existingDay.main.manual) {
          mainDish = existingDay.main;
          prevMainId = existingDay.main.id;
        } else {
          const pickedMain = this.selectDish('main', allDishes, currentWeekMainsCount, usedInPrevWeek, null, prevMainId, nextMainId);
          if (pickedMain) {
            mainDish = {
              id: pickedMain.id,
              name: pickedMain.name,
              category: 'main',
              manual: false
            };
            currentWeekMainsCount.set(pickedMain.id, (currentWeekMainsCount.get(pickedMain.id) || 0) + 1);
            prevMainId = pickedMain.id;
          }
        }

        // 2. Vegetable
        let vegDish = null;
        if (existingDay && existingDay.vegetable && existingDay.vegetable.manual) {
          vegDish = existingDay.vegetable;
          prevVegId = existingDay.vegetable.id;
        } else {
          const pickedVeg = this.selectDish('vegetable', allDishes, currentWeekVegsCount, usedInPrevWeek, null, prevVegId, nextVegId);
          if (pickedVeg) {
            vegDish = {
              id: pickedVeg.id,
              name: pickedVeg.name,
              category: 'vegetable',
              manual: false
            };
            currentWeekVegsCount.set(pickedVeg.id, (currentWeekVegsCount.get(pickedVeg.id) || 0) + 1);
            prevVegId = pickedVeg.id;
          }
        }

        // 3. Soup
        let soupDish = null;
        if (existingDay && existingDay.soup && existingDay.soup.manual) {
          soupDish = existingDay.soup;
          prevSoupId = existingDay.soup.id;
        } else {
          const pickedSoup = this.selectDish('soup', allDishes, currentWeekSoupsCount, usedInPrevWeek, null, prevSoupId, nextSoupId);
          if (pickedSoup) {
            soupDish = {
              id: pickedSoup.id,
              name: pickedSoup.name,
              category: 'soup',
              manual: false
            };
            currentWeekSoupsCount.set(pickedSoup.id, (currentWeekSoupsCount.get(pickedSoup.id) || 0) + 1);
            prevSoupId = pickedSoup.id;
          }
        }

        // 4. Side dish (optional: keep if existing, else null)
        const sideDish = existingDay && existingDay.side ? existingDay.side : null;

        // Attendance snapshot: preserve meals that were manually overridden in existing menu
        const dayAttendance = {
          breakfast: (existingDay && existingDay.attendance?.breakfast?.manualOverride)
            ? { memberIds: [...existingDay.attendance.breakfast.memberIds], manualOverride: true }
            : defaultDayAttendance.breakfast,
          lunch: (existingDay && existingDay.attendance?.lunch?.manualOverride)
            ? { memberIds: [...existingDay.attendance.lunch.memberIds], manualOverride: true }
            : defaultDayAttendance.lunch,
          dinner: (existingDay && existingDay.attendance?.dinner?.manualOverride)
            ? { memberIds: [...existingDay.attendance.dinner.memberIds], manualOverride: true }
            : defaultDayAttendance.dinner
        };

        days.push({
          date: dateISO,
          dayIndex: i,
          dayLabel: dayLabel,
          isEaten: false,
          main: mainDish,
          vegetable: vegDish,
          soup: soupDish,
          side: sideDish,
          attendance: dayAttendance
        });
      }

      return {
        weekId: weekId,
        startDate: this.formatDateISO(weekDates[0]),
        endDate: this.formatDateISO(weekDates[6]),
        days: days,
        createdAt: existingMenu && existingMenu.createdAt ? existingMenu.createdAt : Date.now(),
        updatedAt: Date.now()
      };
    }

    /**
     * Swap a single dish slot for a day
     * Detects whether an alternative dish actually exists and changed.
     * Avoids choosing the dish of the previous day AND next day if possible.
     * 
     * @param {Object} weekMenu 
     * @param {number} dayIndex (0 - 6)
     * @param {string} slotKey ('main' | 'vegetable' | 'soup' | 'side')
     * @param {Array} allDishes 
     * @returns {Object} Result with { changed: boolean, newDish: Object|null, weekMenu: Object, ... }
     */
    swapSingleDish(weekMenu, dayIndex, slotKey, allDishes) {
      if (!weekMenu || !weekMenu.days || !weekMenu.days[dayIndex]) {
        return { changed: false, reason: 'invalid_menu', weekMenu, days: weekMenu ? weekMenu.days : [] };
      }

      const currentDay = weekMenu.days[dayIndex];
      const currentDish = currentDay[slotKey];
      const excludeDishId = currentDish ? currentDish.id : null;

      const enabledPool = allDishes.filter(d => d.category === slotKey && d.enabled);
      if (enabledPool.length === 0) {
        return { changed: false, reason: 'no_enabled_dishes', newDish: null, weekMenu, days: weekMenu.days, weekId: weekMenu.weekId };
      }

      if (enabledPool.length === 1 && currentDish && enabledPool[0].id === currentDish.id) {
        return { changed: false, reason: 'no_alternative', newDish: null, weekMenu, days: weekMenu.days, weekId: weekMenu.weekId };
      }

      // Dishes of this slot's category used in OTHER days of current week
      const currentWeekCounts = new Map();
      weekMenu.days.forEach((day, idx) => {
        if (idx !== dayIndex && day[slotKey] && day[slotKey].id) {
          const id = day[slotKey].id;
          currentWeekCounts.set(id, (currentWeekCounts.get(id) || 0) + 1);
        }
      });

      // Avoid previous day dish AND next day dish
      const prevDayDishId = dayIndex > 0 && weekMenu.days[dayIndex - 1][slotKey] ? weekMenu.days[dayIndex - 1][slotKey].id : null;
      const nextDayDishId = dayIndex < weekMenu.days.length - 1 && weekMenu.days[dayIndex + 1][slotKey] ? weekMenu.days[dayIndex + 1][slotKey].id : null;

      const newDish = this.selectDish(slotKey, allDishes, currentWeekCounts, new Set(), excludeDishId, prevDayDishId, nextDayDishId);

      if (!newDish || (currentDish && newDish.id === currentDish.id)) {
        return { changed: false, reason: 'no_alternative', newDish: null, weekMenu, days: weekMenu.days, weekId: weekMenu.weekId };
      }

      currentDay[slotKey] = {
        id: newDish.id,
        name: newDish.name,
        category: slotKey,
        manual: false
      };

      weekMenu.updatedAt = Date.now();
      return {
        changed: true,
        newDish,
        weekMenu,
        days: weekMenu.days,
        weekId: weekMenu.weekId,
        startDate: weekMenu.startDate,
        endDate: weekMenu.endDate,
        updatedAt: weekMenu.updatedAt
      };
    }

    /**
     * Manually set a dish in a slot (locks it)
     */
    setManualDish(weekMenu, dayIndex, slotKey, dish) {
      if (!weekMenu || !weekMenu.days || !weekMenu.days[dayIndex]) return weekMenu;

      if (!dish) {
        weekMenu.days[dayIndex][slotKey] = null;
      } else {
        weekMenu.days[dayIndex][slotKey] = {
          id: dish.id || ('manual_' + Date.now()),
          name: dish.name,
          category: slotKey,
          manual: true
        };
      }

      weekMenu.updatedAt = Date.now();
      return weekMenu;
    }

    /**
     * Toggle "isEaten" for a day
     */
    toggleEatenDay(weekMenu, dayIndex) {
      if (!weekMenu || !weekMenu.days || !weekMenu.days[dayIndex]) return weekMenu;
      weekMenu.days[dayIndex].isEaten = !weekMenu.days[dayIndex].isEaten;
      weekMenu.updatedAt = Date.now();
      return weekMenu;
    }

    /**
     * Build default attendance for a specific day index from members
     * @param {number} dayIndex (0 - 6)
     * @param {Array} members
     * @returns {Object} attendance object
     */
    buildDefaultDayAttendance(dayIndex, members = []) {
      const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayKey = DAY_KEYS[dayIndex] || 'monday';
      const safeMembers = Array.isArray(members) ? members : [];

      return {
        breakfast: {
          memberIds: safeMembers.filter(m => m && m.mealSchedule && m.mealSchedule[dayKey] && m.mealSchedule[dayKey].breakfast).map(m => m.id),
          manualOverride: false
        },
        lunch: {
          memberIds: safeMembers.filter(m => m && m.mealSchedule && m.mealSchedule[dayKey] && m.mealSchedule[dayKey].lunch).map(m => m.id),
          manualOverride: false
        },
        dinner: {
          memberIds: safeMembers.filter(m => m && m.mealSchedule && m.mealSchedule[dayKey] && m.mealSchedule[dayKey].dinner).map(m => m.id),
          manualOverride: false
        }
      };
    }

    /**
     * Update attendance for a single meal slot in a day
     * @param {Object} weekMenu
     * @param {number} dayIndex (0 - 6)
     * @param {string} mealKey 'breakfast' | 'lunch' | 'dinner'
     * @param {Array<string>} memberIds
     * @param {boolean} manualOverride
     * @returns {Object} Updated weekMenu
     */
    updateMealAttendance(weekMenu, dayIndex, mealKey, memberIds, manualOverride = true) {
      if (!weekMenu || !weekMenu.days || !weekMenu.days[dayIndex]) return weekMenu;
      const day = weekMenu.days[dayIndex];
      if (!day.attendance) {
        day.attendance = this.buildDefaultDayAttendance(dayIndex, []);
      }
      day.attendance[mealKey] = {
        memberIds: Array.isArray(memberIds) ? [...memberIds] : [],
        manualOverride: typeof manualOverride === 'boolean' ? manualOverride : true
      };
      weekMenu.updatedAt = Date.now();
      return weekMenu;
    }

    /**
     * Reset a meal slot attendance back to current member schedule template
     * @param {Object} weekMenu
     * @param {number} dayIndex (0 - 6)
     * @param {string} mealKey 'breakfast' | 'lunch' | 'dinner'
     * @param {Array} members
     * @returns {Object} Updated weekMenu
     */
    resetMealAttendanceToDefault(weekMenu, dayIndex, mealKey, members = []) {
      if (!weekMenu || !weekMenu.days || !weekMenu.days[dayIndex]) return weekMenu;
      const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayKey = DAY_KEYS[dayIndex] || 'monday';
      const safeMembers = Array.isArray(members) ? members : [];

      const defaultMemberIds = safeMembers
        .filter(m => m && m.mealSchedule && m.mealSchedule[dayKey] && m.mealSchedule[dayKey][mealKey])
        .map(m => m.id);

      return this.updateMealAttendance(weekMenu, dayIndex, mealKey, defaultMemberIds, false);
    }
  }

  // Export singleton instance
  window.MenuGenerator = new MenuGeneratorService();
})(window);
