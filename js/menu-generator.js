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
    /**
     * Select a dish for a specific slot considering:
     * 1. Category matches, enabled === true, and mealType matches
     * 2. Lowest occurrence count in current week (balanced distribution when < 7 dishes)
     * 3. Avoids choosing the same dish as immediately preceding day (previousDayDishId) and next day (nextDayDishId)
     * 4. Prioritizes dishes never eaten or with older lastUsedAt
     * 5. Discourages dishes that appeared in previous week
     * 6. Gentle randomness among top tied candidates
     * 
     * @param {string} category 'main' | 'vegetable' | 'soup' | 'side' | 'single'
     * @param {Array} allDishes
     * @param {Map<string, number>} currentWeekCountsMap dishId -> count
     * @param {Set<string>} usedInPrevWeekDishIds
     * @param {string|null} excludeDishId Dish currently in this slot (when swapping)
     * @param {string|null} previousDayDishId Dish from yesterday to avoid consecutive repetition
     * @param {string|null} nextDayDishId Dish from tomorrow to avoid consecutive repetition
     * @param {string|null} mealType 'breakfast' | 'lunch' | 'dinner' | null
     * @returns {Object|null} Selected dish
     */
    selectDish(category, allDishes, currentWeekCountsMap = new Map(), usedInPrevWeekDishIds = new Set(), excludeDishId = null, previousDayDishId = null, nextDayDishId = null, mealType = null) {
      if (!Array.isArray(allDishes) || allDishes.length === 0) return null;

      const hasMealType = (d, mType) => {
        if (!mType) return true;
        if (Array.isArray(d.mealTypes) && d.mealTypes.length > 0) {
          return d.mealTypes.includes(mType);
        }
        if (d.category === 'single') return mType === 'breakfast';
        return mType === 'lunch' || mType === 'dinner';
      };

      let pool = [];
      if (category === 'single') {
        // Priority for breakfast/single: dishes with category === 'single'
        pool = allDishes.filter(d => d.enabled && hasMealType(d, mealType || 'breakfast') && d.category === 'single');
        // Fallback: if no single category dish, allow other dishes that support this mealType
        if (pool.length === 0) {
          pool = allDishes.filter(d => d.enabled && hasMealType(d, mealType || 'breakfast'));
        }
      } else {
        pool = allDishes.filter(d => d.category === category && d.enabled && hasMealType(d, mealType));
      }

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
     * Generate full 7-day weekly menu with 3 meals per day: breakfast, lunch, dinner
     * Preserves:
     * 1. Any meal marked as isEaten === true (historical/finalized meal - never overwritten)
     * 2. Any dish slot marked as manual === true in uneaten meals
     * 3. Any meal attendance with manualOverride === true
     * 4. If meal attendance = 0 people -> no dishes generated (null)
     * 
     * @param {Date|string} mondayDate 
     * @param {Array} allDishes 
     * @param {Object|null} existingMenu
     * @param {Object|null} prevWeekMenu
     * @param {Array|null} allMembers
     * @returns {Object} Complete week menu object
     */
    generateWeeklyMenu(mondayDate, allDishes, existingMenu = null, prevWeekMenu = null, allMembers = null, options = {}) {
      const monday = this.getMonday(mondayDate);
      const weekId = this.getWeekId(monday);
      const weekDates = this.getWeekDates(monday);

      const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      // Fetch or use provided members list
      let members = allMembers;
      const membersExplicitlyProvided = Array.isArray(allMembers);

      if (!membersExplicitlyProvided) {
        if (typeof window !== 'undefined' && window.StorageManager && typeof window.StorageManager.getMembers === 'function') {
          members = window.StorageManager.getMembers();
        } else {
          members = [];
        }
      }

      // Test 17: If members array is explicitly empty or requireMembers is set:
      // Refuse to generate menu and return reason: 'no_members'
      if (Array.isArray(members) && members.length === 0) {
        if (membersExplicitlyProvided || (options && options.requireMembers)) {
          return {
            generated: false,
            reason: 'no_members',
            error: 'no_members',
            weekId: weekId,
            startDate: this.formatDateISO(weekDates[0]),
            endDate: this.formatDateISO(weekDates[6]),
            days: []
          };
        }
      }

      // Track dishes used in previous week
      const usedInPrevWeek = new Set();
      if (prevWeekMenu && Array.isArray(prevWeekMenu.days)) {
        prevWeekMenu.days.forEach(day => {
          if (day.meals) {
            if (day.meals.breakfast?.single?.id) usedInPrevWeek.add(day.meals.breakfast.single.id);
            ['lunch', 'dinner'].forEach(mKey => {
              const m = day.meals[mKey];
              if (m?.main?.id) usedInPrevWeek.add(m.main.id);
              if (m?.vegetable?.id) usedInPrevWeek.add(m.vegetable.id);
              if (m?.soup?.id) usedInPrevWeek.add(m.soup.id);
            });
          } else {
            if (day.main && day.main.id) usedInPrevWeek.add(day.main.id);
            if (day.vegetable && day.vegetable.id) usedInPrevWeek.add(day.vegetable.id);
            if (day.soup && day.soup.id) usedInPrevWeek.add(day.soup.id);
          }
        });
      }

      // Track dish occurrence counts in current week
      const currentWeekBreakfastCount = new Map();
      const currentWeekMainsCount = new Map();
      const currentWeekVegsCount = new Map();
      const currentWeekSoupsCount = new Map();

      // First pass: collect manual/locked dishes OR finalized eaten meals from existing menu
      const preservedDays = [];
      for (let i = 0; i < 7; i++) {
        const existingDay = existingMenu && existingMenu.days ? existingMenu.days[i] : null;
        preservedDays.push(existingDay);

        if (existingDay) {
          const meals = existingDay.meals;
          if (meals) {
            // Breakfast
            const b = meals.breakfast;
            if (b && (b.isEaten || b.single?.manual) && b.single?.id) {
              currentWeekBreakfastCount.set(b.single.id, (currentWeekBreakfastCount.get(b.single.id) || 0) + 1);
            }
            // Lunch & Dinner
            ['lunch', 'dinner'].forEach(mKey => {
              const m = meals[mKey];
              if (m) {
                const isEatenMeal = !!(m.isEaten || (mKey === 'dinner' && existingDay.isEaten));
                if (m.main && (m.main.manual || isEatenMeal) && m.main.id) {
                  currentWeekMainsCount.set(m.main.id, (currentWeekMainsCount.get(m.main.id) || 0) + 1);
                }
                if (m.vegetable && (m.vegetable.manual || isEatenMeal) && m.vegetable.id) {
                  currentWeekVegsCount.set(m.vegetable.id, (currentWeekVegsCount.get(m.vegetable.id) || 0) + 1);
                }
                if (m.soup && (m.soup.manual || isEatenMeal) && m.soup.id) {
                  currentWeekSoupsCount.set(m.soup.id, (currentWeekSoupsCount.get(m.soup.id) || 0) + 1);
                }
              }
            });
          } else {
            // Legacy day
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
      }

      const days = [];
      let prevBreakfastId = null;
      let prevDinnerMainId = null;
      let prevDinnerVegId = null;
      let prevDinnerSoupId = null;
      let prevLunchMainId = null;
      let prevLunchVegId = null;
      let prevLunchSoupId = null;

      for (let i = 0; i < 7; i++) {
        const currentDate = weekDates[i];
        const dateISO = this.formatDateISO(currentDate);
        const dayLabel = DAY_LABELS[i];
        const dayKey = DAY_KEYS[i];
        const existingDay = preservedDays[i];
        const existingMeals = existingDay?.meals;

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

        // Determine snapshot attendance for each meal (preserves manual overrides and historical eaten state)
        const getMealAttendance = (mKey) => {
          const existingAtt = existingMeals?.[mKey]?.attendance || existingDay?.attendance?.[mKey];
          const isMealEaten = !!(existingMeals?.[mKey]?.isEaten || (mKey === 'dinner' && existingDay?.isEaten));

          // 1. If meal was already eaten in the past:
          // Strictly preserve historical attendance snapshot (do NOT assign current members to historical eaten meals!)
          if (isMealEaten) {
            return {
              memberIds: Array.isArray(existingAtt?.memberIds) ? [...existingAtt.memberIds] : [],
              manualOverride: !!existingAtt?.manualOverride,
              attendanceStatus: existingAtt?.attendanceStatus || (existingAtt?.memberIds?.length > 0 ? 'known' : 'unknown')
            };
          }

          // 2. If uneaten meal has a manual override: preserve that override
          if (existingAtt && existingAtt.manualOverride) {
            return {
              memberIds: Array.isArray(existingAtt.memberIds) ? [...existingAtt.memberIds] : [],
              manualOverride: true,
              attendanceStatus: existingAtt.memberIds.length > 0 ? 'known' : 'none'
            };
          }

          // 3. Otherwise (current/future uneaten meal without manual override):
          // Snapshot attendance from current member schedule template (Section 3: repair legacy future meal)
          const def = defaultDayAttendance[mKey];
          return {
            memberIds: [...def.memberIds],
            manualOverride: false,
            attendanceStatus: def.memberIds.length > 0 ? 'known' : 'none'
          };
        };

        const bAttendance = getMealAttendance('breakfast');
        const lAttendance = getMealAttendance('lunch');
        const dAttendance = getMealAttendance('dinner');

        // Helper to check if a meal has attendance (if no members are defined at all, fallback to dinner only for V1 compatibility)
        const hasMealAttendance = (att, mKey) => {
          if (members.length === 0) {
            return mKey === 'dinner';
          }
          return Array.isArray(att?.memberIds) && att.memberIds.length > 0;
        };

        // Check lookahead preserved dishes for dinner
        const nextPreserved = preservedDays[i + 1];
        const nextDinnerMainId = nextPreserved?.meals?.dinner?.main?.id || nextPreserved?.main?.id || null;
        const nextDinnerVegId = nextPreserved?.meals?.dinner?.vegetable?.id || nextPreserved?.vegetable?.id || null;
        const nextDinnerSoupId = nextPreserved?.meals?.dinner?.soup?.id || nextPreserved?.soup?.id || null;

        // --- 1. BREAKFAST GENERATION ---
        let breakfastMeal = null;
        const existingB = existingMeals?.breakfast;
        const isBEaten = existingB ? !!existingB.isEaten : false;

        if (isBEaten && existingB?.single) {
          // Eaten breakfast -> preserve completely
          breakfastMeal = {
            type: 'single',
            single: existingB.single,
            attendance: bAttendance,
            isEaten: true
          };
          prevBreakfastId = existingB.single.id;
        } else if (!hasMealAttendance(bAttendance, 'breakfast')) {
          // No attendance in uneaten meal -> clear auto dishes
          breakfastMeal = {
            type: 'single',
            single: null,
            attendance: bAttendance,
            isEaten: false
          };
        } else if (existingB?.single?.manual) {
          // Manual dish in breakfast
          breakfastMeal = {
            type: 'single',
            single: existingB.single,
            attendance: bAttendance,
            isEaten: false
          };
          prevBreakfastId = existingB.single.id;
        } else {
          // Generate breakfast dish
          const pickedB = this.selectDish('single', allDishes, currentWeekBreakfastCount, usedInPrevWeek, null, prevBreakfastId, null, 'breakfast');
          let singleDish = null;
          if (pickedB) {
            singleDish = {
              id: pickedB.id,
              name: pickedB.name,
              category: pickedB.category,
              manual: false
            };
            currentWeekBreakfastCount.set(pickedB.id, (currentWeekBreakfastCount.get(pickedB.id) || 0) + 1);
            prevBreakfastId = pickedB.id;
          }
          breakfastMeal = {
            type: 'single',
            single: singleDish,
            attendance: bAttendance,
            isEaten: false
          };
        }

        // --- 2. LUNCH GENERATION ---
        let lunchMeal = null;
        const existingL = existingMeals?.lunch;
        const isLEaten = existingL ? !!existingL.isEaten : false;

        if (isLEaten && (existingL?.main || existingL?.vegetable || existingL?.soup)) {
          // Eaten lunch -> preserve completely
          lunchMeal = {
            type: 'family',
            main: existingL.main,
            vegetable: existingL.vegetable,
            soup: existingL.soup,
            side: existingL.side || null,
            attendance: lAttendance,
            isEaten: true
          };
          prevLunchMainId = existingL.main?.id || null;
          prevLunchVegId = existingL.vegetable?.id || null;
          prevLunchSoupId = existingL.soup?.id || null;
        } else if (!hasMealAttendance(lAttendance, 'lunch')) {
          // No attendance in uneaten lunch -> clear auto dishes
          lunchMeal = {
            type: 'family',
            main: null,
            vegetable: null,
            soup: null,
            side: null,
            attendance: lAttendance,
            isEaten: false
          };
        } else {
          // Generate or preserve manual slots for lunch
          let lMain = null;
          if (existingL?.main?.manual) {
            lMain = existingL.main;
            prevLunchMainId = existingL.main.id;
          } else {
            const picked = this.selectDish('main', allDishes, currentWeekMainsCount, usedInPrevWeek, null, prevLunchMainId, null, 'lunch');
            if (picked) {
              lMain = { id: picked.id, name: picked.name, category: 'main', manual: false };
              currentWeekMainsCount.set(picked.id, (currentWeekMainsCount.get(picked.id) || 0) + 1);
              prevLunchMainId = picked.id;
            }
          }

          let lVeg = null;
          if (existingL?.vegetable?.manual) {
            lVeg = existingL.vegetable;
            prevLunchVegId = existingL.vegetable.id;
          } else {
            const picked = this.selectDish('vegetable', allDishes, currentWeekVegsCount, usedInPrevWeek, null, prevLunchVegId, null, 'lunch');
            if (picked) {
              lVeg = { id: picked.id, name: picked.name, category: 'vegetable', manual: false };
              currentWeekVegsCount.set(picked.id, (currentWeekVegsCount.get(picked.id) || 0) + 1);
              prevLunchVegId = picked.id;
            }
          }

          let lSoup = null;
          if (existingL?.soup?.manual) {
            lSoup = existingL.soup;
            prevLunchSoupId = existingL.soup.id;
          } else {
            const picked = this.selectDish('soup', allDishes, currentWeekSoupsCount, usedInPrevWeek, null, prevLunchSoupId, null, 'lunch');
            if (picked) {
              lSoup = { id: picked.id, name: picked.name, category: 'soup', manual: false };
              currentWeekSoupsCount.set(picked.id, (currentWeekSoupsCount.get(picked.id) || 0) + 1);
              prevLunchSoupId = picked.id;
            }
          }

          lunchMeal = {
            type: 'family',
            main: lMain,
            vegetable: lVeg,
            soup: lSoup,
            side: existingL?.side || null,
            attendance: lAttendance,
            isEaten: false
          };
        }

        // --- 3. DINNER GENERATION ---
        let dinnerMeal = null;
        const existingD = existingMeals?.dinner || existingDay;
        const isDEaten = !!(existingMeals?.dinner?.isEaten || existingDay?.isEaten);

        if (isDEaten && (existingD?.main || existingD?.vegetable || existingD?.soup)) {
          // Eaten dinner -> preserve completely
          dinnerMeal = {
            type: 'family',
            main: existingD.main,
            vegetable: existingD.vegetable,
            soup: existingD.soup,
            side: existingD.side || null,
            attendance: dAttendance,
            isEaten: true
          };
          prevDinnerMainId = existingD.main?.id || null;
          prevDinnerVegId = existingD.vegetable?.id || null;
          prevDinnerSoupId = existingD.soup?.id || null;
        } else if (!hasMealAttendance(dAttendance, 'dinner')) {
          // No attendance in uneaten dinner -> clear auto dishes
          dinnerMeal = {
            type: 'family',
            main: null,
            vegetable: null,
            soup: null,
            side: null,
            attendance: dAttendance,
            isEaten: false
          };
        } else {
          // Generate or preserve manual slots for dinner
          let dMain = null;
          if (existingD?.main?.manual) {
            dMain = existingD.main;
            prevDinnerMainId = existingD.main.id;
          } else {
            const picked = this.selectDish('main', allDishes, currentWeekMainsCount, usedInPrevWeek, null, prevDinnerMainId, nextDinnerMainId, 'dinner');
            if (picked) {
              dMain = { id: picked.id, name: picked.name, category: 'main', manual: false };
              currentWeekMainsCount.set(picked.id, (currentWeekMainsCount.get(picked.id) || 0) + 1);
              prevDinnerMainId = picked.id;
            }
          }

          let dVeg = null;
          if (existingD?.vegetable?.manual) {
            dVeg = existingD.vegetable;
            prevDinnerVegId = existingD.vegetable.id;
          } else {
            const picked = this.selectDish('vegetable', allDishes, currentWeekVegsCount, usedInPrevWeek, null, prevDinnerVegId, nextDinnerVegId, 'dinner');
            if (picked) {
              dVeg = { id: picked.id, name: picked.name, category: 'vegetable', manual: false };
              currentWeekVegsCount.set(picked.id, (currentWeekVegsCount.get(picked.id) || 0) + 1);
              prevDinnerVegId = picked.id;
            }
          }

          let dSoup = null;
          if (existingD?.soup?.manual) {
            dSoup = existingD.soup;
            prevDinnerSoupId = existingD.soup.id;
          } else {
            const picked = this.selectDish('soup', allDishes, currentWeekSoupsCount, usedInPrevWeek, null, prevDinnerSoupId, nextDinnerSoupId, 'dinner');
            if (picked) {
              dSoup = { id: picked.id, name: picked.name, category: 'soup', manual: false };
              currentWeekSoupsCount.set(picked.id, (currentWeekSoupsCount.get(picked.id) || 0) + 1);
              prevDinnerSoupId = picked.id;
            }
          }

          dinnerMeal = {
            type: 'family',
            main: dMain,
            vegetable: dVeg,
            soup: dSoup,
            side: existingD?.side || null,
            attendance: dAttendance,
            isEaten: false
          };
        }

        // Assemble day with meals and top-level backward compatible aliases
        days.push({
          date: dateISO,
          dayIndex: i,
          dayLabel: dayLabel,
          meals: {
            breakfast: breakfastMeal,
            lunch: lunchMeal,
            dinner: dinnerMeal
          },
          main: dinnerMeal.main,
          vegetable: dinnerMeal.vegetable,
          soup: dinnerMeal.soup,
          side: dinnerMeal.side,
          isEaten: dinnerMeal.isEaten,
          attendance: {
            breakfast: breakfastMeal.attendance,
            lunch: lunchMeal.attendance,
            dinner: dinnerMeal.attendance
          }
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
     * Swap a single dish slot for a day and meal
     * Detects whether an alternative dish actually exists and changed.
     * Avoids choosing the dish of the previous day AND next day if possible.
     * 
     * @param {Object} weekMenu 
     * @param {number} dayIndex (0 - 6)
     * @param {string} slotKey ('main' | 'vegetable' | 'soup' | 'side' | 'single')
     * @param {Array} allDishes 
     * @param {string} mealKey ('breakfast' | 'lunch' | 'dinner')
     * @returns {Object} Result with { changed: boolean, newDish: Object|null, weekMenu: Object, ... }
     */
    swapSingleDish(weekMenu, dayIndex, slotKey, allDishes, mealKey = 'dinner') {
      if (!weekMenu || !weekMenu.days || !weekMenu.days[dayIndex]) {
        return { changed: false, reason: 'invalid_menu', weekMenu, days: weekMenu ? weekMenu.days : [] };
      }

      const currentDay = weekMenu.days[dayIndex];
      const actualMealKey = slotKey === 'single' ? 'breakfast' : (mealKey || 'dinner');
      const targetMeal = currentDay.meals ? currentDay.meals[actualMealKey] : null;

      const currentDish = (targetMeal && targetMeal[slotKey]) ? targetMeal[slotKey] : currentDay[slotKey];
      const excludeDishId = currentDish ? currentDish.id : null;

      const hasMealType = (d, mType) => {
        if (!mType) return true;
        if (Array.isArray(d.mealTypes) && d.mealTypes.length > 0) return d.mealTypes.includes(mType);
        if (d.category === 'single') return mType === 'breakfast';
        return mType === 'lunch' || mType === 'dinner';
      };

      const categoryToFilter = slotKey === 'single' ? 'single' : slotKey;
      let enabledPool = [];
      if (categoryToFilter === 'single') {
        enabledPool = allDishes.filter(d => d.enabled && hasMealType(d, 'breakfast') && d.category === 'single');
        if (enabledPool.length === 0) {
          enabledPool = allDishes.filter(d => d.enabled && hasMealType(d, 'breakfast'));
        }
      } else {
        enabledPool = allDishes.filter(d => d.category === categoryToFilter && d.enabled && hasMealType(d, actualMealKey));
      }

      if (enabledPool.length === 0) {
        return { changed: false, reason: 'no_enabled_dishes', newDish: null, weekMenu, days: weekMenu.days, weekId: weekMenu.weekId };
      }

      if (enabledPool.length === 1 && currentDish && enabledPool[0].id === currentDish.id) {
        return { changed: false, reason: 'no_alternative', newDish: null, weekMenu, days: weekMenu.days, weekId: weekMenu.weekId };
      }

      // Dishes used in other days of current week for this slot
      const currentWeekCounts = new Map();
      weekMenu.days.forEach((day, idx) => {
        if (idx !== dayIndex) {
          const item = (day.meals && day.meals[actualMealKey]) ? day.meals[actualMealKey][slotKey] : day[slotKey];
          if (item && item.id) {
            currentWeekCounts.set(item.id, (currentWeekCounts.get(item.id) || 0) + 1);
          }
        }
      });

      // Avoid previous day dish AND next day dish
      const getAdjacentDishId = (idx) => {
        if (idx < 0 || idx >= weekMenu.days.length) return null;
        const d = weekMenu.days[idx];
        const m = (d.meals && d.meals[actualMealKey]) ? d.meals[actualMealKey][slotKey] : d[slotKey];
        return m ? m.id : null;
      };

      const prevDayDishId = getAdjacentDishId(dayIndex - 1);
      const nextDayDishId = getAdjacentDishId(dayIndex + 1);

      const newDish = this.selectDish(categoryToFilter, allDishes, currentWeekCounts, new Set(), excludeDishId, prevDayDishId, nextDayDishId, actualMealKey);

      if (!newDish || (currentDish && newDish.id === currentDish.id)) {
        return { changed: false, reason: 'no_alternative', newDish: null, weekMenu, days: weekMenu.days, weekId: weekMenu.weekId };
      }

      const dishObj = {
        id: newDish.id,
        name: newDish.name,
        category: newDish.category || slotKey,
        manual: false
      };

      if (targetMeal) {
        targetMeal[slotKey] = dishObj;
      }
      if (actualMealKey === 'dinner') {
        currentDay[slotKey] = dishObj;
      }

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
    setManualDish(weekMenu, dayIndex, slotKey, dish, mealKey = 'dinner') {
      if (!weekMenu || !weekMenu.days || !weekMenu.days[dayIndex]) return weekMenu;

      const day = weekMenu.days[dayIndex];
      const actualMealKey = slotKey === 'single' ? 'breakfast' : (mealKey || 'dinner');
      const targetMeal = day.meals ? day.meals[actualMealKey] : null;

      const dishObj = dish ? {
        id: dish.id || ('manual_' + Date.now()),
        name: dish.name,
        category: dish.category || slotKey,
        manual: true
      } : null;

      if (targetMeal) {
        targetMeal[slotKey] = dishObj;
      }
      if (actualMealKey === 'dinner') {
        day[slotKey] = dishObj;
      }

      weekMenu.updatedAt = Date.now();
      return weekMenu;
    }

    /**
     * Toggle "isEaten" for a specific meal in a day
     */
    toggleEatenMeal(weekMenu, dayIndex, mealKey = 'dinner') {
      if (!weekMenu || !weekMenu.days || !weekMenu.days[dayIndex]) return weekMenu;
      const day = weekMenu.days[dayIndex];
      if (day.meals && day.meals[mealKey]) {
        day.meals[mealKey].isEaten = !day.meals[mealKey].isEaten;
        if (mealKey === 'dinner') {
          day.isEaten = day.meals.dinner.isEaten;
        }
      } else {
        day.isEaten = !day.isEaten;
      }
      weekMenu.updatedAt = Date.now();
      return weekMenu;
    }

    /**
     * Toggle "isEaten" for a day (legacy shortcut, toggles dinner)
     */
    toggleEatenDay(weekMenu, dayIndex) {
      return this.toggleEatenMeal(weekMenu, dayIndex, 'dinner');
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
      const newAttendance = {
        memberIds: Array.isArray(memberIds) ? [...memberIds] : [],
        manualOverride: typeof manualOverride === 'boolean' ? manualOverride : true
      };

      if (day.meals && day.meals[mealKey]) {
        day.meals[mealKey].attendance = newAttendance;
      }
      if (!day.attendance) {
        day.attendance = this.buildDefaultDayAttendance(dayIndex, []);
      }
      day.attendance[mealKey] = newAttendance;
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
