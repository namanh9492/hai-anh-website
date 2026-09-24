/**
 * Comprehensive Automated Test Suite for Family Home Website
 * Tests: StorageManager, MenuGenerator, AppUtils, Schema Integrity, Regression Tests A-F
 */
const fs = require('fs');
const path = require('path');

// Mock localStorage and window
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

global.localStorage = new LocalStorageMock();
global.window = global;

// Mock document for app.js
global.document = {
  addEventListener: () => {},
  querySelector: () => null,
  getElementById: () => null,
  createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
  body: { appendChild: () => {} }
};

// Load storage.js
const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
eval(storageCode);

// Load menu-generator.js
const menuGenCode = fs.readFileSync(path.join(__dirname, '../js/menu-generator.js'), 'utf8');
eval(menuGenCode);

// Load app.js
const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
eval(appCode);

// Load shopping.js
const shoppingCode = fs.readFileSync(path.join(__dirname, '../js/shopping.js'), 'utf8');
eval(shoppingCode);

console.log('--- STARTING VERIFICATION TESTS ---');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

// TEST SUITE 1: Storage Seed Data
console.log('\n[Suite 1: Seed Data & Schema]');
const initialDishes = window.StorageManager.getDishes();
assert(Array.isArray(initialDishes) && initialDishes.length >= 17, `Initial dishes seeded (count: ${initialDishes.length})`);

const mains = initialDishes.filter(d => d.category === 'main');
const vegs = initialDishes.filter(d => d.category === 'vegetable');
const soups = initialDishes.filter(d => d.category === 'soup');
assert(mains.length >= 7, `Mains seeded >= 7 (found: ${mains.length})`);
assert(vegs.length >= 5, `Vegs seeded >= 5 (found: ${vegs.length})`);
assert(soups.length >= 5, `Soups seeded >= 5 (found: ${soups.length})`);

const initialTips = window.StorageManager.getTips();
assert(Array.isArray(initialTips) && initialTips.length >= 3, `Initial tips seeded (count: ${initialTips.length})`);
assert(initialTips[0].preparationItems.length > 0, 'Tip contains preparation items array');
assert(typeof initialTips[0].content === 'string', 'Tip contains instructions string');

// TEST SUITE 2: Dishes CRUD
console.log('\n[Suite 2: Dishes CRUD]');
const newDish = window.StorageManager.addDish({
  name: 'Bún chả Hà Nội',
  category: 'main',
  note: 'Nướng than hoa thơm lừng',
  enabled: true
});
assert(newDish && newDish.id && newDish.name === 'Bún chả Hà Nội', 'Added new dish successfully');

const fetchedDish = window.StorageManager.getDishById(newDish.id);
assert(fetchedDish && fetchedDish.name === 'Bún chả Hà Nội', 'Fetched dish by ID');

const updatedDish = window.StorageManager.updateDish(newDish.id, {
  name: 'Bún chả Hà Nội Đặc Biệt',
  enabled: false
});
assert(updatedDish.name === 'Bún chả Hà Nội Đặc Biệt' && updatedDish.enabled === false, 'Updated dish and toggled enabled');

const deleted = window.StorageManager.deleteDish(newDish.id);
assert(deleted === true, 'Deleted dish successfully');
assert(window.StorageManager.getDishById(newDish.id) === null, 'Dish no longer exists after delete');

// TEST SUITE 3: Tips CRUD
console.log('\n[Suite 3: Tips CRUD]');
const newTip = window.StorageManager.addTip({
  title: 'Khử cặn ấm siêu tốc bằng chanh',
  category: 'thiet-bi',
  preparationItems: ['1 quả chanh tươi', '500ml nước'],
  content: '1. Cắt chanh thành lát mỏng.\n2. Đun sôi cùng nước trong ấm.\n3. Để nguội 30 phút rồi tráng sạch.',
  links: [{ title: 'Mẹo gia đình hay', url: 'https://example.com' }],
  note: 'Không dùng hóa chất tẩy rửa mạnh'
});
assert(newTip && newTip.id && newTip.title === 'Khử cặn ấm siêu tốc bằng chanh', 'Added new tip');
assert(newTip.preparationItems.length === 2, 'Tip preparation items preserved');
assert(newTip.links.length === 1, 'Tip links preserved');

const updatedTip = window.StorageManager.updateTip(newTip.id, {
  title: 'Khử cặn ấm siêu tốc bằng chanh hoặc giấm'
});
assert(updatedTip.title === 'Khử cặn ấm siêu tốc bằng chanh hoặc giấm', 'Updated tip title');

const deletedTip = window.StorageManager.deleteTip(newTip.id);
assert(deletedTip === true, 'Deleted tip successfully');

// TEST SUITE 4: Storage Resiliency against corruption
console.log('\n[Suite 4: Storage Resiliency]');
global.localStorage.setItem('familyHome:v1:dishes', 'MALFORMED_JSON_%%%');
const safeDishes = window.StorageManager.getDishes();
assert(Array.isArray(safeDishes), 'Safe recovery when localStorage contains corrupted JSON');

// Verify recovery key was created
const recoveryKeys = Object.keys(global.localStorage.store).filter(k => k.startsWith('familyHome:recovery:'));
assert(recoveryKeys.length > 0, `Corrupt data backed up to recovery key (${recoveryKeys[0]})`);

// Reset seed dishes for subsequent tests
window.StorageManager.saveDishes(initialDishes);

// TEST SUITE 5: Menu Generator Logic
console.log('\n[Suite 5: Menu Generator Algorithm]');
const monday = window.MenuGenerator.getMonday(new Date());
const weekId = window.MenuGenerator.getWeekId(monday);
const allDishes = window.StorageManager.getDishes();

const generatedMenu = window.MenuGenerator.generateWeeklyMenu(monday, allDishes);
assert(generatedMenu.weekId === weekId, `Week ID matches (${weekId})`);
assert(Array.isArray(generatedMenu.days) && generatedMenu.days.length === 7, 'Generates 7 days (Monday to Sunday)');

let allMainsValid = true;
let allVegsValid = true;
let allSoupsValid = true;
const weekMainIds = [];

generatedMenu.days.forEach(day => {
  if (!day.main || !day.main.name || day.main.category !== 'main') allMainsValid = false;
  if (!day.vegetable || !day.vegetable.name || day.vegetable.category !== 'vegetable') allVegsValid = false;
  if (!day.soup || !day.soup.name || day.soup.category !== 'soup') allSoupsValid = false;
  if (day.main) weekMainIds.push(day.main.id);
});

assert(allMainsValid, 'Every day has a valid main dish');
assert(allVegsValid, 'Every day has a valid vegetable dish');
assert(allSoupsValid, 'Every day has a valid soup dish');

const uniqueMains = new Set(weekMainIds);
assert(uniqueMains.size === 7, `No duplicate main dishes across 7 days (unique count: ${uniqueMains.size})`);

// TEST SUITE 6: Single Dish Swap
console.log('\n[Suite 6: Single Dish Swap]');
const day0BeforeMain = generatedMenu.days[0].main;
const day1BeforeMain = generatedMenu.days[1].main;

const swapResult = window.MenuGenerator.swapSingleDish(generatedMenu, 0, 'main', allDishes);
assert(swapResult.changed === true, 'swapSingleDish returned changed: true');
const day0AfterMain = generatedMenu.days[0].main;
const day1AfterMain = generatedMenu.days[1].main;

assert(day0AfterMain.id !== day0BeforeMain.id, `Day 0 main swapped (${day0BeforeMain.name} -> ${day0AfterMain.name})`);
assert(day1BeforeMain.id === day1AfterMain.id, 'Other days remained unchanged during single dish swap');

// TEST SUITE 7: Manual Dish Lock & Regeneration Preservation
console.log('\n[Suite 7: Manual Dish Lock & Preservation]');
window.MenuGenerator.setManualDish(generatedMenu, 2, 'main', { id: 'custom_pho', name: 'Phở Bò Gia Truyền' });
assert(generatedMenu.days[2].main.manual === true, 'Dish marked as manual lock');
assert(generatedMenu.days[2].main.name === 'Phở Bò Gia Truyền', 'Custom manual dish set');

const regenerated = window.MenuGenerator.generateWeeklyMenu(monday, allDishes, generatedMenu);
assert(regenerated.days[2].main.manual === true, 'Manual dish preserved after week regeneration');
assert(regenerated.days[2].main.name === 'Phở Bò Gia Truyền', 'Manual dish name intact after week regeneration');

// TEST SUITE 8: Toggle Eaten Status
console.log('\n[Suite 8: Toggle Eaten Status]');
assert(regenerated.days[0].isEaten === false, 'Initial eaten status is false');
window.MenuGenerator.toggleEatenDay(regenerated, 0);
assert(regenerated.days[0].isEaten === true, 'Eaten status successfully toggled to true');
window.MenuGenerator.toggleEatenDay(regenerated, 0);
assert(regenerated.days[0].isEaten === false, 'Eaten status successfully toggled back to false');

// TEST SUITE 9: Graceful Fallback when Dishes Scarce
console.log('\n[Suite 9: Scarcity Fallback]');
const scarceDishes = [
  { id: 'm1', name: 'Thịt kho', category: 'main', enabled: true },
  { id: 'm2', name: 'Trứng rán', category: 'main', enabled: true },
  { id: 'v1', name: 'Rau luộc', category: 'vegetable', enabled: true },
  { id: 's1', name: 'Canh bí', category: 'soup', enabled: true }
];
const scarceMenu = window.MenuGenerator.generateWeeklyMenu(monday, scarceDishes);
assert(scarceMenu.days.length === 7, 'Generates 7 days even with scarce pool');
assert(scarceMenu.days.every(d => d.main && d.vegetable && d.soup), 'All days have dishes populated without crashing');

// ==========================================
// REGRESSION TESTS A - F
// ==========================================

// TEST A: Intentional Empty Storage
console.log('\n[Regression Test A: Intentional Empty Storage]');
window.StorageManager.saveDishes([]);
window.StorageManager._initSeed();
const dishesAfterEmptyInit = window.StorageManager.getDishes();
assert(Array.isArray(dishesAfterEmptyInit) && dishesAfterEmptyInit.length === 0, 'Empty dishes array preserved on initSeed without auto-reseeding');

window.StorageManager.saveTips([]);
window.StorageManager._initSeed();
const tipsAfterEmptyInit = window.StorageManager.getTips();
assert(Array.isArray(tipsAfterEmptyInit) && tipsAfterEmptyInit.length === 0, 'Empty tips array preserved on initSeed without auto-reseeding');

// Restore dishes for subsequent tests
window.StorageManager.saveDishes(initialDishes);

// TEST B: lastUsedAt Synchronization
console.log('\n[Regression Test B: lastUsedAt Sync]');
// Clear menus
window.StorageManager.saveMenus({});
// Verify dish lastUsedAt initially null after sync
window.StorageManager.syncDishLastUsedAtFromMenus();
const dishesBeforeEat = window.StorageManager.getDishes();
const targetDishId = initialDishes[0].id; // e.g. dish_m1
assert(dishesBeforeEat.find(d => d.id === targetDishId).lastUsedAt === null, 'Target dish lastUsedAt initially null');

// Create menu where day 0 has targetDishId and mark as eaten
const testMonday = '2026-09-21';
const testMenu = {
  weekId: testMonday,
  days: [
    {
      date: '2026-09-21',
      dayLabel: 'Thứ Hai',
      isEaten: true,
      main: { id: targetDishId, name: initialDishes[0].name },
      vegetable: { id: initialDishes[7].id, name: initialDishes[7].name },
      soup: { id: initialDishes[12].id, name: initialDishes[12].name }
    }
  ]
};
window.StorageManager.saveMenuForWeek(testMonday, testMenu);
window.StorageManager.syncDishLastUsedAtFromMenus();

const dishesAfterEat = window.StorageManager.getDishes();
const targetDishAfterEat = dishesAfterEat.find(d => d.id === targetDishId);
const expectedTimestamp = new Date('2026-09-21T00:00:00').getTime();
assert(targetDishAfterEat.lastUsedAt === expectedTimestamp, `Dish lastUsedAt synced to eaten day timestamp (${expectedTimestamp})`);

// Unmark eaten
testMenu.days[0].isEaten = false;
window.StorageManager.saveMenuForWeek(testMonday, testMenu);
window.StorageManager.syncDishLastUsedAtFromMenus();

const dishesAfterUneat = window.StorageManager.getDishes();
const targetDishAfterUneat = dishesAfterUneat.find(d => d.id === targetDishId);
assert(targetDishAfterUneat.lastUsedAt === null, 'Dish lastUsedAt recalculated to null when eaten unmarked');

// TEST C: Sparse Category Balancing
console.log('\n[Regression Test C: Sparse Category Balancing]');
// 1. 5 vegetable dishes for 7 days
const fiveVegDishes = [
  { id: 'v1', name: 'Rau muống', category: 'vegetable', enabled: true },
  { id: 'v2', name: 'Cải thìa', category: 'vegetable', enabled: true },
  { id: 'v3', name: 'Su su', category: 'vegetable', enabled: true },
  { id: 'v4', name: 'Rau cải ngọt', category: 'vegetable', enabled: true },
  { id: 'v5', name: 'Đậu cô ve', category: 'vegetable', enabled: true }
];
const fiveVegMenu = window.MenuGenerator.generateWeeklyMenu('2026-09-21', fiveVegDishes);
const vegOccurrences = {};
let hasAdjacentDuplicateVeg = false;

fiveVegMenu.days.forEach((day, idx) => {
  const vid = day.vegetable.id;
  vegOccurrences[vid] = (vegOccurrences[vid] || 0) + 1;
  if (idx > 0 && vid === fiveVegMenu.days[idx - 1].vegetable.id) {
    hasAdjacentDuplicateVeg = true;
  }
});

const uniqueVegsUsed = Object.keys(vegOccurrences).length;
const maxVegCount = Math.max(...Object.values(vegOccurrences));
assert(uniqueVegsUsed === 5, `All 5 vegetable dishes used across 7 days (used: ${uniqueVegsUsed})`);
assert(maxVegCount <= 2, `No vegetable dish appears more than 2 times (max count: ${maxVegCount})`);
assert(hasAdjacentDuplicateVeg === false, 'No duplicate vegetable on two consecutive days');

// 2. 2 main dishes for 7 days
const twoMainDishes = [
  { id: 'm1', name: 'Thịt rang cháy cạnh', category: 'main', enabled: true },
  { id: 'm2', name: 'Cá kho tộ', category: 'main', enabled: true }
];
const twoMainMenu = window.MenuGenerator.generateWeeklyMenu('2026-09-21', twoMainDishes);
const mainOccurrences = {};
let hasAdjacentDuplicateMain = false;

twoMainMenu.days.forEach((day, idx) => {
  const mid = day.main.id;
  mainOccurrences[mid] = (mainOccurrences[mid] || 0) + 1;
  if (idx > 0 && mid === twoMainMenu.days[idx - 1].main.id) {
    hasAdjacentDuplicateMain = true;
  }
});

assert(Object.keys(mainOccurrences).length === 2, 'Both 2 main dishes are used');
const countDiff = Math.abs(mainOccurrences['m1'] - mainOccurrences['m2']);
assert(countDiff <= 1, `Occurrence difference between 2 dishes is <= 1 (counts: ${mainOccurrences['m1']} and ${mainOccurrences['m2']})`);
assert(hasAdjacentDuplicateMain === false, 'No duplicate main on two consecutive days (perfect alternation)');

// TEST D: Single Candidate Swap
console.log('\n[Regression Test D: Single Candidate Swap]');
const singleMainPool = [
  { id: 'only_m1', name: 'Thịt rang', category: 'main', enabled: true }
];
const singleMainMenu = {
  weekId: '2026-09-21',
  days: [
    { date: '2026-09-21', main: { id: 'only_m1', name: 'Thịt rang', category: 'main' } }
  ]
};
const singleSwapResult = window.MenuGenerator.swapSingleDish(singleMainMenu, 0, 'main', singleMainPool);
assert(singleSwapResult.changed === false, 'Swap detects no alternative dish (changed === false)');
assert(singleSwapResult.reason === 'no_alternative', `Swap reason is no_alternative (${singleSwapResult.reason})`);
assert(singleMainMenu.days[0].main.id === 'only_m1', 'Dish remains untouched after no-op swap');

// TEST E: Week Boundary Tests
console.log('\n[Regression Test E: Week Boundary]');
// 1. Year boundary: 2027-01-01 must belong to week starting 2026-12-28
const monday2027 = window.MenuGenerator.getMonday('2027-01-01');
const weekId2027 = window.MenuGenerator.formatDateISO(monday2027);
assert(weekId2027 === '2026-12-28', `2027-01-01 belongs to week starting 2026-12-28 (result: ${weekId2027})`);

// 2. Month boundary: 2026-09-30 and 2026-10-01 belong to week starting 2026-09-28
const mondaySep30 = window.MenuGenerator.getWeekId('2026-09-30');
const mondayOct01 = window.MenuGenerator.getWeekId('2026-10-01');
assert(mondaySep30 === '2026-09-28', `2026-09-30 week starts on 2026-09-28 (result: ${mondaySep30})`);
assert(mondayOct01 === '2026-09-28', `2026-10-01 week starts on 2026-09-28 (result: ${mondayOct01})`);

// 3. Sunday to Monday: 2026-09-27 is Sunday, must return 2026-09-21
const sundayMonday = window.MenuGenerator.getWeekId('2026-09-27');
assert(sundayMonday === '2026-09-21', `Sunday 2026-09-27 maps to Monday 2026-09-21 (result: ${sundayMonday})`);

// TEST F: URL Validation Tests
console.log('\n[Regression Test F: URL Validation]');
// Valid URLs
assert(window.AppUtils.validateExternalUrl('https://example.com') === true, 'PASS: https://example.com');
assert(window.AppUtils.validateExternalUrl('http://example.com') === true, 'PASS: http://example.com');
assert(window.AppUtils.validateExternalUrl('https://www.youtube.com/watch?v=123') === true, 'PASS: YouTube URL');

// Invalid URLs
assert(window.AppUtils.validateExternalUrl('javascript:alert(1)') === false, 'REJECT: javascript:alert(1)');
assert(window.AppUtils.validateExternalUrl('data:text/html,<script>alert(1)</script>') === false, 'REJECT: data: URL');
assert(window.AppUtils.validateExternalUrl('file:///C:/Windows/System32') === false, 'REJECT: file:/// URL');
assert(window.AppUtils.validateExternalUrl('not-a-url') === false, 'REJECT: not-a-url');
assert(window.AppUtils.validateExternalUrl('') === false, 'REJECT: empty string');
assert(window.AppUtils.validateExternalUrl(null) === false, 'REJECT: null');

console.log('\n[Regression Test G: Eaten Day Preservation and lastUsedAt Integrity]');
// 1. Generate a week menu
const allDishesG = window.StorageManager.getDishes();
const testWeekIdG = '2026-10-05';
window.StorageManager.saveMenus({}); // Clean slate for isolation

let weekMenuG = window.MenuGenerator.generateWeeklyMenu(testWeekIdG, allDishesG);

// 2. Save IDs of Monday (day 0)
const oldMondayMainId = weekMenuG.days[0].main.id;
const oldMondayVegId = weekMenuG.days[0].vegetable.id;
const oldMondaySoupId = weekMenuG.days[0].soup.id;
const oldTuesdayMainId = weekMenuG.days[1].main.id;
assert(oldMondayMainId && oldMondayVegId && oldMondaySoupId, 'Monday has valid generated dishes');

// 3. Mark Monday as eaten
weekMenuG.days[0].isEaten = true;
window.StorageManager.saveMenuForWeek(testWeekIdG, weekMenuG);
window.StorageManager.syncDishLastUsedAtFromMenus();

// Verify Monday's dishes have lastUsedAt set
const expectedMondayTs = new Date('2026-10-05T00:00:00').getTime();
const dishesAfterMondayEat = window.StorageManager.getDishes();
assert(dishesAfterMondayEat.find(d => d.id === oldMondayMainId).lastUsedAt === expectedMondayTs, 'Monday main dish lastUsedAt set');
assert(dishesAfterMondayEat.find(d => d.id === oldMondayVegId).lastUsedAt === expectedMondayTs, 'Monday veg dish lastUsedAt set');
assert(dishesAfterMondayEat.find(d => d.id === oldMondaySoupId).lastUsedAt === expectedMondayTs, 'Monday soup dish lastUsedAt set');

// 4. Regenerate same week with existing menu multiple times to ensure deterministic preservation
let currentRegenMenu = weekMenuG;
for (let iter = 1; iter <= 10; iter++) {
  currentRegenMenu = window.MenuGenerator.generateWeeklyMenu(testWeekIdG, allDishesG, currentRegenMenu);
  assert(currentRegenMenu.days[0].main.id === oldMondayMainId, `[Iter ${iter}] Monday main preserved exactly (${oldMondayMainId})`);
  assert(currentRegenMenu.days[0].vegetable.id === oldMondayVegId, `[Iter ${iter}] Monday vegetable preserved exactly (${oldMondayVegId})`);
  assert(currentRegenMenu.days[0].soup.id === oldMondaySoupId, `[Iter ${iter}] Monday soup preserved exactly (${oldMondaySoupId})`);
  assert(currentRegenMenu.days[0].isEaten === true, `[Iter ${iter}] Monday isEaten remains true`);
}

// 5. Assert an uneaten and non-manual day (Tuesday) remains uneaten and can regenerate
assert(currentRegenMenu.days[1].isEaten === false, 'Tuesday remains uneaten (isEaten === false)');
assert(currentRegenMenu.days[1].main && currentRegenMenu.days[1].main.manual === false, 'Tuesday main slot is auto-generated (manual === false)');

// 6. Save regenerated menu and re-sync lastUsedAt
window.StorageManager.saveMenuForWeek(testWeekIdG, currentRegenMenu);
window.StorageManager.syncDishLastUsedAtFromMenus();

// Verify eaten Monday dishes retained lastUsedAt, while uneaten days did not receive lastUsedAt
const dishesAfterRegenSync = window.StorageManager.getDishes();
assert(dishesAfterRegenSync.find(d => d.id === oldMondayMainId).lastUsedAt === expectedMondayTs, 'Monday main dish still holds eaten timestamp after regen');
assert(dishesAfterRegenSync.find(d => d.id === oldMondayVegId).lastUsedAt === expectedMondayTs, 'Monday veg dish still holds eaten timestamp after regen');
assert(dishesAfterRegenSync.find(d => d.id === oldMondaySoupId).lastUsedAt === expectedMondayTs, 'Monday soup dish still holds eaten timestamp after regen');

const tuesdayCurrentMainId = currentRegenMenu.days[1].main.id;
if (tuesdayCurrentMainId !== oldMondayMainId) {
  const tuesdayDish = dishesAfterRegenSync.find(d => d.id === tuesdayCurrentMainId);
  assert(tuesdayDish.lastUsedAt === null, `Uneaten Tuesday dish (${tuesdayCurrentMainId}) did NOT acquire lastUsedAt`);
}

// TEST H: Swap avoids previous and next day duplicate
console.log('\n[Regression Test H: Swap Avoids Next-Day and Prev-Day Duplicate]');

// Fixture with 4 main dishes: A, B, C, D
const fourMainDishes = [
  { id: 'dish_A', name: 'Món A', category: 'main', enabled: true },
  { id: 'dish_B', name: 'Món B', category: 'main', enabled: true },
  { id: 'dish_C', name: 'Món C', category: 'main', enabled: true },
  { id: 'dish_D', name: 'Món D', category: 'main', enabled: true }
];

const deterministicWeekMenu = {
  weekId: '2026-09-21',
  days: [
    { date: '2026-09-21', main: { id: 'dish_B', name: 'Món B', category: 'main' } }, // Day 0 = B
    { date: '2026-09-22', main: { id: 'dish_A', name: 'Món A', category: 'main' } }, // Day 1 = A (swap target)
    { date: '2026-09-23', main: { id: 'dish_C', name: 'Món C', category: 'main' } }, // Day 2 = C
    { date: '2026-09-24', main: null },
    { date: '2026-09-25', main: null },
    { date: '2026-09-26', main: null },
    { date: '2026-09-27', main: null }
  ]
};

const swapHResult = window.MenuGenerator.swapSingleDish(deterministicWeekMenu, 1, 'main', fourMainDishes);
assert(swapHResult.changed === true, 'Swap succeeds on Day 1 (changed === true)');
assert(swapHResult.newDish !== null, 'Swap returns new dish object');
assert(swapHResult.newDish.id !== 'dish_A', `Swap avoided current dish A (result: ${swapHResult.newDish.id})`);
assert(swapHResult.newDish.id !== 'dish_B', `Swap avoided previous day dish B (result: ${swapHResult.newDish.id})`);
assert(swapHResult.newDish.id !== 'dish_C', `Swap avoided next day dish C (result: ${swapHResult.newDish.id})`);
assert(swapHResult.newDish.id === 'dish_D', `Swap selected valid alternative dish D (result: ${swapHResult.newDish.id})`);
assert(deterministicWeekMenu.days[1].main.id === 'dish_D', 'Week menu Day 1 updated to dish D');

// Fallback test: pool with only 2 dishes where avoiding both is impossible
console.log('\n[Regression Test H Fallback: 2-dish pool swap]');
const twoDishesPool = [
  { id: 'dish_P', name: 'Món P', category: 'main', enabled: true },
  { id: 'dish_Q', name: 'Món Q', category: 'main', enabled: true }
];

const twoDishesWeek = {
  weekId: '2026-09-21',
  days: [
    { date: '2026-09-21', main: { id: 'dish_Q', name: 'Món Q', category: 'main' } }, // Day 0 = Q
    { date: '2026-09-22', main: { id: 'dish_P', name: 'Món P', category: 'main' } }, // Day 1 = P (swap target)
    { date: '2026-09-23', main: { id: 'dish_Q', name: 'Món Q', category: 'main' } }, // Day 2 = Q
    { date: '2026-09-24', main: null },
    { date: '2026-09-25', main: null },
    { date: '2026-09-26', main: null },
    { date: '2026-09-27', main: null }
  ]
};

let fallbackSafe = false;
try {
  const fallbackResult = window.MenuGenerator.swapSingleDish(twoDishesWeek, 1, 'main', twoDishesPool);
  assert(fallbackResult.changed === true, '2-dish fallback swap succeeded without crashing (changed === true)');
  assert(fallbackResult.newDish.id === 'dish_Q', `Fallback successfully swapped from P to Q (result: ${fallbackResult.newDish.id})`);
  assert(twoDishesWeek.days[1].main.id === 'dish_Q', 'Menu Day 1 updated to dish Q');
  fallbackSafe = true;
} catch (err) {
  assert(false, `Fallback swap threw error: ${err.message}`);
}
assert(fallbackSafe, '2-dish pool fallback executed safely without error');

console.log('\n[Suite 10: Members & Attendance (Phase 1)]');

// TEST 1: Member CRUD
console.log('\n- Test 1: Member CRUD');
const newMemberFixture = {
  name: 'Bé Minh',
  birthDate: '2021-03-12',
  portionSize: 'small',
  dietaryRules: ['Không cay', 'Không ăn hành'],
  healthNotes: 'Tiền sử dị ứng tôm nhẹ'
};

const createdMember = window.StorageManager.addMember(newMemberFixture);
assert(createdMember.id && createdMember.id.startsWith('mem_'), `Member created with unique ID (${createdMember.id})`);
assert(createdMember.name === 'Bé Minh', 'Member name preserved');
assert(createdMember.portionSize === 'small', 'Member portion size preserved');
assert(createdMember.dietaryRules.length === 2, 'Member dietary rules array preserved');
assert(createdMember.mealSchedule && createdMember.mealSchedule.monday, 'Member has default mealSchedule');

const fetchedMember = window.StorageManager.getMemberById(createdMember.id);
assert(fetchedMember !== null && fetchedMember.id === createdMember.id, 'Fetched member by ID');

const updatedMember = window.StorageManager.updateMember(createdMember.id, {
  name: 'Bé Minh Anh',
  portionSize: 'medium'
});
assert(updatedMember.name === 'Bé Minh Anh', 'Member name updated successfully');
assert(updatedMember.portionSize === 'medium', 'Member portionSize updated successfully');

const deleteSuccess = window.StorageManager.deleteMember(createdMember.id);
assert(deleteSuccess === true, 'Member deleted successfully');
assert(window.StorageManager.getMemberById(createdMember.id) === null, 'Member no longer exists after delete');

// TEST 2: Age Calculation
console.log('\n- Test 2: Age Calculation');
const testRefDate = new Date(2026, 8, 24); // 2026-09-24

// 1. Birthday already passed this year (2021-03-12 -> 5 years old on 2026-09-24)
const agePassed = window.AppUtils.calculateAge('2021-03-12', testRefDate);
assert(agePassed === 5, `Age calculated correctly when birthday passed (expected 5, got ${agePassed})`);

// 2. Birthday upcoming later this year (2021-11-20 -> 4 years old on 2026-09-24)
const ageUpcoming = window.AppUtils.calculateAge('2021-11-20', testRefDate);
assert(ageUpcoming === 4, `Age calculated correctly when birthday upcoming (expected 4, got ${ageUpcoming})`);

// 3. Leap year: 2020-02-29
const ageLeapBefore = window.AppUtils.calculateAge('2020-02-29', new Date(2021, 1, 28)); // 2021-02-28
const ageLeapAfter = window.AppUtils.calculateAge('2020-02-29', new Date(2021, 2, 1));  // 2021-03-01
assert(ageLeapBefore === 0, `Leap year age before March 1 is 0 (got ${ageLeapBefore})`);
assert(ageLeapAfter === 1, `Leap year age on/after March 1 is 1 (got ${ageLeapAfter})`);

// 4. Empty and invalid birthDate handling
assert(window.AppUtils.calculateAge('') === null, 'Empty string returns null');
assert(window.AppUtils.calculateAge(null) === null, 'Null returns null');
assert(window.AppUtils.calculateAge('invalid-date') === null, 'Malformed date returns null');
assert(window.AppUtils.calculateAge('2020-02-31') === null, 'Non-existent calendar date returns null');
assert(window.AppUtils.calculateAge('2030-01-01', testRefDate) === null, 'Future birth date returns null');

// TEST 3: Meal Schedule
console.log('\n- Test 3: Meal Schedule');
const customScheduleMember = window.StorageManager.addMember({
  name: 'Bé Minh',
  birthDate: '2021-03-12',
  portionSize: 'small',
  mealSchedule: {
    monday: { breakfast: false, lunch: false, dinner: true },
    tuesday: { breakfast: false, lunch: false, dinner: true },
    wednesday: { breakfast: false, lunch: false, dinner: true },
    thursday: { breakfast: false, lunch: false, dinner: true },
    friday: { breakfast: false, lunch: false, dinner: true },
    saturday: { breakfast: true, lunch: true, dinner: true },
    sunday: { breakfast: true, lunch: true, dinner: true }
  }
});

assert(customScheduleMember.mealSchedule.monday.breakfast === false, 'Monday breakfast is false');
assert(customScheduleMember.mealSchedule.monday.lunch === false, 'Monday lunch is false');
assert(customScheduleMember.mealSchedule.monday.dinner === true, 'Monday dinner is true');
assert(customScheduleMember.mealSchedule.saturday.breakfast === true, 'Saturday breakfast is true');
assert(customScheduleMember.mealSchedule.saturday.lunch === true, 'Saturday lunch is true');
assert(customScheduleMember.mealSchedule.saturday.dinner === true, 'Saturday dinner is true');

// TEST 4: Weekly Attendance Generation
console.log('\n- Test 4: Weekly Attendance Generation');
const testWeekAttendanceId = '2026-10-12';
const generatedWeekWithAttendance = window.MenuGenerator.generateWeeklyMenu(
  testWeekAttendanceId,
  window.StorageManager.getDishes(),
  null,
  null,
  [customScheduleMember]
);

const mondayAttendance = generatedWeekWithAttendance.days[0].attendance;
assert(mondayAttendance.breakfast.memberIds.includes(customScheduleMember.id) === false, 'Monday breakfast does NOT contain child');
assert(mondayAttendance.lunch.memberIds.includes(customScheduleMember.id) === false, 'Monday lunch does NOT contain child');
assert(mondayAttendance.dinner.memberIds.includes(customScheduleMember.id) === true, 'Monday dinner contains child');

const saturdayAttendance = generatedWeekWithAttendance.days[5].attendance;
assert(saturdayAttendance.breakfast.memberIds.includes(customScheduleMember.id) === true, 'Saturday breakfast contains child');
assert(saturdayAttendance.lunch.memberIds.includes(customScheduleMember.id) === true, 'Saturday lunch contains child');
assert(saturdayAttendance.dinner.memberIds.includes(customScheduleMember.id) === true, 'Saturday dinner contains child');

// TEST 5: Attendance Snapshot Stability
console.log('\n- Test 5: Attendance Snapshot Stability');
// Save menu to storage
window.StorageManager.saveMenuForWeek(testWeekAttendanceId, generatedWeekWithAttendance);

// User modifies member default schedule later
window.StorageManager.updateMember(customScheduleMember.id, {
  mealSchedule: {
    monday: { breakfast: true, lunch: true, dinner: false },
    saturday: { breakfast: false, lunch: false, dinner: false }
  }
});

// Read existing week menu from storage
const existingSavedWeek = window.StorageManager.getMenuForWeek(testWeekAttendanceId);
const existingMonday = existingSavedWeek.days[0].attendance;
assert(existingMonday.breakfast.memberIds.includes(customScheduleMember.id) === false, 'Existing week Monday breakfast unchanged (snapshot preserved)');
assert(existingMonday.dinner.memberIds.includes(customScheduleMember.id) === true, 'Existing week Monday dinner unchanged (snapshot preserved)');

// TEST 6: Manual Override of Single Meal Attendance
console.log('\n- Test 6: Manual Override of Single Meal Attendance');
// Child goes to birthday party on Monday night -> remove child from Monday dinner
window.MenuGenerator.updateMealAttendance(existingSavedWeek, 0, 'dinner', [], true);
window.StorageManager.saveMenuForWeek(testWeekAttendanceId, existingSavedWeek);

const overriddenWeek = window.StorageManager.getMenuForWeek(testWeekAttendanceId);
assert(overriddenWeek.days[0].attendance.dinner.memberIds.length === 0, 'Monday dinner memberIds updated to empty');
assert(overriddenWeek.days[0].attendance.dinner.manualOverride === true, 'Monday dinner manualOverride is true');
assert(overriddenWeek.days[5].attendance.dinner.memberIds.includes(customScheduleMember.id) === true, 'Saturday dinner attendance remained untouched');

// Member template schedule in storage remains unaffected
const childInStorage = window.StorageManager.getMemberById(customScheduleMember.id);
assert(childInStorage !== null, 'Member still exists in storage');

// TEST 7: Reset Override to Default
console.log('\n- Test 7: Reset Override to Default');
// Reset Monday dinner back to default template
window.MenuGenerator.resetMealAttendanceToDefault(overriddenWeek, 0, 'dinner', [childInStorage]);
window.StorageManager.saveMenuForWeek(testWeekAttendanceId, overriddenWeek);

const resetWeek = window.StorageManager.getMenuForWeek(testWeekAttendanceId);
assert(resetWeek.days[0].attendance.dinner.manualOverride === false, 'Monday dinner manualOverride reset to false');

// TEST 8: Deleted Member Reference Handling
console.log('\n- Test 8: Deleted Member Reference Handling');
// Delete member
window.StorageManager.deleteMember(customScheduleMember.id);
assert(window.StorageManager.getMemberById(customScheduleMember.id) === null, 'Member successfully deleted');

// Read existing historical menu - must NOT crash
let readSafe = false;
try {
  const menuWithDeletedRef = window.StorageManager.getMenuForWeek(testWeekAttendanceId);
  assert(menuWithDeletedRef !== null, 'Historical menu read successfully without crash');
  assert(Array.isArray(menuWithDeletedRef.days), 'Historical menu days array intact');
  assert(menuWithDeletedRef.days[5].attendance.dinner !== undefined, 'Attendance structure intact');
  readSafe = true;
} catch (err) {
  assert(false, `Reading menu with deleted member crashed: ${err.message}`);
}
assert(readSafe, 'Historical menu with deleted member references is completely safe');

// TEST 9: Legacy Menu Migration
console.log('\n- Test 9: Legacy Menu Migration');
const legacyMenuV1 = {
  weekId: '2026-08-10',
  days: [
    {
      date: '2026-08-10',
      dayLabel: 'Thứ Hai',
      isEaten: true,
      main: { id: 'dish_m1', name: 'Thịt rang cháy cạnh', category: 'main', manual: true },
      vegetable: { id: 'dish_v1', name: 'Rau muống', category: 'vegetable', manual: false },
      soup: { id: 'dish_s1', name: 'Canh bí', category: 'soup', manual: false },
      side: null
      // NOTE: No attendance property (V1 format)
    }
  ]
};

window.StorageManager.saveMenuForWeek('2026-08-10', legacyMenuV1);
const migratedMenu = window.StorageManager.getMenuForWeek('2026-08-10');

assert(migratedMenu.days[0].main.id === 'dish_m1', 'Legacy dish id preserved');
assert(migratedMenu.days[0].main.manual === true, 'Legacy manual lock flag preserved');
assert(migratedMenu.days[0].isEaten === true, 'Legacy isEaten flag preserved');
assert(migratedMenu.days[0].attendance !== undefined, 'Attendance object added during normalization');
assert(Array.isArray(migratedMenu.days[0].attendance.breakfast.memberIds), 'Attendance breakfast memberIds is valid array');
assert(Array.isArray(migratedMenu.days[0].attendance.lunch.memberIds), 'Attendance lunch memberIds is valid array');
assert(Array.isArray(migratedMenu.days[0].attendance.dinner.memberIds), 'Attendance dinner memberIds is valid array');
assert(migratedMenu.days[0].attendance.dinner.manualOverride === false, 'Attendance manualOverride initialized to false');

console.log('\n🎉 ALL SUITES 1-10 AND REGRESSION TESTS A-H PASSED PERFECTLY!\n');

// ============================================================================
// TEST SUITE 11: Phase 2 Mandatory Tests (Tests 1 to 16)
// ============================================================================
console.log('\n======================================================');
console.log('=== TEST SUITE 11: PHASE 2 MANDATORY TESTS (1-16) ===');
console.log('======================================================\n');

// Test 1 – Dish Recipe Migration
console.log('- Phase 2 Test 1: Dish Recipe Migration');
const currentDishesInStorage = JSON.parse(localStorage.getItem('familyHome:v1:dishes') || '[]');
currentDishesInStorage.push({
  id: 'legacy_dish_v1_cakho',
  name: 'Cá kho làng Vũ Đại',
  category: 'main'
  // Note: no baseServings, mealTypes, ingredients
});
localStorage.setItem('familyHome:v1:dishes', JSON.stringify(currentDishesInStorage));

const dishesAfterMigrate = window.StorageManager.getDishes();
const migratedCaKho = dishesAfterMigrate.find(d => d.id === 'legacy_dish_v1_cakho');
assert(migratedCaKho !== undefined, 'Migrated dish exists in list');
assert(migratedCaKho.baseServings === 4, 'Migrated dish baseServings normalized to 4');
assert(Array.isArray(migratedCaKho.mealTypes), 'Migrated dish mealTypes is array');
assert(migratedCaKho.mealTypes.includes('lunch') && migratedCaKho.mealTypes.includes('dinner'), 'Migrated dish mealTypes contains lunch and dinner');
assert(Array.isArray(migratedCaKho.ingredients) && migratedCaKho.ingredients.length === 0, 'Migrated dish ingredients is []');

// Test 2 – Recipe CRUD
console.log('\n- Phase 2 Test 2: Recipe CRUD');
const createdRecipeDish = window.StorageManager.addDish({
  name: 'Cá kho tộ miền Tây',
  category: 'main',
  baseServings: 4,
  mealTypes: ['lunch', 'dinner'],
  ingredients: [
    { id: 'ing_ca', name: 'Cá', quantity: 800, unit: 'g' },
    { id: 'ing_mam', name: 'Nước mắm', quantity: 40, unit: 'ml' }
  ]
});
assert(createdRecipeDish && createdRecipeDish.id, 'Recipe dish created successfully');
assert(createdRecipeDish.baseServings === 4, 'Recipe dish has baseServings = 4');
assert(createdRecipeDish.ingredients.length === 2, 'Recipe dish has 2 ingredients');

const reloadedRecipeDish = window.StorageManager.getDishById(createdRecipeDish.id);
assert(reloadedRecipeDish.ingredients[0].name === 'Cá' && reloadedRecipeDish.ingredients[0].quantity === 800, 'Reloaded dish has Cá 800g');
assert(reloadedRecipeDish.ingredients[1].name === 'Nước mắm' && reloadedRecipeDish.ingredients[1].quantity === 40, 'Reloaded dish has Nước mắm 40ml');

const updatedRecipeDish = window.StorageManager.updateDish(createdRecipeDish.id, {
  ingredients: [
    { id: 'ing_ca', name: 'Cá lóc', quantity: 850, unit: 'g' },
    { id: 'ing_mam', name: 'Nước mắm', quantity: 40, unit: 'ml' },
    { id: 'ing_hanh', name: 'Hành tím', quantity: 20, unit: 'g' }
  ]
});
assert(updatedRecipeDish.ingredients.length === 3, 'Updated dish now has 3 ingredients');
assert(updatedRecipeDish.ingredients[0].name === 'Cá lóc' && updatedRecipeDish.ingredients[0].quantity === 850, 'Updated ingredient name and quantity saved');

// Test 3 – Portion Calculation
console.log('\n- Phase 2 Test 3: Portion Calculation');
const portionMembers = [
  { id: 'pm_dad', name: 'Bố', portionSize: 'large' },     // 1.25
  { id: 'pm_mom', name: 'Mẹ', portionSize: 'standard' },  // 1.0
  { id: 'pm_kid', name: 'Bé', portionSize: 'small' }      // 0.5
];
const calculatedPortion = window.AppUtils.calculateMealServings(['pm_dad', 'pm_mom', 'pm_kid'], portionMembers);
assert(Math.abs(calculatedPortion - 2.75) < 0.001, `Calculated meal servings = 2.75 (got: ${calculatedPortion})`);

// Test 4 – Ingredient Scaling
console.log('\n- Phase 2 Test 4: Ingredient Scaling');
// Recipe: 4 servings, 800g cá -> meal: 2.75 servings -> 800 * 2.75 / 4 = 550g
const dishToScale = {
  baseServings: 4,
  ingredients: [
    { id: 'ing_ca', name: 'Cá', quantity: 800, unit: 'g' }
  ]
};
const scaledResult = window.AppUtils.calculateDishIngredients(dishToScale, 2.75);
assert(scaledResult.length === 1, 'Scaled result has 1 ingredient');
assert(Math.abs(scaledResult[0].scaledQuantity - 550) < 0.001, `Cá scaled quantity = 550g (got: ${scaledResult[0].scaledQuantity})`);

// Test 5 – Unit Conversion
console.log('\n- Phase 2 Test 5: Unit Conversion');
// 500 g + 1 kg = 1500 g -> display 1.5 kg
const uG = window.AppUtils.convertToBaseUnit(500, 'g');
const uKg = window.AppUtils.convertToBaseUnit(1, 'kg');
const totalMassG = uG.baseQuantity + uKg.baseQuantity;
assert(totalMassG === 1500, '500g + 1kg base sum is 1500g');
const displayMass = window.AppUtils.formatIngredientDisplay(totalMassG, 'g');
assert(displayMass.amount === 1.5 && displayMass.unit === 'kg', `1500g displayed as 1.5 kg (got: ${displayMass.amount} ${displayMass.unit})`);

// 500 ml + 1 l = 1500 ml -> display 1.5 l
const uMl = window.AppUtils.convertToBaseUnit(500, 'ml');
const uL = window.AppUtils.convertToBaseUnit(1, 'l');
const totalVolMl = uMl.baseQuantity + uL.baseQuantity;
assert(totalVolMl === 1500, '500ml + 1l base sum is 1500ml');
const displayVol = window.AppUtils.formatIngredientDisplay(totalVolMl, 'ml');
assert(displayVol.amount === 1.5 && displayVol.unit === 'l', `1500ml displayed as 1.5 l (got: ${displayVol.amount} ${displayVol.unit})`);

// Test 6 – Breakfast Generation
console.log('\n- Phase 2 Test 6: Breakfast Generation');
const breakfastDish = window.StorageManager.addDish({
  name: 'Bún bò Huế sáng',
  category: 'single',
  mealTypes: ['breakfast'],
  enabled: true
});

// Case A: Attendance > 0
const weekMenuWithAtt = window.MenuGenerator.generateWeeklyMenu(new Date(2026, 8, 28), window.StorageManager.getDishes(), null, null);
assert(weekMenuWithAtt.days[0].meals.breakfast !== undefined, 'Day has meals.breakfast object');
if (weekMenuWithAtt.days[0].meals.breakfast.attendance.memberIds.length > 0) {
  assert(weekMenuWithAtt.days[0].meals.breakfast.single !== null, 'Breakfast dish created when attendance > 0');
  const pickedDish = window.StorageManager.getDishById(weekMenuWithAtt.days[0].meals.breakfast.single.id);
  assert(pickedDish && (pickedDish.category === 'single' || pickedDish.mealTypes.includes('breakfast')), 'Generated dish has breakfast mealType');
}

// Case B: Attendance = 0 -> breakfast.single is null
const weekMenuZeroAtt = JSON.parse(JSON.stringify(weekMenuWithAtt));
window.MenuGenerator.updateMealAttendance(weekMenuZeroAtt, 0, 'breakfast', [], true);
const regenZero = window.MenuGenerator.generateWeeklyMenu(new Date(2026, 8, 28), window.StorageManager.getDishes(), weekMenuZeroAtt, null);
assert(regenZero.days[0].meals.breakfast.single === null, 'Breakfast has no dish when attendance = 0');

// Test 7 – Lunch/Dinner Filter
console.log('\n- Phase 2 Test 7: Lunch/Dinner Filter');
const dinnerSpecialDish = window.StorageManager.addDish({
  name: 'Lẩu cua đồng chỉ ăn tối',
  category: 'main',
  mealTypes: ['dinner'],
  enabled: true
});
const lunchSpecialDish = window.StorageManager.addDish({
  name: 'Bún đậu mắm tôm chỉ ăn trưa',
  category: 'main',
  mealTypes: ['lunch'],
  enabled: true
});

for (let i = 0; i < 3; i++) {
  const testFilterMenu = window.MenuGenerator.generateWeeklyMenu(new Date(2026, 9, 5 + i * 7), window.StorageManager.getDishes(), null, null);
  testFilterMenu.days.forEach(d => {
    if (d.meals.lunch.main) {
      assert(d.meals.lunch.main.id !== dinnerSpecialDish.id, 'Lunch does not pick dinner-only dish');
    }
    if (d.meals.dinner.main) {
      assert(d.meals.dinner.main.id !== lunchSpecialDish.id, 'Dinner does not pick lunch-only dish');
    }
  });
}

// Test 8 – Legacy Menu Migration
console.log('\n- Phase 2 Test 8: Legacy Menu Migration');
const v1LegacyWeek = {
  weekId: '2026-06-01',
  days: [
    {
      date: '2026-06-01',
      dayLabel: 'Thứ Hai',
      isEaten: true,
      main: { id: 'v1_m1', name: 'Sườn xào chua ngọt', category: 'main', manual: true },
      vegetable: { id: 'v1_v1', name: 'Rau bí xào', category: 'vegetable', manual: false },
      soup: { id: 'v1_s1', name: 'Canh sườn chua', category: 'soup', manual: false },
      side: null,
      attendance: {
        breakfast: { memberIds: [], manualOverride: false },
        lunch: { memberIds: [], manualOverride: false },
        dinner: { memberIds: ['v1_user_1'], manualOverride: true }
      }
    }
  ]
};
window.StorageManager.saveMenuForWeek('2026-06-01', v1LegacyWeek);
const reloadedV1 = window.StorageManager.getMenuForWeek('2026-06-01');

assert(reloadedV1.days[0].meals !== undefined, 'Normalized legacy day has meals object');
assert(reloadedV1.days[0].meals.dinner.main.id === 'v1_m1', 'meals.dinner.main.id preserved');
assert(reloadedV1.days[0].meals.dinner.main.manual === true, 'meals.dinner.main manual flag preserved');
assert(reloadedV1.days[0].meals.dinner.isEaten === true, 'meals.dinner.isEaten preserved');
assert(reloadedV1.days[0].meals.dinner.attendance.memberIds.includes('v1_user_1'), 'meals.dinner attendance preserved');
assert(reloadedV1.days[0].meals.dinner.attendance.manualOverride === true, 'meals.dinner attendance manualOverride preserved');

// Test 9 – Meal-level Eaten Preservation
console.log('\n- Phase 2 Test 9: Meal-level Eaten Preservation');
const weekEatenPreserve = window.MenuGenerator.generateWeeklyMenu(new Date(2026, 8, 28), window.StorageManager.getDishes(), null, null);
// Mark Monday dinner as eaten, Monday lunch as uneaten
weekEatenPreserve.days[0].meals.dinner.isEaten = true;
weekEatenPreserve.days[0].meals.lunch.isEaten = false;
const originalDinnerMain = weekEatenPreserve.days[0].meals.dinner.main;

const regenEaten = window.MenuGenerator.generateWeeklyMenu(new Date(2026, 8, 28), window.StorageManager.getDishes(), weekEatenPreserve, null);
assert(regenEaten.days[0].meals.dinner.main.id === originalDinnerMain.id, 'Eaten dinner dish strictly preserved across regenerate');
assert(regenEaten.days[0].meals.dinner.isEaten === true, 'Eaten dinner isEaten remains true');

// Test 10 – lastUsedAt Across Meals
console.log('\n- Phase 2 Test 10: lastUsedAt Across Meals');
const bDishSync = window.StorageManager.addDish({ name: 'Cháo sườn sáng', category: 'single', mealTypes: ['breakfast'], enabled: true });
const dDishSync = window.StorageManager.addDish({ name: 'Cá chép om dưa tối', category: 'main', mealTypes: ['dinner'], enabled: true });

const syncWeekTest = {
  weekId: '2026-09-07',
  days: [
    {
      date: '2026-09-07', // Monday
      meals: {
        breakfast: { single: { id: bDishSync.id, name: bDishSync.name }, isEaten: true, attendance: { memberIds: ['u1'] } },
        lunch: { main: null, isEaten: false, attendance: { memberIds: [] } },
        dinner: { main: null, isEaten: false, attendance: { memberIds: [] } }
      }
    },
    {
      date: '2026-09-08', // Tuesday
      meals: {
        breakfast: { single: null, isEaten: false, attendance: { memberIds: [] } },
        lunch: { main: null, isEaten: false, attendance: { memberIds: [] } },
        dinner: { main: { id: dDishSync.id, name: dDishSync.name }, isEaten: true, attendance: { memberIds: ['u1'] } }
      }
    }
  ]
};
window.StorageManager.saveMenuForWeek('2026-09-07', syncWeekTest);
window.StorageManager.syncDishLastUsedAtFromMenus();

const syncedB = window.StorageManager.getDishById(bDishSync.id);
const syncedD = window.StorageManager.getDishById(dDishSync.id);
const expectedMonTs = new Date('2026-09-07T00:00:00').getTime();
const expectedTueTs = new Date('2026-09-08T00:00:00').getTime();
assert(syncedB.lastUsedAt === expectedMonTs, `Breakfast dish lastUsedAt is Monday timestamp (got: ${syncedB.lastUsedAt})`);
assert(syncedD.lastUsedAt === expectedTueTs, `Dinner dish lastUsedAt is Tuesday timestamp (got: ${syncedD.lastUsedAt})`);

// Unmark breakfast and re-sync
syncWeekTest.days[0].meals.breakfast.isEaten = false;
window.StorageManager.saveMenuForWeek('2026-09-07', syncWeekTest);
window.StorageManager.syncDishLastUsedAtFromMenus();
const unmarkB = window.StorageManager.getDishById(bDishSync.id);
assert(unmarkB.lastUsedAt === null, 'Unmarked breakfast dish lastUsedAt recalculated to null');

// Test 11 – Shopping Aggregation
console.log('\n- Phase 2 Test 11: Shopping Aggregation');
const porkDishA = window.StorageManager.addDish({
  name: 'Thịt rim tiêu',
  category: 'main',
  baseServings: 4,
  mealTypes: ['lunch'],
  enabled: true,
  ingredients: [{ id: 'ing_pork_a', name: 'Thịt lợn', quantity: 500, unit: 'g' }]
});
const porkDishB = window.StorageManager.addDish({
  name: 'Thịt kho củ cải',
  category: 'main',
  baseServings: 4,
  mealTypes: ['dinner'],
  enabled: true,
  ingredients: [{ id: 'ing_pork_b', name: 'Thịt lợn', quantity: 750, unit: 'g' }]
});

// 4 standard members = 4 standard servings -> scale = 4 / 4 = 1.0
const shoppingMembersTest = [
  { id: 'sm_1', name: 'Thành viên 1', portionSize: 'standard' },
  { id: 'sm_2', name: 'Thành viên 2', portionSize: 'standard' },
  { id: 'sm_3', name: 'Thành viên 3', portionSize: 'standard' },
  { id: 'sm_4', name: 'Thành viên 4', portionSize: 'standard' }
];

const testShopWeek = {
  weekId: '2026-12-07',
  days: [
    {
      date: '2026-12-07',
      meals: {
        lunch: { main: porkDishA, attendance: { memberIds: ['sm_1', 'sm_2', 'sm_3', 'sm_4'] } },
        dinner: { main: porkDishB, attendance: { memberIds: ['sm_1', 'sm_2', 'sm_3', 'sm_4'] } }
      }
    }
  ]
};

const shopAgg = window.ShoppingService.aggregateWeeklyIngredients(testShopWeek, window.StorageManager.getDishes(), shoppingMembersTest);
const porkAggItem = shopAgg.items.find(i => i.canonicalName.toLowerCase() === 'thịt lợn');
assert(porkAggItem !== undefined, 'Thịt lợn aggregated into shopping list');
assert(porkAggItem.totalQuantity === 1250, `Aggregated total quantity is 1250g (got: ${porkAggItem.totalQuantity})`);
assert(porkAggItem.displayAmount === 1.25 && porkAggItem.displayUnit === 'kg', `Display amount is 1.25 kg (got: ${porkAggItem.displayAmount} ${porkAggItem.displayUnit})`);

// Test 12 – Shopping Ignores No Attendance
console.log('\n- Phase 2 Test 12: Shopping Ignores No Attendance');
const shopWeekNoAttendees = {
  weekId: '2026-12-14',
  days: [
    {
      date: '2026-12-14',
      meals: {
        lunch: { main: porkDishA, attendance: { memberIds: [] } }
      }
    }
  ]
};
const resNoAtt = window.ShoppingService.aggregateWeeklyIngredients(shopWeekNoAttendees, window.StorageManager.getDishes(), shoppingMembersTest);
assert(resNoAtt.items.length === 0, 'Shopping list excludes meals with 0 attendees');

// Test 13 – Missing Recipe Warning
console.log('\n- Phase 2 Test 13: Missing Recipe Warning');
const emptyRecipeDish = window.StorageManager.addDish({
  name: 'Món đặc biệt chưa ghi nguyên liệu',
  category: 'main',
  mealTypes: ['lunch'],
  enabled: true,
  ingredients: []
});
const shopWeekEmptyRecipe = {
  weekId: '2026-12-21',
  days: [
    {
      date: '2026-12-21',
      meals: {
        lunch: { main: emptyRecipeDish, attendance: { memberIds: ['sm_1'] } }
      }
    }
  ]
};
const resMissing = window.ShoppingService.aggregateWeeklyIngredients(shopWeekEmptyRecipe, window.StorageManager.getDishes(), shoppingMembersTest);
assert(resMissing.missingDishes.length > 0, 'Missing recipe list identifies dishes without recipe');
assert(resMissing.missingDishes.some(d => d.name === 'Món đặc biệt chưa ghi nguyên liệu'), 'Correct dish name reported in missing recipes');

// Test 14 – Shopping Check State
console.log('\n- Phase 2 Test 14: Shopping Check State');
const testWeekCheckKey = '2026-12-28';
window.StorageManager.toggleShoppingCheck(testWeekCheckKey, 'thịt lợn|g');
let loadedChecks = window.StorageManager.getShoppingChecks(testWeekCheckKey);
assert(loadedChecks['thịt lợn|g'] === true, 'Shopping check marked as purchased');

// Reload and verify persistence
loadedChecks = window.StorageManager.getShoppingChecks(testWeekCheckKey);
assert(loadedChecks['thịt lợn|g'] === true, 'Shopping check state persisted across reloads');

// Toggle again to uncheck
window.StorageManager.toggleShoppingCheck(testWeekCheckKey, 'thịt lợn|g');
loadedChecks = window.StorageManager.getShoppingChecks(testWeekCheckKey);
assert(loadedChecks['thịt lợn|g'] === false, 'Shopping check unmarks correctly');

// Test 15 – Deleted Member in Shopping
console.log('\n- Phase 2 Test 15: Deleted Member in Shopping');
const shopWeekDeletedMember = {
  weekId: '2027-01-04',
  days: [
    {
      date: '2027-01-04',
      meals: {
        lunch: { main: porkDishA, attendance: { memberIds: ['unknown_deleted_member_id_999'] } }
      }
    }
  ]
};
let shoppingDeletedSafe = false;
try {
  const resDel = window.ShoppingService.aggregateWeeklyIngredients(shopWeekDeletedMember, window.StorageManager.getDishes(), shoppingMembersTest);
  assert(resDel !== null, 'Shopping aggregated without crash when attendance contains deleted member ID');
  shoppingDeletedSafe = true;
} catch (err) {
  assert(false, `Shopping crashed on deleted member: ${err.message}`);
}
assert(shoppingDeletedSafe, 'Deleted member safely ignored in shopping calculation');

// Test 16 – Week Boundary
console.log('\n- Phase 2 Test 16: Week Boundary');
// Thursday Dec 31, 2026 -> next Monday must be Jan 4, 2027
const dec31Date = new Date(2026, 11, 31);
const nextMonBoundary = window.MenuGenerator.getNextMonday(dec31Date);
assert(nextMonBoundary.getFullYear() === 2027 && nextMonBoundary.getMonth() === 0 && nextMonBoundary.getDate() === 4, 'Next Monday across New Year boundary is Jan 4, 2027');
const nextWeekIdBoundary = window.MenuGenerator.getWeekId(nextMonBoundary);
assert(nextWeekIdBoundary === '2027-01-04', `Boundary weekId correctly formatted: ${nextWeekIdBoundary}`);

console.log('\n🎉 ALL SUITES 1-11 AND ALL PHASE 2 TESTS PASSED 100% PERFECTLY!\n');



