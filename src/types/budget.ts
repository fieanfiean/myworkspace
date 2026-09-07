export type TransactionType = 'income' | 'expense';

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
}

export interface NewBudgetTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  category: TransactionCategory;
}
