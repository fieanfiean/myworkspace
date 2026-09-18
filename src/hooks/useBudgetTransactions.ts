import { useCallback, useEffect, useState } from 'react';
import { createTransaction, createTransactions, deleteTransactionById, fetchTransactions, subscribeToTransactions, updateTransactionById } from '@/services/budgetService';
import { expenseCategories, incomeCategories, type BudgetTransaction, type CurrencyCode, type NewBudgetTransaction, type TransactionCategory, type TransactionType } from '@/types/budget';

interface TransactionRow {
  id: string;
  profile_id: string;
  type: TransactionType;
  amount: number | string;
  description: string;
  date: string;
  transaction_time: string | null;
  category: string;
  created_at: string;
  original_currency: CurrencyCode | null;
  original_amount: number | string | null;
  exchange_rate: number | string | null;
}

const normalizeCategory = (category: string, type: TransactionType): TransactionCategory => {
  const normalized = category.trim().toLocaleLowerCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, TransactionCategory> = {
    other: type === 'income' ? 'other_income' : 'others',
    other_expense: 'others',
    utilities: 'bills',
    healthcare: 'health',
    transport: 'transportation',
  };
  const candidate = aliases[normalized] ?? normalized as TransactionCategory;
  const allowed = type === 'income' ? incomeCategories : expenseCategories;
  return (allowed as readonly TransactionCategory[]).includes(candidate)
    ? candidate
    : type === 'income' ? 'other_income' : 'others';
};

const fromRow = (row: TransactionRow): BudgetTransaction => ({
  id: row.id,
  userId: row.profile_id,
  type: row.type,
  amount: Number(row.amount),
  description: row.description,
  transactionDate: row.date,
  transaction_time: row.transaction_time ?? undefined,
  category: normalizeCategory(row.category, row.type),
  createdAt: row.created_at,
  originalCurrency: row.original_currency ?? undefined,
  originalAmount: row.original_amount === null ? undefined : Number(row.original_amount),
  exchangeRate: row.exchange_rate === null ? undefined : Number(row.exchange_rate),
});

export function useBudgetTransactions(userId: string | undefined) {
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await fetchTransactions(userId) as unknown as TransactionRow[];
      setTransactions(rows.map(fromRow));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Unable to load transactions.'));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    if (!userId) return;

    return subscribeToTransactions(userId, () => void refresh());
  }, [refresh, userId]);

  const addTransaction = useCallback(async (transaction: NewBudgetTransaction) => {
    if (!userId) throw new Error('Missing authenticated user.');
    await createTransaction(userId, transaction);
    await refresh();
  }, [refresh, userId]);

  const addTransactions = useCallback(async (items: NewBudgetTransaction[]) => {
    if (!userId) throw new Error('Missing authenticated user.');
    if (items.length === 0) return;
    await createTransactions(userId, items);
    await refresh();
  }, [refresh, userId]);

  const updateTransaction = useCallback(async (id: string, transaction: NewBudgetTransaction) => {
    if (!userId) throw new Error('Missing authenticated user.');
    await updateTransactionById(userId, id, transaction);
    await refresh();
  }, [refresh, userId]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!userId) throw new Error('Missing authenticated user.');
    await deleteTransactionById(userId, id);
    await refresh();
  }, [refresh, userId]);

  return { transactions, loading, error, refresh, addTransaction, addTransactions, updateTransaction, deleteTransaction };
}
