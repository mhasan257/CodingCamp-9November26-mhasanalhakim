'use strict';

/* ============================================================
   CONSTANTS
   ============================================================ */

const STORAGE_KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  CATEGORIES:   'ebv_categories',
  LIMIT:        'ebv_limit',
  THEME:        'ebv_theme'
};

/** 12-color palette for pie chart segments (Req 4.5) */
const PALETTE = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
  '#9966FF', '#FF9F40', '#66BB6A', '#EC407A',
  '#26C6DA', '#FFA726', '#8D6E63', '#78909C'
];

const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

/* ============================================================
   STATE
   ============================================================ */

let transactions   = [];
let categories     = [];
let spendingLimit  = null;
let currentSort    = 'default';
let chartInstance  = null;
let hueAccumulator = 0;

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];
const byId = id => document.getElementById(id);
const isText = value => typeof value === 'string' && value.trim() !== '';
const isPositive = value => Number.isFinite(value) && value > 0;
const money = value => '$' + value.toFixed(2);

function showStorageWarning(message) {
  const banner = byId('warning-banner');
  banner.textContent = message;
  banner.classList.remove('hidden');
}

const StorageService = {
  read(key, decode, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : decode(value);
    } catch {
      showStorageWarning(key === STORAGE_KEYS.TRANSACTIONS
        ? 'Storage error. The saved balance could not be loaded.'
        : 'Storage error. Some preferences could not be loaded.');
      return fallback;
    }
  },

  write(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      return true;
    } catch {
      showStorageWarning('Storage error. Your change could not be saved.');
      return false;
    }
  },

  loadTransactions() {
    return this.read(STORAGE_KEYS.TRANSACTIONS, value => {
      const records = JSON.parse(value);
      if (!Array.isArray(records)) throw new TypeError('Expected a transaction array');
      return records.filter(tx => tx && isText(tx.id) && isText(tx.name)
        && isPositive(tx.amount) && isText(tx.category)
        && typeof tx.date === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(tx.date));
    }, []);
  },

  saveTransactions(records) {
    return this.write(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(records));
  },

  loadCategories() {
    return this.read(STORAGE_KEYS.CATEGORIES, value => {
      const names = JSON.parse(value);
      if (!Array.isArray(names)) throw new TypeError('Expected a category array');
      return [...new Set(names.filter(isText))].filter(name => !DEFAULT_CATEGORIES.includes(name));
    }, []);
  },

  saveCategories(names) {
    return this.write(STORAGE_KEYS.CATEGORIES, JSON.stringify(names));
  },

  loadLimit() {
    return this.read(STORAGE_KEYS.LIMIT, value => {
      const limit = Number(value);
      return isPositive(limit) ? limit : null;
    }, null);
  },

  saveLimit(limit) {
    return this.write(STORAGE_KEYS.LIMIT, limit);
  },

  loadTheme() {
    return this.read(STORAGE_KEYS.THEME, value => value === 'dark' ? 'dark' : 'light', 'light');
  },

  saveTheme(theme) {
    return this.write(STORAGE_KEYS.THEME, theme);
  }
};

function getLocalDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
}

function getSortedTransactions() {
  const ordered = [...transactions];
  switch (currentSort) {
    case 'amount-asc': return ordered.sort((a, b) => a.amount - b.amount);
    case 'amount-desc': return ordered.sort((a, b) => b.amount - a.amount);
    case 'category-asc': return ordered.sort((a, b) => a.category.localeCompare(b.category));
    default: return ordered;
  }
}

function renderTransactionList() {
  const rows = getSortedTransactions().map(tx => {
    const row = element('div', 'transaction-item', '');
    const details = element('div', 'transaction-info', '');
    details.append(
      element('strong', 'item-name', tx.name),
      element('span', 'item-category', tx.category),
      element('span', 'item-amount', money(tx.amount))
    );
    const button = element('button', 'delete-btn', 'Delete');
    button.dataset.id = tx.id;
    button.setAttribute('aria-label', 'Delete ' + tx.name);
    row.append(details, button);
    return row;
  });
  byId('transaction-list').replaceChildren(...(rows.length
    ? rows : [element('p', 'empty-state', 'No transactions yet.')]));
}

function renderBalance() {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  // A small tolerance prevents sums like 0.1 + 0.2 from exceeding 0.3.
  const tolerance = Number.EPSILON * Math.max(total, spendingLimit ?? 0);
  const exceeded = spendingLimit !== null && total - spendingLimit > tolerance;
  byId('balance-display').textContent = money(total);
  byId('balance-card').classList.toggle('balance--exceeded', exceeded);
  byId('limit-warning').classList.toggle('hidden', !exceeded);
}

function sumByCategory() {
  const totals = new Map();
  for (const tx of transactions) {
    totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount);
  }
  return totals;
}

function getCategoryColor(index) {
  if (index < PALETTE.length) return PALETTE[index];
  hueAccumulator = (hueAccumulator + GOLDEN_RATIO_CONJUGATE) % 1;
  return `hsl(${(hueAccumulator * 360).toFixed(6)}, 65%, 55%)`;
}

function renderChart() {
  hueAccumulator = 0;
  const totals = sumByCategory();
  const canvas = byId('spending-chart');
  const message = byId('chart-no-data');
  const available = typeof window.Chart === 'function';
  canvas.hidden = !totals.size || !available;
  message.hidden = !canvas.hidden;

  if (canvas.hidden) {
    chartInstance?.destroy();
    chartInstance = null;
    message.textContent = totals.size ? 'Chart unavailable.' : 'No spending data available.';
    return;
  }

  const data = [...totals.values()];
  const total = data.reduce((sum, amount) => sum + amount, 0);
  const labels = [...totals.keys()].map((name, index) =>
    `${name} (${(data[index] / total * 100).toFixed(1)}%)`);
  const color = getComputedStyle(canvas).getPropertyValue('--text-main').trim();
  const dataset = {
    data,
    backgroundColor: data.map((_, index) => getCategoryColor(index)),
    borderColor: getComputedStyle(canvas).getPropertyValue('--bg-card').trim()
  };

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0] = dataset;
    chartInstance.options.plugins.legend.labels.color = color;
    chartInstance.update();
    return;
  }

  chartInstance = new window.Chart(canvas, {
    type: 'pie',
    data: { labels, datasets: [dataset] },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color } } }
    }
  });
}

function groupByMonth(records) {
  const totals = {};
  for (const tx of records) {
    const month = tx.date.slice(0, 7);
    totals[month] = (totals[month] ?? 0) + tx.amount;
  }
  return totals;
}

function renderMonthlySummary() {
  const totals = groupByMonth(transactions);
  const formatMonth = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });
  const rows = Object.keys(totals).sort().map(month => {
    const label = formatMonth.format(new Date(month + '-01T12:00:00'));
    return element('p', 'month-item', `${label} — ${money(totals[month])}`);
  });
  byId('monthly-summary').replaceChildren(...(rows.length
    ? rows : [element('p', 'empty-state', 'No spending data to summarize.')]));
}

function renderAll() {
  renderTransactionList();
  renderBalance();
  renderChart();
  renderMonthlySummary();
}

const Validator = {
  validateForm(name, amount, category) {
    const errors = {};
    if (!isText(name) || name.trim().length > 100) errors.name = 'Enter a name of up to 100 characters.';
    if (!isPositive(Number(amount))) errors.amount = 'Enter an amount greater than zero.';
    if (![...DEFAULT_CATEGORIES, ...categories].includes(category)) errors.category = 'Select a category.';
    return { valid: Object.keys(errors).length === 0, errors };
  }
};

const FormController = {
  init() {
    byId('transaction-form').addEventListener('submit', event => this.handleSubmit(event));
  },

  handleSubmit(event) {
    event.preventDefault();
    const name = byId('item-name').value.trim();
    const amount = byId('amount').value;
    const category = byId('category').value;
    const { valid, errors } = Validator.validateForm(name, amount, category);
    this.showErrors(errors);
    if (!valid) return;

    const tx = {
      id: globalThis.crypto?.randomUUID?.() ?? Date.now() + '-' + Math.random(),
      name,
      amount: Number(amount),
      category,
      date: getLocalDateString()
    };
    const updated = [...transactions, tx];
    if (!StorageService.saveTransactions(updated)) return;
    transactions = updated;
    renderAll();
    byId('transaction-form').reset();
  },

  showErrors(errors) {
    for (const [field, input] of [['name', 'item-name'], ['amount', 'amount'], ['category', 'category']]) {
      byId(field + '-error').textContent = errors[field] ?? '';
      byId(input).setAttribute('aria-invalid', String(Boolean(errors[field])));
    }
  }
};

const ListController = {
  init() {
    byId('transaction-list').addEventListener('click', event => {
      const button = event.target.closest('button[data-id]');
      if (button) this.handleDelete(button.dataset.id);
    });
  },

  handleDelete(id) {
    const updated = transactions.filter(tx => tx.id !== id);
    if (!StorageService.saveTransactions(updated)) return;
    transactions = updated;
    renderAll();
  }
};

const SortController = {
  init() {
    const buttons = document.querySelectorAll('.sort-btn');
    for (const button of buttons) {
      button.addEventListener('click', () => {
        currentSort = button.dataset.sort;
        for (const option of buttons) {
          const active = option === button;
          option.classList.toggle('active', active);
          option.setAttribute('aria-pressed', String(active));
        }
        renderTransactionList();
      });
    }
  }
};

const ThemeController = {
  init() {
    this.apply(StorageService.loadTheme());
    byId('theme-toggle').addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      if (!StorageService.saveTheme(theme)) return;
      this.apply(theme);
      renderChart();
    });
  },

  apply(theme) {
    document.documentElement.dataset.theme = theme;
    const button = byId('theme-toggle');
    button.textContent = theme === 'dark' ? '🌙' : '☀';
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  }
};

const CategoryController = {
  init() {
    this.buildDropdown();
    byId('add-category-btn').addEventListener('click', () => this.handleAdd());
    byId('custom-category-input').addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) this.handleAdd();
    });
  },

  buildDropdown() {
    const select = byId('category');
    const selected = select.value;
    const placeholder = new Option('Select category', '', true, true);
    placeholder.disabled = true;
    select.replaceChildren(placeholder, ...[...DEFAULT_CATEGORIES, ...categories].map(name => new Option(name, name)));
    select.value = selected;
  },

  handleAdd() {
    const input = byId('custom-category-input');
    const name = input.value.trim();
    const error = byId('category-add-error');
    error.textContent = '';
    if (!name) {
      error.textContent = 'Enter a category name.';
      return;
    }
    if ([...DEFAULT_CATEGORIES, ...categories].some(existing => existing.toLowerCase() === name.toLowerCase())) {
      error.textContent = 'This category already exists.';
      return;
    }
    const updated = [...categories, name];
    if (!StorageService.saveCategories(updated)) return;
    categories = updated;
    this.buildDropdown();
    input.value = '';
  }
};

const LimitController = {
  init() {
    const input = byId('limit-input');
    input.value = spendingLimit ?? '';
    byId('limit-save-btn').addEventListener('click', () => this.handleChange(input.value));
    byId('limit-clear-btn').addEventListener('click', () => this.handleChange(''));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) this.handleChange(input.value);
    });
  },

  handleChange(value) {
    const number = Number(value);
    const limit = isPositive(number) ? number : null;
    if (!StorageService.saveLimit(limit)) return;
    spendingLimit = limit;
    byId('limit-input').value = limit ?? '';
    renderBalance();
  }
};

const App = {
  init() {
    transactions = StorageService.loadTransactions();
    categories = StorageService.loadCategories();
    spendingLimit = StorageService.loadLimit();
    ThemeController.init();
    CategoryController.init();
    FormController.init();
    ListController.init();
    SortController.init();
    LimitController.init();
    renderAll();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
