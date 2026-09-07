export type TransactionType = 'income' | 'expense';
export type CurrencyCode = 'MYR' | 'USD' | 'SGD' | 'JPY' | 'EUR' | 'GBP' | 'CNY' | 'THB' | 'TWD';

export type TransactionCategory =
  | 'salary'
  | 'groceries'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'entertainment'
  | 'freelance'
  | 'healthcare'
  | 'other';

export interface BudgetTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  category: TransactionCategory;
  createdAt: string;
  originalCurrency?: CurrencyCode;
  originalAmount?: number;
  exchangeRate?: number;
}

export interface NewBudgetTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  category: TransactionCategory;
  originalCurrency?: CurrencyCode;
  originalAmount?: number;
  exchangeRate?: number;
}
