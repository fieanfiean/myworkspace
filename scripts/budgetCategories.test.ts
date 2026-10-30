import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categoriesForType, expenseCategories, incomeCategories, normalizeCategory, type BudgetTransaction, type TransactionCategory, type TransactionType } from '../src/types/budget.ts';
import { filterBudgetTransactions, type TransactionFilters } from '../src/lib/budgetFilters.ts';

test('legacy database categories map to every unified group', () => {
  const groups: Array<[TransactionType, TransactionCategory, string[]]> = [
    ['expense', 'Food & Dining', ['food', 'groceries']],
    ['expense', 'Transport & Fuel', ['transport', 'transportation', 'travel', 'transport / fuel / toll']],
    ['expense', 'Bills & Utilities', ['bills', 'utilities']],
    ['expense', 'Shopping', ['clothing', 'shopping', 'gifts']],
    ['expense', 'Health & Fitness', ['health', 'healthcare', 'fitness']],
    ['expense', 'Education', ['education']],
    ['expense', 'Entertainment', ['entertainment']],
    ['expense', 'Others', ['others', 'other', 'other expense', 'other_expense']],
    ['income', 'Salary', ['salary']],
    ['income', 'Bonus & Allowance', ['bonus', 'allowance']],
    ['income', 'Freelance & Investment', ['freelance', 'investment']],
    ['income', 'Gifts & Tips', ['red packet', 'red_packet', 'tips', 'gifts']],
    ['income', 'Other Income', ['other income', 'other_income', 'other']],
  ];
  for (const [type, expected, aliases] of groups) {
    for (const alias of aliases) {
      assert.equal(normalizeCategory(alias, type), expected, alias);
      assert.equal(normalizeCategory(`  ${alias.toUpperCase()}  `, type), expected);
    }
  }
  assert.equal(normalizeCategory(' Transport  /  Fuel / Toll ', 'expense'), 'Transport & Fuel');
  assert.equal(normalizeCategory('red-packet', 'income'), 'Gifts & Tips');
});

test('canonical names round-trip unchanged and remain valid edit dropdown options', () => {
  for (const type of ['expense', 'income'] as const) {
    for (const category of categoriesForType(type)) {
      assert.equal(normalizeCategory(category, type), category);
      assert.equal(normalizeCategory(normalizeCategory(category, type), type), category);
      assert.ok(categoriesForType(type).includes(normalizeCategory(category.toLowerCase(), type)));
    }
  }
  assert.equal(expenseCategories.length, 8);
  assert.equal(incomeCategories.length, 5);
});

test('missing, unexpected and wrong-type values never break loading', () => {
  for (const value of [null, undefined, 42, {}, '', 'unknown', '__proto__', 'constructor', 'toString']) {
    assert.equal(normalizeCategory(value, 'expense'), 'Others');
    assert.equal(normalizeCategory(value, 'income'), 'Other Income');
  }
  assert.equal(normalizeCategory('salary', 'expense'), 'Others');
  assert.equal(normalizeCategory('food', 'income'), 'Other Income');
});

test('mixed legacy and new rows retain amounts and match unified category filters', () => {
  const rows = [
    { type: 'expense', category: 'food', amount: 10 },
    { type: 'expense', category: 'groceries', amount: 20 },
    { type: 'expense', category: 'Food & Dining', amount: 30 },
    { type: 'expense', category: 'transport', amount: 40 },
    { type: 'expense', category: null, amount: 5 },
    { type: 'income', category: 'salary', amount: 1000 },
  ] as const;
  const transactions: BudgetTransaction[] = rows.map((row, index) => ({
    ...row, id: String(index), userId: 'user', description: 'Example',
    transactionDate: '2026-10-15', createdAt: '2026-10-15T12:00:00Z',
    category: normalizeCategory(row.category, row.type),
  }));
  const filters: TransactionFilters = {
    search: '', category: 'all', type: 'all', dateRange: 'all', customFrom: '', customTo: '',
  };
  const visible = filterBudgetTransactions(transactions, filters, category => category);
  assert.equal(visible.length, rows.length);
  assert.equal(visible.filter(row => row.type === 'income').reduce((sum, row) => sum + row.amount, 0), 1000);
  assert.equal(visible.filter(row => row.type === 'expense').reduce((sum, row) => sum + row.amount, 0), 105);
  const food = filterBudgetTransactions(transactions, { ...filters, category: 'Food & Dining' }, category => category);
  assert.equal(food.length, 3);
  assert.equal(food.reduce((sum, row) => sum + row.amount, 0), 60);
  assert.equal(filterBudgetTransactions(transactions, { ...filters, search: 'food & dining' }, category => category).length, 3);
  assert.equal(filterBudgetTransactions(transactions, { ...filters, category: 'Salary', type: 'income' }, category => category).length, 1);
});
