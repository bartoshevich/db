/**
 * Test suite for nps-calculator.js
 * Uses a minimal DOM stub — no jsdom required.
 * Run: node scripts/test-nps-calculator.js
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Minimal DOM stub factory
// ---------------------------------------------------------------------------

function makeElement(id, opts = {}) {
  let _textContent = '';
  return {
    id,
    value: opts.value ?? '',
    get textContent() { return _textContent; },
    // Mimic browser: assigning any value coerces to string
    set textContent(v) { _textContent = String(v); },
    hidden: false,
    dataset: {},
    _listeners: {},
    addEventListener(type, fn) {
      this._listeners[type] = fn;
    },
    focus() {},
    removeAttribute(attr) {
      if (attr === 'hidden') this.hidden = false;
      if (attr === 'data-signal') delete this.dataset.signal;
    },
    setAttribute(attr, val) {
      if (attr === 'hidden') this.hidden = true;
    },
  };
}

/**
 * Build a fresh DOM stub and return { document, elements, alertCapture }.
 * inputValues: { id: stringValue } for the nine matrix inputs.
 */
function buildDOM(inputValues = {}) {
  const elements = {};
  const IDS = [
    'btn-calc-matrix',
    'a-prom', 'a-neu', 'a-det',
    'b-prom', 'b-neu', 'b-det',
    'c-prom', 'c-neu', 'c-det',
    'res-total-nps',
    'res-a-nps',
    'res-diagnosis',
    'matrix-result-box',
    'nps-calc-error',
  ];

  for (const id of IDS) {
    elements[id] = makeElement(id);
  }

  // Match initial HTML state: these elements start hidden
  elements['nps-calc-error'].hidden = true;
  elements['matrix-result-box'].hidden = true;

  // Set input values
  for (const [id, val] of Object.entries(inputValues)) {
    if (elements[id]) elements[id].value = String(val);
  }

  let alertCapture = null;

  const document = {
    getElementById: id => elements[id] ?? null,
    querySelector: () => null,
  };

  return { document, elements, get alertCapture() { return alertCapture; }, setAlert(v) { alertCapture = v; } };
}

// ---------------------------------------------------------------------------
// Load the calculator module with a custom global.document per test
// ---------------------------------------------------------------------------

// Because nps-calculator.js uses `document` as a global, we inject it before
// importing. Since ES modules cache after first import we use a thin wrapper:
// we import the module once, grab `init`, then for each test we swap
// global.document before calling init() + click.

const MODULE_PATH = path.resolve(
  '/var/home/newuser/Projects/sites/db/src/assets/scripts/nps-calculator.js'
);

const { init } = await import(pathToFileURL(MODULE_PATH).href);

// ---------------------------------------------------------------------------
// Test runner helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    results.push(`  ok  ${label}`);
  } else {
    failed++;
    results.push(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
  }
}

/**
 * Run one test scenario.
 * @param {string} id           Test ID string e.g. "T1"
 * @param {string} label        Human label
 * @param {object} inputs       { 'a-prom': 60, ... }  (numbers OK, converted to string)
 * @param {Function} check      Receives { elements, alertCapture } — call assert() inside
 */
async function runTest(id, label, inputs, check) {
  // Convert numbers to strings for the DOM stub
  const strInputs = Object.fromEntries(
    Object.entries(inputs).map(([k, v]) => [k, String(v)])
  );

  const dom = buildDOM(strInputs);

  // Inject global.document + global.alert for this test
  global.document = dom.document;
  global.alert = msg => dom.setAlert(msg);

  // Run init() — this registers the click listener
  init();

  // Simulate button click
  const btn = dom.elements['btn-calc-matrix'];
  if (btn._listeners['click']) {
    btn._listeners['click'].call(btn);
  }

  results.push('');
  results.push(`--- ${id}: ${label} ---`);
  check(dom);
}

// ---------------------------------------------------------------------------
// T E S T S
// ---------------------------------------------------------------------------

// T1: Only group A — article example
// A: 60 prom / 30 neu / 10 det → grandTotal=100, totalNPS=50, aNPS=50, signal=good
await runTest('T1', 'Только группа A — пример из статьи',
  { 'a-prom': 60, 'a-neu': 30, 'a-det': 10 },
  ({ elements }) => {
    assert('totalNPS = 50', elements['res-total-nps'].textContent === '50',
      `got "${elements['res-total-nps'].textContent}"`);
    assert('aNPS = 50', elements['res-a-nps'].textContent === '50',
      `got "${elements['res-a-nps'].textContent}"`);
    assert('signal = good', elements['res-a-nps'].dataset.signal === 'good',
      `got "${elements['res-a-nps'].dataset.signal}"`);
    assert('диагноз: Ядро бизнеса лояльно',
      elements['res-diagnosis'].textContent.startsWith('Ядро бизнеса лояльно'),
      `got "${elements['res-diagnosis'].textContent.slice(0, 40)}..."`);
  }
);

// T2: Group A in minus — critical threat
// A:5/5/15, B:20/10/5, C:30/10/5 → grandTotal=105, totalNPS=29, aNPS=-40
await runTest('T2', 'Группа A в минусе — критическая угроза',
  { 'a-prom': 5, 'a-neu': 5, 'a-det': 15,
    'b-prom': 20, 'b-neu': 10, 'b-det': 5,
    'c-prom': 30, 'c-neu': 10, 'c-det': 5 },
  ({ elements }) => {
    assert('totalNPS = 29', elements['res-total-nps'].textContent === '29',
      `got "${elements['res-total-nps'].textContent}"`);
    assert('aNPS = -40', elements['res-a-nps'].textContent === '-40',
      `got "${elements['res-a-nps'].textContent}"`);
    assert('signal = bad', elements['res-a-nps'].dataset.signal === 'bad',
      `got "${elements['res-a-nps'].dataset.signal}"`);
    assert('диагноз: Критическая угроза',
      elements['res-diagnosis'].textContent.startsWith('Критическая угроза'),
      `got "${elements['res-diagnosis'].textContent.slice(0, 40)}..."`);
  }
);

// T3: Group A good (aNPS=50), but total even better (totalNPS=75) — STILL "Ядро лояльно"
// A:20/5/5, B:40/5/0, C:20/5/0 → grandTotal=100, totalNPS=75, aNPS=50
// aNPS>=30 branch fires BEFORE aNPS<totalNPS check → "Ядро бизнеса лояльно"
await runTest('T3', 'Группа A хорошая (aNPS=50), totalNPS=75 — ветка "Ядро" приоритетнее "Тревоги"',
  { 'a-prom': 20, 'a-neu': 5, 'a-det': 5,
    'b-prom': 40, 'b-neu': 5, 'b-det': 0,
    'c-prom': 20, 'c-neu': 5, 'c-det': 0 },
  ({ elements }) => {
    assert('totalNPS = 75', elements['res-total-nps'].textContent === '75',
      `got "${elements['res-total-nps'].textContent}"`);
    assert('aNPS = 50', elements['res-a-nps'].textContent === '50',
      `got "${elements['res-a-nps'].textContent}"`);
    assert('signal = good', elements['res-a-nps'].dataset.signal === 'good',
      `got "${elements['res-a-nps'].dataset.signal}"`);
    assert('диагноз: Ядро бизнеса лояльно (НЕ Сигнал тревоги)',
      elements['res-diagnosis'].textContent.startsWith('Ядро бизнеса лояльно'),
      `got "${elements['res-diagnosis'].textContent.slice(0, 40)}..."`);
  }
);

// T4: Group A weak (aNPS=17), below totalNPS=36 — warning
// A:10/15/5, B:10/5/0, C:5/5/0 → grandTotal=55, totalNPS=36, aNPS=17
await runTest('T4', 'Группа A слабая (aNPS=17 < totalNPS=36) — Сигнал тревоги',
  { 'a-prom': 10, 'a-neu': 15, 'a-det': 5,
    'b-prom': 10, 'b-neu': 5, 'b-det': 0,
    'c-prom': 5, 'c-neu': 5, 'c-det': 0 },
  ({ elements }) => {
    assert('totalNPS = 36', elements['res-total-nps'].textContent === '36',
      `got "${elements['res-total-nps'].textContent}"`);
    assert('aNPS = 17', elements['res-a-nps'].textContent === '17',
      `got "${elements['res-a-nps'].textContent}"`);
    assert('signal = warn', elements['res-a-nps'].dataset.signal === 'warn',
      `got "${elements['res-a-nps'].dataset.signal}"`);
    assert('диагноз: Сигнал тревоги',
      elements['res-diagnosis'].textContent.startsWith('Сигнал тревоги'),
      `got "${elements['res-diagnosis'].textContent.slice(0, 40)}..."`);
  }
);

// T5: Group A neutral (aNPS=17), totalNPS=-42 — aNPS >= totalNPS → "Стабилен, но уязвим"
// A:10/15/5, B:0/0/30 → grandTotal=60, totalNPS=-42, aNPS=17
await runTest('T5', 'Группа A нейтральна (aNPS=17 >= totalNPS=-42) — Стабилен, но уязвим',
  { 'a-prom': 10, 'a-neu': 15, 'a-det': 5,
    'b-prom': 0, 'b-neu': 0, 'b-det': 30 },
  ({ elements }) => {
    assert('totalNPS = -42', elements['res-total-nps'].textContent === '-42',
      `got "${elements['res-total-nps'].textContent}"`);
    assert('aNPS = 17', elements['res-a-nps'].textContent === '17',
      `got "${elements['res-a-nps'].textContent}"`);
    assert('signal = warn', elements['res-a-nps'].dataset.signal === 'warn',
      `got "${elements['res-a-nps'].dataset.signal}"`);
    assert('диагноз: Бизнес стабилен, но уязвим',
      elements['res-diagnosis'].textContent.startsWith('Бизнес стабилен, но уязвим'),
      `got "${elements['res-diagnosis'].textContent.slice(0, 40)}..."`);
  }
);

// T6: Group A empty — no data
// Only B: 20/5/0 → aTotal=0, aNPS=null
await runTest('T6', 'Группа A пустая — нет данных',
  { 'b-prom': 20, 'b-neu': 5, 'b-det': 0 },
  ({ elements }) => {
    assert('aNPS textContent = "Нет данных"', elements['res-a-nps'].textContent === 'Нет данных',
      `got "${elements['res-a-nps'].textContent}"`);
    assert('data-signal отсутствует', elements['res-a-nps'].dataset.signal === undefined,
      `got "${elements['res-a-nps'].dataset.signal}"`);
    assert('диагноз: Для точного диагноза',
      elements['res-diagnosis'].textContent.startsWith('Для точного диагноза'),
      `got "${elements['res-diagnosis'].textContent.slice(0, 40)}..."`);
  }
);

// T7: All cells empty — inline error shown, result box stays hidden
await runTest('T7', 'Все ячейки пусты — инлайн-ошибка',
  {},
  ({ elements }) => {
    assert('ошибка показана (hidden=false)', elements['nps-calc-error'].hidden === false,
      `hidden: ${elements['nps-calc-error'].hidden}`);
    assert('result-box остался скрытым', elements['matrix-result-box'].hidden === true,
      `hidden: ${elements['matrix-result-box'].hidden}`);
    assert('диагноз не установлен', elements['res-diagnosis'].textContent === '',
      `got "${elements['res-diagnosis'].textContent}"`);
  }
);

// T8: data-signal resets when switching from A-filled to A-empty
// Step 1: A:5/0/20 → aNPS=-60, signal="bad"
// Step 2: clear A, set B:10/0/0 → aNPS=null, signal attribute REMOVED
{
  // Step 1 — pre-populate with bad signal
  const dom1 = buildDOM({ 'a-prom': '5', 'a-neu': '0', 'a-det': '20' });
  global.document = dom1.document;
  global.alert = msg => dom1.setAlert(msg);
  init();
  dom1.elements['btn-calc-matrix']._listeners['click'].call(dom1.elements['btn-calc-matrix']);

  const signalAfterStep1 = dom1.elements['res-a-nps'].dataset.signal;

  // Step 2 — same DOM object: clear A, set B
  dom1.elements['a-prom'].value = '0';
  dom1.elements['a-neu'].value = '0';
  dom1.elements['a-det'].value = '0';
  dom1.elements['b-prom'].value = '10';

  dom1.elements['btn-calc-matrix']._listeners['click'].call(dom1.elements['btn-calc-matrix']);

  results.push('');
  results.push('--- T8: data-signal сбрасывается при смене A→пусто ---');
  assert('step1: signal = bad', signalAfterStep1 === 'bad',
    `got "${signalAfterStep1}"`);
  assert('step2: aNPS = "Нет данных"', dom1.elements['res-a-nps'].textContent === 'Нет данных',
    `got "${dom1.elements['res-a-nps'].textContent}"`);
  assert('step2: data-signal атрибут удалён', dom1.elements['res-a-nps'].dataset.signal === undefined,
    `got "${dom1.elements['res-a-nps'].dataset.signal}"`);
}

// T9: Boundary aNPS=0 — standalone A:10/20/10 → totalNPS=0, aNPS=0, "Стабилен но уязвим"
// (aNPS=0 is NOT <0, NOT >=30, NOT < totalNPS(=0) → else branch)
await runTest('T9', 'Граничное значение aNPS=0 — signal=warn, диагноз "Стабилен но уязвим"',
  { 'a-prom': 10, 'a-neu': 20, 'a-det': 10 },
  ({ elements }) => {
    assert('totalNPS = 0', elements['res-total-nps'].textContent === '0',
      `got "${elements['res-total-nps'].textContent}"`);
    assert('aNPS = 0', elements['res-a-nps'].textContent === '0',
      `got "${elements['res-a-nps'].textContent}"`);
    assert('signal = warn', elements['res-a-nps'].dataset.signal === 'warn',
      `got "${elements['res-a-nps'].dataset.signal}"`);
    // aNPS(0) is NOT < totalNPS(0) — goes to else
    assert('диагноз: Бизнес стабилен, но уязвим',
      elements['res-diagnosis'].textContent.startsWith('Бизнес стабилен, но уязвим'),
      `got "${elements['res-diagnosis'].textContent.slice(0, 40)}..."`);
  }
);

// T10: Boundary aNPS=30 exactly — signal=good, "Ядро бизнеса лояльно"
// aP=9, aN=8, aD=3 → aTotal=20, aNPS=round((9-3)/20*100)=30
await runTest('T10', 'Граничное значение aNPS=30 ровно — signal=good, Ядро лояльно',
  { 'a-prom': 9, 'a-neu': 8, 'a-det': 3 },
  ({ elements }) => {
    assert('aNPS = 30', elements['res-a-nps'].textContent === '30',
      `got "${elements['res-a-nps'].textContent}"`);
    assert('signal = good', elements['res-a-nps'].dataset.signal === 'good',
      `got "${elements['res-a-nps'].dataset.signal}"`);
    assert('диагноз: Ядро бизнеса лояльно',
      elements['res-diagnosis'].textContent.startsWith('Ядро бизнеса лояльно'),
      `got "${elements['res-diagnosis'].textContent.slice(0, 40)}..."`);
  }
);

// ---------------------------------------------------------------------------
// Results summary
// ---------------------------------------------------------------------------

console.log('\n=== NPS Calculator Test Suite ===\n');
for (const line of results) {
  if (line.startsWith('  ok  ')) {
    console.log(`  ✅ ${line.slice(6)}`);
  } else if (line.startsWith('  FAIL  ')) {
    console.log(`  ❌ ${line.slice(8)}`);
  } else {
    console.log(line);
  }
}

const total = passed + failed;
console.log(`\nИТОГО: ${passed}/${total} пройдено`);

if (failed > 0) {
  process.exit(1);
}
