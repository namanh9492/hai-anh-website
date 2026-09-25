const fs = require('fs');
const path = require('path');

// Simple DOM & LocalStorage Mock
class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}

global.localStorage = new LocalStorageMock();
global.window = global;

// Mock Lucide and document
global.document = {
  getElementById: (id) => {
    if (!global._elements[id]) {
      global._elements[id] = {
        id,
        innerHTML: '',
        textContent: '',
        style: {},
        classList: { add: () => {}, remove: () => {} },
        addEventListener: () => {}
      };
    }
    return global._elements[id];
  },
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global._elements = {};

// Load scripts in order
const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
eval(storageCode);
const menuGenCode = fs.readFileSync(path.join(__dirname, '../js/menu-generator.js'), 'utf8');
eval(menuGenCode);
const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
eval(appCode);

console.log('--- RUNNING UI MANDATORY CASES VALIDATION ---');

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

// Case 1: No member configured
console.log('\n[Case 1: No member configured]');
window.StorageManager.saveMembers([]);
const emptyMembers = window.StorageManager.getMembers();
assert(emptyMembers.length === 0, 'No members configured');

const dummyMeal = {
  type: 'family',
  main: null,
  vegetable: null,
  soup: null,
  side: null,
  attendance: { memberIds: [] },
  isEaten: false
};
const stateCase1 = window.AppUtils.getMealDisplayState(dummyMeal, emptyMembers);
assert(stateCase1 === 'NO_MEMBERS_CONFIGURED', 'State is NO_MEMBERS_CONFIGURED');

// Case 2: Members configured, but attendance for breakfast/lunch = 0
console.log('\n[Case 2: Members configured, but attendance = 0]');
const activeMembers = [
  {
    id: 'm1',
    name: 'Bố',
    mealSchedule: {
      monday: { breakfast: false, lunch: false, dinner: true }
    }
  }
];
window.StorageManager.saveMembers(activeMembers);

const allDishes = window.StorageManager.getDishes();
const weekMenu = window.MenuGenerator.generateWeeklyMenu('2026-10-12', allDishes, null, null, activeMembers);
const monB = weekMenu.days[0].meals.breakfast;
const monL = weekMenu.days[0].meals.lunch;

const stateB = window.AppUtils.getMealDisplayState(monB, activeMembers);
const stateL = window.AppUtils.getMealDisplayState(monL, activeMembers);
assert(stateB === 'NOT_EATING_AT_HOME', 'Breakfast state is NOT_EATING_AT_HOME');
assert(stateL === 'NOT_EATING_AT_HOME', 'Lunch state is NOT_EATING_AT_HOME');
assert(monB.single === null, 'Breakfast single dish is null');
assert(monL.main === null && monL.vegetable === null && monL.soup === null, 'Lunch family dishes are all null');

// Case 3: Dinner has attendees
console.log('\n[Case 3: Dinner has attendees]');
const monD = weekMenu.days[0].meals.dinner;
const stateD = window.AppUtils.getMealDisplayState(monD, activeMembers);
assert(stateD === 'HAS_ATTENDEES', 'Dinner state is HAS_ATTENDEES');
assert(monD.attendance.memberIds.includes('m1'), 'Dinner contains member m1');
assert(monD.main !== null && monD.main.name, 'Dinner has generated main dish');
assert(monD.vegetable !== null && monD.vegetable.name, 'Dinner has generated vegetable dish');
assert(monD.soup !== null && monD.soup.name, 'Dinner has generated soup dish');

// Case 4: Legacy eaten meal
console.log('\n[Case 4: Legacy eaten meal]');
const legacyEatenMeal = {
  type: 'family',
  main: { id: 'dish_m1', name: 'Thịt kho tàu' },
  vegetable: { id: 'dish_v1', name: 'Rau muống luộc' },
  soup: { id: 'dish_s1', name: 'Canh rau ngót' },
  isEaten: true,
  attendance: { memberIds: [], attendanceStatus: 'unknown' }
};
const stateLegacy = window.AppUtils.getMealDisplayState(legacyEatenMeal, activeMembers);
assert(stateLegacy === 'UNKNOWN_LEGACY_ATTENDANCE', 'Legacy eaten meal state is UNKNOWN_LEGACY_ATTENDANCE');
assert(legacyEatenMeal.main.name === 'Thịt kho tàu', 'Historical dishes are preserved');

console.log('\n🎉 ALL 4 MANDATORY UI CASES VALIDATED SUCCESSFULLY!\n');
