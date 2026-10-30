export type TransactionType = 'income' | 'expense';
export type CurrencyCode = 'MYR' | 'USD' | 'SGD' | 'JPY' | 'EUR' | 'GBP' | 'CNY' | 'THB' | 'TWD';

export const expenseCategories = [
  'Food & Dining', 'Transport & Fuel', 'Bills & Utilities', 'Shopping',
  'Health & Fitness', 'Education', 'Entertainment', 'Others',
] as const;
export const incomeCategories = [
  'Salary', 'Bonus & Allowance', 'Freelance & Investment', 'Gifts & Tips', 'Other Income',
] as const;
export type TransactionCategory = typeof expenseCategories[number] | typeof incomeCategories[number];

export function categoriesForType(type: TransactionType): readonly TransactionCategory[] {
  return type === 'income' ? incomeCategories : expenseCategories;
}

// Keys use spaces so legacy snake_case, hyphens and slash-separated labels agree.
export const legacyCategoryMap: Readonly<Record<string, TransactionCategory>> = {
  food: 'Food & Dining', groceries: 'Food & Dining', 'food & dining': 'Food & Dining',
  transport: 'Transport & Fuel', transportation: 'Transport & Fuel', travel: 'Transport & Fuel',
  'transport fuel toll': 'Transport & Fuel', 'transport & fuel': 'Transport & Fuel',
  bills: 'Bills & Utilities', utilities: 'Bills & Utilities', 'bills & utilities': 'Bills & Utilities',
  clothing: 'Shopping', shopping: 'Shopping', gifts: 'Shopping',
  health: 'Health & Fitness', healthcare: 'Health & Fitness', fitness: 'Health & Fitness',
  'health & fitness': 'Health & Fitness', education: 'Education', entertainment: 'Entertainment',
  others: 'Others', other: 'Others', 'other expense': 'Others',
  salary: 'Salary', bonus: 'Bonus & Allowance', allowance: 'Bonus & Allowance',
  'bonus & allowance': 'Bonus & Allowance',
  freelance: 'Freelance & Investment', investment: 'Freelance & Investment',
  'freelance & investment': 'Freelance & Investment',
  'red packet': 'Gifts & Tips', tips: 'Gifts & Tips', 'gifts & tips': 'Gifts & Tips',
  'other income': 'Other Income',
};

export function normalizeCategory(category: unknown, type: TransactionType): TransactionCategory {
  const fallback = type === 'income' ? 'Other Income' : 'Others';
  if (typeof category !== 'string') return fallback;
  const key = category.trim().toLowerCase().replace(/[_\s/\u2013\u2014-]+/g, ' ').replace(/\s*&\s*/g, ' & ').trim();
  // The former income dropdown also stored "gifts" for Gifts & Tips.
  if (type === 'income' && (key === 'gifts' || key === 'other' || key === 'others')) {
    return key === 'gifts' ? 'Gifts & Tips' : 'Other Income';
  }
  const candidate = Object.hasOwn(legacyCategoryMap, key) ? legacyCategoryMap[key] : fallback;
  return categoriesForType(type).includes(candidate) ? candidate : fallback;
}

export interface BudgetTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  transaction_time?: string;
  category: TransactionCategory;
  createdAt: string;
  originalCurrency?: CurrencyCode;
  originalAmount?: number;
  exchangeRate?: number;
  receiptUrl?: string;
}

export interface NewBudgetTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  transaction_time?: string;
  category: TransactionCategory;
  originalCurrency?: CurrencyCode;
  originalAmount?: number;
  exchangeRate?: number;
}
