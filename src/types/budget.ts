export type TransactionType = 'income' | 'expense';
export type CurrencyCode = 'MYR' | 'USD' | 'SGD' | 'JPY' | 'EUR' | 'GBP' | 'CNY' | 'THB' | 'TWD';

export type TransactionCategory =
  | 'salary'
  | 'bonus'
  | 'red_packet'
  | 'allowance'
  | 'investment'
  | 'other_income'
  | 'groceries'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'entertainment'
  | 'healthcare'
  | 'shopping'
  | 'other_expense'
  | 'freelance'
  | 'bills'
  | 'clothing'
  | 'education'
  | 'fitness'
  | 'gifts'
  | 'health'
  | 'others'
  | 'tips'
  | 'transportation'
  | 'travel';

export const incomeCategories = ['salary', 'bonus', 'red_packet', 'allowance', 'freelance', 'investment', 'tips', 'other_income'] as const satisfies readonly TransactionCategory[];
export const expenseCategories = ['food', 'groceries', 'bills', 'clothing', 'education', 'entertainment', 'fitness', 'gifts', 'health', 'shopping', 'transportation', 'travel', 'others', 'transport', 'utilities', 'healthcare', 'other_expense'] as const satisfies readonly TransactionCategory[];

export function categoriesForType(type: TransactionType): readonly TransactionCategory[] {
  return type === 'income' ? incomeCategories : expenseCategories;
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
