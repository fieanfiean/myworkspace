import type { BudgetTransaction, TransactionCategory, TransactionType } from '@/types/budget';

export type DateRangePreset = 'all' | 'week' | 'month' | 'threeMonths' | 'custom';
export type TransactionTypeFilter = 'all' | TransactionType;
export type CategoryFilter = 'all' | TransactionCategory;

export interface TransactionFilters {
  search: string;
  category: CategoryFilter;
  type: TransactionTypeFilter;
  dateRange: DateRangePreset;
  customFrom: string;
  customTo: string;
}

function startOfCurrentWeek(now: Date) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFloor(filters: TransactionFilters, now: Date): string | null {
  if (filters.dateRange === 'custom') return filters.customFrom || null;
  if (filters.dateRange === 'week') return startOfCurrentWeek(now);
  if (filters.dateRange === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  if (filters.dateRange === 'threeMonths') {
    const floor = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return `${floor.getFullYear()}-${String(floor.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return null;
}

export function filterBudgetTransactions(
  transactions: BudgetTransaction[],
  filters: TransactionFilters,
  categoryLabel: (category: TransactionCategory) => string,
  now = new Date(),
) {
  const query = filters.search.trim().toLocaleLowerCase();
  const from = dateFloor(filters, now);
  const to = filters.dateRange === 'custom' && filters.customTo ? filters.customTo : null;
  return transactions.filter(transaction => {
    const matchesQuery = !query || transaction.description.toLocaleLowerCase().includes(query) || transaction.category.toLocaleLowerCase().includes(query) || categoryLabel(transaction.category).toLocaleLowerCase().includes(query);
    return matchesQuery
      && (filters.category === 'all' || transaction.category === filters.category)
      && (filters.type === 'all' || transaction.type === filters.type)
      && (!from || transaction.transactionDate >= from)
      && (!to || transaction.transactionDate <= to);
  });
}
