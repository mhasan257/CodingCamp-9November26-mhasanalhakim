# Design Document

## Overview

The Expense & Budget Visualizer is a fully client-side, single-page web application built with HTML, CSS, and Vanilla JavaScript. It allows users to record spending transactions, view a running total balance, browse a scrollable transaction history, and understand their spending distribution via a Chart.js pie chart. Additional features include dark/light mode, custom categories, a spending limit highlight, transaction sorting, and a monthly summary view. All data is persisted in the browser's Local Storage — no server, build tool, or framework is involved.

The app is delivered as three files:

```
index.html          — markup and Chart.js CDN script tag
css/style.css       — all styles, responsive breakpoints, card layout, theme variables
js/app.js           — all application logic
```

### Design Goals

- **Zero dependencies beyond Chart.js** — loaded via CDN, pinned to a stable version.
- **Single source of truth** — the in-memory `transactions` array always mirrors Local Storage and drives every UI update.
- **Responsive and accessible** — card-based layout, WCAG 2.1 AA contrast, works from 320 px to 1440 px.
- **Predictable update cycle** — every mutation (add / delete) calls `renderAll()`, which repaints the list, balance, chart, and monthly summary atomically.
- **Beginner-friendly** — no bundlers, no transpilers, no build steps; open `index.html` in a browser and it works.

---

## Architecture

The application follows a simple **MVC-lite** pattern entirely within `js/app.js`:

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  (DOM structure, Chart.js CDN script tag, app.js defer)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ DOM events (submit, click, input)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        js/app.js                            │
│                                                             │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────┐  │
│  │  Controllers  │──▶│   State / Model  │──▶│    View    │  │
│  │ (event hdlrs) │   │  transactions[]  │   │  (render   │  │
│  │               │   │  categories[]    │   │   fns)     │  │
│  │               │   │  spendingLimit   │   │            │  │
│  │               │   │  currentSort     │   │            │  │
│  └──────────────┘   └──────────────────┘   └────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
                    Browser Local Storage
           ┌──────────────────────────────────────┐
           │  ebv_transactions  — JSON array       │
           │  ebv_categories    — JSON array       │
           │  ebv_limit         — numeric string   │
           │  ebv_theme         — "light" | "dark" │
           └──────────────────────────────────────┘
```

### Data Flow

1. **Page load** — `App.init()` calls each `StorageService.load*()` function, populates the in-memory state variables, then calls `renderAll()`.
2. **Add transaction** — `FormController.handleSubmit()` validates input, creates a `Transaction` object, appends it to `transactions`, calls `StorageService.saveTransactions()`, then calls `renderAll()`.
3. **Delete transaction** — `ListController.handleDelete(id)` filters out the entry, saves, and calls `renderAll()`.
4. **Sort** — selecting a sort option updates `currentSort`, then calls `renderTransactionList()` (sorts a copy, never the stored array).
5. **Theme toggle** — `ThemeController.handleToggle()` flips the `data-theme` attribute and saves to `ebv_theme`.
6. **Custom category** — `CategoryController.handleAdd()` appends to `categories`, saves to `ebv_categories`, rebuilds the dropdown.
7. **Spending limit** — `LimitController.handleChange()` saves the value to `ebv_limit`, then calls `renderBalance()`.

---

## Components and Interfaces

### 1. StorageService

Responsible for all Local Storage I/O and data integrity.

```js
// Storage keys — fixed and documented
const STORAGE_KEYS = {
  TRANSACTIONS: 'ebv_transactions',  // Req 5.1, 5.2
  CATEGORIES:   'ebv_categories',    // Req 13.3
  LIMIT:        'ebv_limit',         // Req 12.4
  THEME:        'ebv_theme'          // Req 10.3
};

StorageService = {
  loadTransactions()  → Transaction[]  // parses, validates, discards corrupt records
  saveTransactions(transactions: Transaction[]) → void
  loadCategories()    → string[]       // custom category names; [] on failure
  saveCategories(categories: string[]) → void
  loadLimit()         → number | null  // null if not set or invalid
  saveLimit(limit: number) → void
  loadTheme()         → 'light' | 'dark'  // defaults to 'light'
  saveTheme(theme: string) → void
}
```

- All `load*()` methods wrap `JSON.parse` in `try/catch`; on failure they return the safe default and display a warning banner.
- `loadTransactions()` additionally filters each record — any record missing `id`, `name`, `amount`, `category`, or `date`, or where `amount` is not a finite positive number, is silently discarded.

### 2. State (in-memory)

Top-level variables in `app.js` that mirror storage and drive all renders:

```js
let transactions = [];   // Transaction[]
let categories   = [];   // string[] — custom categories only
let spendingLimit = null; // number | null
let currentSort  = 'default'; // 'default' | 'amount-asc' | 'amount-desc' | 'category-asc'
let chartInstance = null; // Chart.js instance
```

### 3. Validator

Pure functions; no side effects.

```js
Validator = {
  validateForm(name: string, amount: string, category: string) → ValidationResult
}

// ValidationResult
{
  valid: boolean,
  errors: {
    name?:     string,  // error message for Item Name field
    amount?:   string,  // error message for Amount field
    category?: string   // error message for Category field
  }
}
```

Rules:
- `name`: non-empty after `.trim()`, max 100 characters.
- `amount`: parses to a finite positive number (greater than 0).
- `category`: non-empty string, must be one of the current allowed categories (defaults + custom).

### 4. FormController

```js
FormController = {
  init()          → void   // attaches 'submit' event listener to the form
  handleSubmit(e) → void   // validates, creates Transaction, delegates to model + storage
  showErrors(errors) → void  // renders inline error <span> next to each invalid field
  clearErrors()   → void
  resetForm()     → void   // resets all fields to placeholder/empty state
}
```

### 5. ListController

```js
ListController = {
  init()              → void   // attaches delegated 'click' listener on list container
  handleDelete(id: string) → void  // removes from transactions, saves, renderAll()
}
```

### 6. SortController

```js
SortController = {
  init()          → void   // attaches 'change' listeners on sort control buttons/select
  handleSort(option: string) → void  // sets currentSort, calls renderTransactionList()
}
```

### 7. ThemeController

```js
ThemeController = {
  init()          → void   // reads ebv_theme, applies data-theme attribute
  handleToggle()  → void   // flips theme, updates attribute, saves to storage
}
```

### 8. CategoryController

```js
CategoryController = {
  init()          → void   // restores custom categories, rebuilds dropdown
  handleAdd()     → void   // validates name, appends to categories[], saves, rebuilds dropdown
  buildDropdown() → void   // repopulates <select> with defaults + custom categories
}
```

### 9. LimitController

```js
LimitController = {
  init()          → void   // reads ebv_limit, populates limit input, calls renderBalance()
  handleChange(value: string) → void  // parses, saves, calls renderBalance()
}
```

### 10. Render Functions

Each render function reads from the in-memory state and updates only its section of the DOM:

```js
renderTransactionList() → void
// Sorts a COPY of transactions by currentSort, builds list HTML, handles empty state

renderBalance() → void
// Sums transactions, formats to 2dp, toggles 'balance--exceeded' CSS class

renderChart() → void
// Calls sumByCategory(), updates chartInstance.data or creates/destroys instance
// Shows "no data" message when no transactions exist

renderMonthlySummary() → void
// Groups transactions by date YYYY-MM, calculates monthly totals, renders list/table

renderAll() → void
// Calls all four render functions above in sequence
```

### 11. App (bootstrap)

```js
App = {
  init() → void
  // Called on 'DOMContentLoaded'
  // 1. Load all data from storage into state variables
  // 2. Apply theme
  // 3. Init all controllers (attaches event listeners)
  // 4. Call renderAll()
}
```

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string}  id        - Unique string (Date.now() + Math.random(), or crypto.randomUUID())
 * @property {string}  name      - Item name, non-empty, trimmed, max 100 chars
 * @property {number}  amount    - Finite positive number (greater than 0)
 * @property {string}  category  - Category label (default or custom)
 * @property {string}  date      - Local date string YYYY-MM-DD, set via getLocalDateString()
 *                                 (NOT toISOString().slice(0,10)) so the date reflects the
 *                                 user's local calendar day, not the UTC day.
 */
```

The `date` field is **required** so the monthly summary (Requirement 14) can correctly group transactions by calendar month after page reloads.

The local date is produced by:

```js
// Local date (YYYY-MM-DD) — avoids UTC offset shifting the calendar day
function getLocalDateString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
```

### Local Storage Schema

| Key | Type | Description |
|---|---|---|
| `ebv_transactions` | JSON array of Transaction | Full transaction history |
| `ebv_categories` | JSON array of strings | Custom category names added by user |
| `ebv_limit` | Numeric string (e.g. `"150"`) | User-defined spending limit |
| `ebv_theme` | `"light"` or `"dark"` | Current UI theme preference |

**Example stored transaction:**
```json
{
  "id": "1731505200000-0.472",
  "name": "Coffee",
  "amount": 3.50,
  "category": "Food",
  "date": "2026-11-13"  // local calendar date — reflects the user's local time, not UTC
}
```

**Corruption rules** — a record is discarded silently if any of the following are true:
- Not a plain object.
- Missing any of: `id`, `name`, `amount`, `category`, `date`.
- `amount` is not a finite number, is ≤ 0, or is not a number type.
- `name` is not a non-empty string after trimming.

Valid records are always retained even when corrupt siblings exist (Requirement 5.6).

### ValidationResult

```js
/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {{ name?: string, amount?: string, category?: string }} errors
 */
```

---

## UI Layout

```
<html data-theme="light|dark">
  <body>
    <header>
      App title + theme toggle button (☀/🌙)
    </header>

    <main>
      <section class="card" id="balance-card">
        Balance display (sum, 2dp, currency symbol)
        [Optionally styled with .balance--exceeded class]
      </section>

      <section class="card" id="limit-section">
        Spending Limit: <input type="number"> (Req 12)
      </section>

      <section class="card" id="form-section">
        Add Transaction form:
          <input type="text" id="item-name">   + error span (Req 1)
          <input type="number" id="amount">    + error span
          <select id="category">               + error span
            <option disabled selected>Select category</option>
            <option>Food</option>
            <option>Transport</option>
            <option>Fun</option>
            <!-- custom categories appended dynamically -->
          </select>
          <button type="submit">Add</button>
      </section>

      <section class="card" id="category-section">
        Add Custom Category: <input type="text"> <button>Add</button> (Req 13)
      </section>

      <section class="card" id="sort-section">
        Sort by: [Amount ↑] [Amount ↓] [Category A-Z] (Req 11)
      </section>

      <div class="two-col-grid">
        <section class="card" id="list-section">
          Transaction List (scrollable, delete buttons, empty state) (Req 2)
        </section>

        <section class="card" id="chart-section">
          <canvas id="spending-chart"></canvas>
          <p id="chart-no-data" hidden>No spending data available.</p> (Req 4)
        </section>
      </div>

      <section class="card" id="monthly-section">
        Monthly Summary (list/table of YYYY-MM: total, empty state) (Req 14)
      </section>
    </main>

    <div id="warning-banner" hidden>...</div>
  </body>
</html>
```

---

## Responsive Layout

- **Mobile (≤ 768 px)**: single-column stacked layout; full-width cards.
- **Desktop (> 768 px)**: Transaction List and Pie Chart sit side-by-side in a two-column CSS Grid (`div.two-col-grid`).
- CSS custom properties (variables) drive the color scheme:

```css
:root {
  --bg-page:   #f0f0f0;
  --bg-card:   #ffffff;
  --text-main: #1a1a1a;
  --accent:    #4a90e2;
  --danger:    #e74c3c;
}

[data-theme="dark"] {
  --bg-page:   #1a1a2e;
  --bg-card:   #16213e;
  --text-main: #e0e0e0;
  --accent:    #7ec8e3;
  --danger:    #ff6b6b;
}
```

- Dark theme applied via `document.documentElement.setAttribute('data-theme', 'dark')`.
- `data-theme` on `<html>` means every element inherits the variables automatically — no JavaScript class toggling on individual elements needed.
- Text/background combinations must meet WCAG 2.1 AA (minimum 4.5:1 contrast ratio for normal text).

---

## Chart.js Integration

```js
// On first render with data:
chartInstance = new Chart(canvas, {
  type: 'pie',
  data: {
    labels: ['Food', 'Transport', ...],
    datasets: [{ data: [42.50, 10.00, ...], backgroundColor: PALETTE }]
  },
  options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
});

// On subsequent renders with data:
chartInstance.data.labels = newLabels;
chartInstance.data.datasets[0].data = newAmounts;
chartInstance.data.datasets[0].backgroundColor = newColors;
chartInstance.update();

// When no data exists:
if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
document.getElementById('chart-no-data').hidden = false;
```

**Color palette** — a predefined array of 12 distinct hex colors covers the default categories and most typical custom category usage. For categories beyond the palette, colors are generated using a golden-ratio hue step, which spreads hues evenly and avoids clustering for the number of categories realistic in this app (up to roughly 20–24 before visual overlap becomes possible). This is a practical approach suited to a beginner project where users are unlikely to add more than a handful of custom categories.

```js
const PALETTE = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
  '#9966FF', '#FF9F40', '#66BB6A', '#EC407A',
  '#26C6DA', '#FFA726', '#8D6E63', '#78909C'
];

// Golden-ratio hue step (~137.5°) spreads extra colors evenly around the hue wheel,
// avoiding the clustering that a fixed step causes. Colors will repeat after
// enough categories are added, but this is acceptable for typical usage
// (users are unlikely to need more than ~20 categories).
const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;
let hueAccumulator = 0;

function getCategoryColor(index) {
  if (index < PALETTE.length) return PALETTE[index];
  // Advance the hue by the golden-ratio step for each extra category
  hueAccumulator = (hueAccumulator + GOLDEN_RATIO_CONJUGATE) % 1;
  const hue = Math.round(hueAccumulator * 360);
  return `hsl(${hue}, 65%, 55%)`;
}
```

Note: `hueAccumulator` must be reset to `0` each time the full color array is rebuilt (i.e., whenever `renderChart()` recalculates colors from scratch) to ensure consistent color assignment across renders.

This approach produces visually distinct colors for typical usage (up to around 20 categories) and is well-suited to a beginner project. Colors may eventually repeat for a very large number of custom categories, but this is an acceptable trade-off given the realistic scope of the app. (Requirement 4.5, 13.5)

---

## Sorting

```js
let currentSort = 'default'; // 'default' | 'amount-asc' | 'amount-desc' | 'category-asc'

function getSortedTransactions() {
  const copy = [...transactions]; // never mutate the stored array
  if (currentSort === 'amount-asc')   copy.sort((a, b) => a.amount - b.amount);
  if (currentSort === 'amount-desc')  copy.sort((a, b) => b.amount - a.amount);
  if (currentSort === 'category-asc') copy.sort((a, b) => a.category.localeCompare(b.category));
  return copy; // 'default' returns insertion order
}
```

`renderTransactionList()` calls `getSortedTransactions()` to get the display order. The `transactions` array and `ebv_transactions` in Local Storage always store insertion order (Requirement 11.3).

---

## Monthly Summary

```js
function groupByMonth(transactions) {
  // Returns: { 'YYYY-MM': total, ... }
  return transactions.reduce((acc, tx) => {
    const month = tx.date.slice(0, 7); // 'YYYY-MM' from 'YYYY-MM-DD'
    acc[month] = (acc[month] || 0) + tx.amount;
    return acc;
  }, {});
}
```

`renderMonthlySummary()` calls `groupByMonth()`, sorts the keys chronologically, and renders each entry as `"Month YYYY — $X.XX"`. When the result is empty, a no-data message is shown (Requirement 14.5).

The `date` field on each transaction is set at creation time via `getLocalDateString()` and preserved exactly in Local Storage, so grouping by `tx.date.slice(0, 7)` (YYYY-MM) correctly reflects the user's local month after page reloads — not the UTC month that `toISOString()` would produce.

---

## Spending Limit

```js
function renderBalance() {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  balanceEl.textContent = '$' + total.toFixed(2);

  if (spendingLimit !== null && total > spendingLimit) {
    balanceEl.classList.add('balance--exceeded');
  } else {
    balanceEl.classList.remove('balance--exceeded');
  }
}
```

The `.balance--exceeded` CSS class applies a red border and warning color to the balance card. The limit input field is pre-populated on load from `ebv_limit` (Requirement 12.4).

---

## Theme Toggle

```js
// On load:
const savedTheme = StorageService.loadTheme(); // defaults to 'light'
document.documentElement.setAttribute('data-theme', savedTheme);
updateToggleButton(savedTheme);

// On toggle click:
function handleToggle() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  StorageService.saveTheme(next);
  updateToggleButton(next);
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction serialization round-trip

*For any* valid Transaction object (arbitrary `name`, `amount` in range 0.01–999,999.99, any valid `category`, any valid `date`), serializing it with `JSON.stringify` and deserializing it with `JSON.parse` SHALL produce an object where `name`, `amount`, `category`, and `date` each equal the original values exactly.

**Validates: Requirements 5.5, 2.5**

---

### Property 2: Validator correctness

*For any* valid input triple (non-whitespace name ≤ 100 chars, finite positive amount greater than 0, non-empty category string), `Validator.validateForm()` SHALL return `valid: true`. *For any* invalid input triple (whitespace-only name, amount ≤ 0, non-numeric string for amount, or empty category), `Validator.validateForm()` SHALL return `valid: false` with an error message in the corresponding field, and the `transactions` array SHALL remain unchanged.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Balance equals sum of transaction amounts

*For any* array of Transaction objects, `renderBalance()` SHALL display the arithmetic sum of all `amount` values formatted to exactly 2 decimal places. When the array is empty, the displayed balance SHALL be `0.00`.

**Validates: Requirements 3.1, 3.3**

---

### Property 4: Category spending proportions are correct

*For any* set of transactions grouped by category, the percentage value computed for each category segment SHALL equal that category's summed `amount` divided by the grand total, rounded to one decimal place, and no category with a summed amount of zero SHALL appear in the chart output.

**Validates: Requirements 4.1, 4.2**

---

### Property 5: Add then delete returns to prior state

*For any* initial `transactions` array and *any* valid new Transaction to add, performing `add(tx)` followed immediately by `remove(tx.id)` SHALL produce a `transactions` array with the same length and the same `renderBalance()` result as before the addition.

**Validates: Requirements 2.4, 3.2, 5.2**

---

### Property 6: Corrupt record isolation

*For any* JSON array stored in `ebv_transactions` that contains a mixture of valid Transaction objects and corrupt records (missing fields, non-finite amount, wrong types), `StorageService.loadTransactions()` SHALL return exactly the valid records — all valid records retained, all corrupt records discarded — without modifying the valid records.

**Validates: Requirements 5.6, 5.4, 3.5**

---

### Property 7: Sort order satisfies the sort criterion

*For any* array of transactions and *any* active sort option, the array returned by `getSortedTransactions()` SHALL satisfy the corresponding ordering invariant: amount-ascending means `∀ i < j: list[i].amount ≤ list[j].amount`; amount-descending means the reverse; category-ascending means `∀ i < j: list[i].category.localeCompare(list[j].category) ≤ 0`.

**Validates: Requirements 11.2**

---

### Property 8: Sort does not mutate storage

*For any* array of transactions saved to `ebv_transactions`, applying any sort option and calling `renderTransactionList()` SHALL leave the contents of `ebv_transactions` unchanged — the stored array always reflects insertion order.

**Validates: Requirements 11.3**

---

### Property 9: Spending limit highlight invariant

*For any* balance value `B` and spending limit value `L`, if `B > L` then the balance display element SHALL have the `balance--exceeded` CSS class applied; if `B ≤ L` or no limit is set, the class SHALL NOT be present.

**Validates: Requirements 12.2, 12.3**

---

### Property 10: Theme toggle is its own inverse

*For any* initial theme value (`"light"` or `"dark"`), calling `handleToggle()` once SHALL set `data-theme` to the opposite value, and calling `handleToggle()` a second time SHALL restore `data-theme` to the original value.

**Validates: Requirements 10.2**

---

### Property 11: Monthly grouping correctness

*For any* array of transactions with arbitrary `date` values (YYYY-MM-DD), `groupByMonth()` SHALL return an object whose keys are exactly the distinct YYYY-MM prefixes present in the transactions, and whose values are exactly the sum of `amount` for each corresponding month. No month with zero transactions SHALL appear as a key.

**Validates: Requirements 14.1, 14.2**

---

### Property 12: Visually distinct colors for typical category counts

*For any* set of up to 20 distinct category names (default or custom), the color assignment function SHALL return a list of colors where each category receives a visually distinguishable color. For sets larger than the 12-entry palette, colors are generated using a golden-ratio hue step and may theoretically repeat for very large category counts, which is an accepted trade-off for a beginner project with realistic usage patterns.

**Validates: Requirements 4.5, 13.5**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Local Storage unavailable on page load | Show non-blocking warning banner; initialize with empty list; display Balance `0.00` (Req 3.5, 5.4) |
| `JSON.parse` failure on `ebv_transactions` | Return `[]`, show warning banner, initialize empty; individual valid records unaffected (Req 5.4) |
| Individual corrupt record in stored array | Discard that record silently, retain all valid records, continue loading (Req 5.6) |
| Form submitted with invalid data | Show inline error messages adjacent to each invalid field; do NOT add transaction; do NOT reset form (Req 1.3, 1.4) — invalid means: empty name, whitespace-only name, missing category, or amount is not a positive number |
| Local Storage write failure (quota exceeded) | Catch error, show non-blocking warning banner; do NOT add to in-memory state to avoid desync |
| Chart.js CDN fails to load | Catch `ReferenceError`, show fallback text "Chart unavailable" in the chart container |
| `crypto.randomUUID` not available | Fall back to `Date.now() + '-' + Math.random()` for transaction ID generation |

---

## Requirements Traceability

| Requirement | Design Element |
|---|---|
| **Req 1** — Add a Transaction | Input Form section → `FormController`, `Validator`, `StorageService.saveTransactions()` |
| **Req 2** — Transaction List | `renderTransactionList()`, `ListController.handleDelete()`, empty-state message |
| **Req 3** — Total Balance | `renderBalance()`, balance card, `balance--exceeded` class |
| **Req 4** — Pie Chart | `ChartView` / `renderChart()`, Chart.js instance, `PALETTE`, no-data message |
| **Req 5** — Local Storage persistence | `StorageService` (all four keys), try/catch on load/save, corrupt record filter |
| **Req 6** — Responsive & Accessible UI | CSS responsive grid, `--bg-*` / `--text-*` variables, WCAG AA contrast, mobile-first breakpoints |
| **Req 7** — Tech constraints | Single `css/style.css`, single `js/app.js`, no frameworks/backend; Chart.js only via CDN |
| **Req 8** — GitHub / GitHub Pages | Deployment target documented; `.kiro` folder committed per Req 7.4 |
| **Req 9** — Submission | Out of scope for design — participant submits AWS Builder ID and URLs separately |
| **Req 10** — Dark/Light Mode | `ThemeController`, `data-theme` attribute on `<html>`, CSS custom properties, `ebv_theme` |
| **Req 11** — Sort Transactions | `SortController`, `currentSort` variable, `getSortedTransactions()` (copy, never mutate) |
| **Req 12** — Spending Limit | `LimitController`, `ebv_limit`, `balance--exceeded` CSS class in `renderBalance()` |
| **Req 13** — Custom Categories | `CategoryController`, `categories[]` state, `ebv_categories`, dynamic dropdown rebuild |
| **Req 14** — Monthly Summary | `date` field on Transaction, `groupByMonth()`, `renderMonthlySummary()`, empty-state message |

---

## Testing Strategy

No test frameworks or build tooling are required. All testing is done manually in the browser.

### Manual Testing Checklist

Work through each item below in a browser before submitting. Test in both light and dark mode where relevant.

#### MVP Features

- [ ] **Add Transaction** — Fill in all fields with valid data and submit. Confirm the transaction appears in the list, the balance updates, and the pie chart updates.
- [ ] **Form Validation** — Submit the form with one or more fields empty, and with a non-positive amount. Confirm inline error messages appear next to each invalid field and no transaction is added.
- [ ] **Delete Transaction** — Click the Delete button on any transaction. Confirm it is removed from the list, the balance recalculates, and the pie chart updates.
- [ ] **Empty State** — Clear all transactions. Confirm the list shows a no-transactions message, the balance shows $0.00, and the chart shows a no-data message.
- [ ] **Balance Display** — Add several transactions and confirm the balance equals their sum formatted to 2 decimal places.
- [ ] **Pie Chart Segments** — Add transactions in at least two different categories and confirm each category appears as a distinctly colored segment with its name and percentage.
- [ ] **Local Storage Persistence** — Add a few transactions, then reload the page. Confirm all transactions, the balance, the chart, and the monthly summary are restored correctly.
- [ ] **Corrupt Data Recovery** — Open browser DevTools → Application → Local Storage. Set `ebv_transactions` to an invalid JSON string (e.g. `"bad data"`). Reload the page. Confirm a warning banner appears and the app starts with an empty list rather than crashing.

#### Additional Challenge Features

- [ ] **Dark/Light Mode** — Click the theme toggle. Confirm all visible elements switch theme. Reload the page and confirm the selected theme is restored from Local Storage.
- [ ] **Sort by Amount (Ascending)** — Add transactions with different amounts. Select Amount ↑. Confirm the list is reordered from lowest to highest. Reload the page and confirm Local Storage still stores the original insertion order.
- [ ] **Sort by Amount (Descending)** — Select Amount ↓. Confirm the list is reordered from highest to lowest.
- [ ] **Sort by Category** — Select Category A-Z. Confirm the list is sorted alphabetically by category name.
- [ ] **Spending Limit** — Set a spending limit lower than the current total balance. Confirm the balance card shows the exceeded-limit visual highlight. Reduce the total balance below the limit (by deleting transactions) and confirm the highlight is removed. Reload the page and confirm the limit is restored from Local Storage.
- [ ] **Custom Category** — Add a custom category name. Confirm it appears in the category dropdown alongside Food, Transport, and Fun. Add a transaction using the custom category. Confirm it appears as a labeled segment in the pie chart. Reload the page and confirm the custom category is restored from Local Storage.
- [ ] **Monthly Summary** — Add transactions on different dates (edit dates manually in Local Storage if needed to simulate multiple months). Confirm the monthly summary displays each month with the correct total. Confirm it updates when transactions are added or deleted.

#### Responsiveness and Cross-Browser

- [ ] **Mobile layout** — Resize the browser window to 375px wide. Confirm all content is visible in a single column with no horizontal scrolling.
- [ ] **Desktop layout** — Resize to 1024px or wider. Confirm the Transaction List and Pie Chart appear side by side.
- [ ] **Chrome, Firefox, Edge, Safari** — Open the app in each browser and confirm it loads and all interactions work correctly.

#### GitHub Pages

- [ ] **Deployment** — Open the published GitHub Pages URL in a fresh browser tab (not localhost). Confirm the app loads, Local Storage works, and all features are functional.
