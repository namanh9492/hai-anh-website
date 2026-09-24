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

console.log('\n🎉 ALL SUITES AND REGRESSION TESTS A-H PASSED PERFECTLY!\n');

