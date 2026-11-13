# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a fully client-side, single-page web application using HTML, CSS, and Vanilla JavaScript. The app records spending transactions, displays a running balance, renders a Chart.js pie chart by category, and persists all data in Local Storage. Additional features include dark/light mode, custom categories, a spending limit highlight, transaction sorting, and a monthly summary. Delivered as three files: `index.html`, `css/style.css`, and `js/app.js`.

## Tasks

- [x] 1. Set up project scaffold
  - Create the `css/` and `js/` subdirectories inside the workspace root
  - Create `index.html` with semantic HTML5 structure: `<header>`, `<main>`, balance card, limit section, form section, category section, sort section, two-column grid with list and chart sections, monthly summary section, and a hidden `#warning-banner` div
  - Add the Chart.js CDN `<script>` tag (pinned stable version) and `<script defer src="js/app.js">` and `<link rel="stylesheet" href="css/style.css">` in `<head>`
  - Create `css/style.css` with `:root` CSS custom properties for the light theme (`--bg-page`, `--bg-card`, `--text-main`, `--accent`, `--danger`) and `[data-theme="dark"]` overrides; add card base styles, `.balance--exceeded` class (red border/color), and responsive two-column grid (`div.two-col-grid`) with a media query breakpoint at 768 px
  - Create `js/app.js` with top-level `STORAGE_KEYS` constant (`ebv_transactions`, `ebv_categories`, `ebv_limit`, `ebv_theme`), state variables (`transactions`, `categories`, `spendingLimit`, `currentSort`, `chartInstance`), and the `PALETTE` array of 12 hex colors
  - In `js/app.js`, define a stub `getSortedTransactions()` that returns `[...transactions]` (insertion order, no sorting) — this unblocks `renderTransactionList()` in Task 3.8 until the full sort logic is implemented in Task 10.2
  - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3_

- [x] 2. Implement StorageService
  - [x] 2.1 Implement `StorageService.saveTransactions()` and `StorageService.loadTransactions()`
    - `loadTransactions()` wraps `JSON.parse` in `try/catch`; on failure returns `[]` and shows `#warning-banner`
    - After parsing, filter out any record missing `id`, `name`, `amount`, `category`, or `date`; also discard records where `amount` is not a finite positive number or `name` is not a non-empty string after `.trim()`
    - Valid records are always retained even when corrupt siblings exist
    - `saveTransactions()` wraps `localStorage.setItem` in `try/catch`; on write failure show `#warning-banner` and do NOT add to in-memory state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 2.2 Implement `StorageService.loadCategories()` / `saveCategories()`, `loadLimit()` / `saveLimit()`, `loadTheme()` / `saveTheme()`
    - `loadCategories()` returns `[]` on failure; `loadLimit()` returns `null` on failure or non-numeric; `loadTheme()` defaults to `'light'`
    - All load methods wrap `JSON.parse` / `localStorage.getItem` in `try/catch`
    - _Requirements: 5.4, 10.3, 12.4, 13.3_

- [x] 3. Implement core rendering functions
  - [x] 3.1 Implement `getLocalDateString()` utility
    - Build YYYY-MM-DD from `new Date()` using `getFullYear()`, `getMonth()+1`, and `getDate()` — do NOT use `toISOString()` to avoid UTC offset shifting the calendar day
    - _Requirements: 14.2_
  - [x] 3.2 Implement `renderBalance()`
    - Sum `transactions` array amounts and display as `'$' + total.toFixed(2)` in the balance card element
    - If `spendingLimit !== null` and total exceeds the limit, add `balance--exceeded` CSS class to the balance element; otherwise remove it
    - When `transactions` is empty display `$0.00`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.2, 12.3_
  - [x] 3.4 Implement `getCategoryColor(index)` and `renderChart()`
    - Define `GOLDEN_RATIO_CONJUGATE = 0.618033988749895` and a module-level `hueAccumulator`; reset `hueAccumulator` to `0` at the start of every `renderChart()` call
    - `getCategoryColor(index)`: return `PALETTE[index]` for indices within the 12-entry palette; for extras, advance `hueAccumulator` by the golden-ratio step and return `hsl(hue, 65%, 55%)`
    - `renderChart()`: call `sumByCategory()` to aggregate amounts per category; if no data exists, destroy `chartInstance` if present, set it to `null`, and show `#chart-no-data` message; otherwise create or update `chartInstance` using the `'pie'` type with `responsive: true` and legend at bottom
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 13.5_
  - [x] 3.6 Implement `groupByMonth()` and `renderMonthlySummary()`
    - `groupByMonth(transactions)`: reduce over the array using `tx.date.slice(0, 7)` as the key; return `{ 'YYYY-MM': total }` with no zero-total keys
    - `renderMonthlySummary()`: call `groupByMonth()`, sort keys chronologically, render each entry as `"Month YYYY — $X.XX"`; show no-data message when result is empty
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - [x] 3.8 Implement `renderTransactionList()`
    - Build list HTML from `getSortedTransactions()` (see Task 10.2 for full implementation; a stub returning `[...transactions]` is set up in Task 1 to unblock this task); each entry shows Item Name, formatted amount with `$` and 2 decimal places, Category label, and a Delete button with a `data-id` attribute
    - When `transactions` is empty display a no-transactions message
    - Note: `getSortedTransactions()` from Task 10.2 must be defined before this function is called. During the scaffold phase, define a stub `getSortedTransactions()` that simply returns `[...transactions]` (default order) so Task 3.8 can be completed before full sort logic is wired up in Task 10.2.
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_
  - [x] 3.9 Implement `renderAll()`
    - Call `renderTransactionList()`, `renderBalance()`, `renderChart()`, and `renderMonthlySummary()` in sequence
    - _Requirements: 2.3, 3.2, 4.2, 14.3_

- [x] 4. Checkpoint — verify rendering foundation
  - Ensure all render functions exist and are callable; verify `renderAll()` runs without errors on an empty `transactions` array; ask the user if questions arise

- [x] 5. Implement Validator and FormController
  - [x] 5.1 Implement `Validator.validateForm(name, amount, category)`
    - Return `{ valid: true, errors: {} }` when: `name.trim()` is non-empty and ≤ 100 chars, `amount` parses to a finite positive number greater than 0, `category` is a non-empty string
    - Return `{ valid: false, errors: { name?, amount?, category? } }` with an error message string for each invalid field
    - _Requirements: 1.3, 1.4_
  - [x] 5.3 Implement `FormController.init()`, `handleSubmit()`, `showErrors()`, `clearErrors()`, and `resetForm()`
    - `handleSubmit()`: call `Validator.validateForm()`; if invalid call `showErrors()` and return without adding; if valid:
      - Build a Transaction object with a unique `id` (use `crypto.randomUUID()` with fallback to `Date.now() + '-' + Math.random()`), `name` (trimmed), `amount` (parsed float), `category`, and `date` from `getLocalDateString()`
      - Call `StorageService.saveTransactions([...transactions, newTransaction])`
      - **Only if the save succeeds** (no exception thrown): push `newTransaction` to `transactions`, call `renderAll()`, and call `resetForm()`
      - If the save throws (e.g. quota exceeded), show `#warning-banner` and do NOT update `transactions` or reset the form
    - `showErrors()`: render inline error `<span>` text adjacent to each invalid field
    - `clearErrors()`: clear all error spans
    - `resetForm()`: reset Item Name to empty, Amount to empty, Category to unselected placeholder
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Implement ListController and delete flow
  - [x] 6.1 Implement `ListController.init()` and `handleDelete(id)`
    - Attach a delegated `click` listener on the list container; detect clicks on delete buttons via `data-id`
    - `handleDelete(id)`:
      - Build the updated array: `const updated = transactions.filter(tx => tx.id !== id)`
      - Call `StorageService.saveTransactions(updated)`
      - **Only if the save succeeds**: set `transactions = updated`, then call `renderAll()`
      - If the save throws, show `#warning-banner` and leave `transactions` unchanged
    - _Requirements: 2.3, 2.4_

- [x] 7. Implement App.init() and bootstrap
  - Implement `App.init()`: perform these steps in order:
    1. Load all four data types from `StorageService` into state: `transactions`, `categories`, `spendingLimit`, `currentSort = 'default'`
    2. Call `ThemeController.init()` — applies `data-theme` to `<html>` before any rendering
    3. Call `CategoryController.init()` — restores custom categories and rebuilds the dropdown before the form is usable
    4. Call `FormController.init()` — attaches form submit listener (dropdown must already be populated)
    5. Call `ListController.init()` — attaches delegated delete listener on the list container
    6. Call `SortController.init()` — attaches sort control listeners
    7. Call `LimitController.init()` — restores spending limit and populates the limit input
    8. Call `renderAll()` — first full render with all restored data
  - Attach `App.init()` to the `'DOMContentLoaded'` event
  - _Requirements: 2.5, 3.4, 5.3, 10.1, 13.3_

- [x] 8. Checkpoint — verify complete MVP flow
  - Add a transaction via the form and confirm the transaction list, balance, pie chart, and monthly summary all update; delete the transaction and confirm all four sections update; reload the page and confirm data is restored from Local Storage; ask the user if questions arise

- [x] 9. Implement Dark/Light Mode (ThemeController)
  - [x] 9.1 Implement `ThemeController.init()` and `handleToggle()`
    - `init()`: read `ebv_theme` via `StorageService.loadTheme()`, set `document.documentElement.setAttribute('data-theme', theme)`, and update the toggle button icon (☀ for light, 🌙 for dark)
    - `handleToggle()`: read the current `data-theme` attribute, compute the opposite value, set the attribute, call `StorageService.saveTheme()`, and update the toggle button icon
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 10. Implement Sort Transactions (SortController)
  - [x] 10.1 Add sort controls to `index.html` — three buttons or a `<select>` for Amount ↑, Amount ↓, and Category A-Z inside `#sort-section`
  - [x] 10.2 Implement `getSortedTransactions()` as a standalone function in `js/app.js`
    - Create `getSortedTransactions()`: spread `transactions` into a copy (`[...transactions]`), apply sorting based on `currentSort` value, return the copy
    - For `'default'`: return insertion order (no sort)
    - For `'amount-asc'`: sort copy by `a.amount - b.amount`
    - For `'amount-desc'`: sort copy by `b.amount - a.amount`
    - For `'category-asc'`: sort copy by `a.category.localeCompare(b.category)`
    - Never mutate `transactions` or `ebv_transactions` — always sort a copy
    - _Requirements: 11.2, 11.3_
  - [x] 10.3 Implement `SortController.init()` and `handleSort(option)` and wire up sort controls
    - `SortController.handleSort(option)`: update `currentSort`, then call `renderTransactionList()`
    - `SortController.init()`: attach event listeners to the Amount ↑, Amount ↓, and Category A-Z controls
    - _Requirements: 11.1, 11.2_

- [x] 11. Implement Spending Limit (LimitController)
  - [x] 11.1 Implement `LimitController.init()` and `handleChange(value)`
    - `init()`: read `ebv_limit` via `StorageService.loadLimit()`, populate the limit `<input>` field, set `spendingLimit` in state, call `renderBalance()`
    - `handleChange(value)`: parse the input value as a float; if valid and positive update `spendingLimit`, call `StorageService.saveLimit()`, call `renderBalance()`; if empty or invalid set `spendingLimit = null`, clear stored limit, call `renderBalance()`
    - `renderBalance()` already applies/removes `balance--exceeded` based on `spendingLimit`
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 12. Implement Custom Categories (CategoryController)
  - [x] 12.1 Implement `CategoryController.init()`, `handleAdd()`, and `buildDropdown()`
    - `init()`: restore `categories` from `StorageService.loadCategories()`, call `buildDropdown()`
    - `buildDropdown()`: repopulate the `<select>` element with the disabled placeholder option, then the three defaults (Food, Transport, Fun), then all custom category names from `categories`
    - `handleAdd()`: read and trim the custom category input; if non-empty and not a duplicate:
      - Build the updated array: `const updated = [...categories, newName]`
      - Call `StorageService.saveCategories(updated)`
      - **Only if the save succeeds**: set `categories = updated`, call `buildDropdown()`, clear the input
      - If the save throws, show `#warning-banner` and leave `categories` unchanged
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 13. Implement StorageService error handling and corrupt record isolation
  - Verify that `StorageService.loadTransactions()` discards corrupt records and retains valid ones when both coexist in `ebv_transactions`
  - Verify that `StorageService.saveTransactions()` write failures show `#warning-banner` and do NOT update in-memory state
  - Verify `#warning-banner` appears on `JSON.parse` failure and that the app starts empty
  - _Requirements: 5.4, 5.6, 3.5_

- [x] 14. Checkpoint — verify all features end to end
  - Confirm add/delete flow updates list, balance, chart, and monthly summary
  - Confirm theme toggle persists across reload
  - Confirm sort does not mutate `ebv_transactions`
  - Confirm spending limit highlight applies and clears correctly
  - Confirm custom categories appear in dropdown, chart, and survive reload
  - Confirm monthly summary groups correctly using local dates
  - Ask the user if questions arise

- [ ] 15. Manual testing and responsive polish
  - [x] 15.1 Run through the full manual testing checklist from design.md (all MVP + challenge feature items)
    - Test add, delete, validation errors, empty state, balance display, pie chart segments, Local Storage persistence, and corrupt data recovery
    - _Requirements: 1.1–1.5, 2.1–2.6, 3.1–3.5, 4.1–4.5, 5.1–5.6_
  - [ ] 15.2 Verify responsive layout and cross-browser compatibility
    - Resize to 375 px wide — confirm single-column layout with no horizontal scroll
    - Resize to 1024 px+ — confirm Transaction List and Pie Chart appear side by side in the two-column grid
    - Open in Chrome, Firefox, Edge, and Safari; confirm all content and interactions work
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 16. GitHub setup and deployment
  - [ ] 16.1 Initialize GitHub repository with the correct naming format
    - Repository name must follow: `CodingCamp-[batch date]-[participantname]` (e.g. `CodingCamp-9November26-hasan`)
    - _Requirements: 8.1, 8.2_
  - [ ] 16.2 Commit all files including the `.kiro` folder
    - Stage and commit `index.html`, `css/style.css`, `js/app.js`, and the entire `.kiro/` directory
    - _Requirements: 7.4, 8.1_
  - [ ] 16.3 Enable GitHub Pages and verify the deployed app
    - Enable GitHub Pages from the repository settings (source: main branch, root)
    - Open the GitHub Pages URL in a fresh browser tab; confirm the app loads, Local Storage works, and all features function correctly
    - _Requirements: 8.3, 8.4_

- [ ] 17. Submission
  - [ ] 17.1 Confirm AWS Builder ID is ready and collect submission URLs
    - Have the AWS Builder ID ready
    - Collect the GitHub repository URL and the GitHub Pages URL
    - _Requirements: 9.1, 9.2, 9.3_

## Verification

- Chrome local browser test passed for MVP and all five challenge features, corrupt JSON, mixed valid/corrupt records, and failed Local Storage writes. The live Chart.js CDN loaded.
- Chrome layout checked at 320, 375, 768, 769, 1024, and 1440 px. Task 15.2 remains open for Firefox, Edge, and Safari.
- Tasks 16–17 remain open for repository setup, deployment, and submission.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical milestones
- `getLocalDateString()` MUST be used (not `toISOString()`) — UTC offset can shift the calendar day for users in certain time zones, breaking monthly summary grouping
- `hueAccumulator` MUST be reset to `0` at the start of every `renderChart()` call to ensure consistent color assignment
- All Local Storage keys use the `ebv_` prefix: `ebv_transactions`, `ebv_categories`, `ebv_limit`, `ebv_theme`
- `data-theme` is set on the `<html>` element so all CSS custom properties cascade automatically
- Sorting ALWAYS operates on a copy of `transactions` — the original array and `ebv_transactions` always store insertion order

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.4"] },
    { "id": 3, "tasks": ["3.2", "3.6", "3.8"] },
    { "id": 4, "tasks": ["3.9"] },
    { "id": 5, "tasks": ["5.1", "5.3", "6.1", "10.2"] },
    { "id": 6, "tasks": ["9.1", "10.1", "10.3", "11.1", "12.1", "13"] },
    { "id": 7, "tasks": ["7"] },
    { "id": 8, "tasks": ["4"] },
    { "id": 9, "tasks": ["8"] },
    { "id": 10, "tasks": ["14"] },
    { "id": 11, "tasks": ["15.1", "15.2"] },
    { "id": 12, "tasks": ["16.1"] },
    { "id": 13, "tasks": ["16.2"] },
    { "id": 14, "tasks": ["16.3"] },
    { "id": 15, "tasks": ["17.1"] }
  ]
}
```
