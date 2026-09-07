import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BudgetTransaction, CurrencyCode, NewBudgetTransaction, TransactionCategory, TransactionType } from '@/types/budget';

interface TransactionRow {
  id: string;
  profile_id: string;
  type: TransactionType;
  amount: number | string;
  description: string;
  date: string;
  category: TransactionCategory;
  created_at: string;
  original_currency: CurrencyCode | null;
  original_amount: number | string | null;
  exchange_rate: number | string | null;
}

const fromRow = (row: TransactionRow): BudgetTransaction => ({
  id: row.id,
  userId: row.profile_id,
  type: row.type,
  amount: Number(row.amount),
  description: row.description,
  transactionDate: row.date,
  category: row.category,
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
    const { data, error: queryError } = await supabase
      .from('transactions')
      .select('id,profile_id,type,amount,description,date,category,created_at,original_currency,original_amount,exchange_rate')
      .eq('profile_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(new Error(queryError.message));
    } else {
      setTransactions((data as TransactionRow[]).map(fromRow));
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    if (!userId) return;

    const channel = supabase
      .channel(`transactions-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `profile_id=eq.${userId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [refresh, userId]);

  const addTransaction = useCallback(async (transaction: NewBudgetTransaction) => {
    if (!userId) throw new Error('Missing authenticated user.');
    const { error: insertError } = await supabase.from('transactions').insert({
      profile_id: userId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description.trim(),
      date: transaction.transactionDate,
      category: transaction.category,
      original_currency: transaction.originalCurrency ?? 'MYR',
      original_amount: transaction.originalAmount ?? transaction.amount,
      exchange_rate: transaction.exchangeRate ?? 1,
    });
    if (insertError) throw new Error(insertError.message);
    await refresh();
  }, [refresh, userId]);

  const updateTransaction = useCallback(async (id: string, transaction: NewBudgetTransaction) => {
    if (!userId) throw new Error('Missing authenticated user.');
    const { error: updateError } = await supabase.from('transactions').update({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description.trim(),
      date: transaction.transactionDate,
      category: transaction.category,
      original_currency: transaction.originalCurrency ?? 'MYR',
      original_amount: transaction.originalAmount ?? transaction.amount,
      exchange_rate: transaction.exchangeRate ?? 1,
    }).eq('id', id).eq('profile_id', userId);
    if (updateError) throw new Error(updateError.message);
    await refresh();
  }, [refresh, userId]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!userId) throw new Error('Missing authenticated user.');
    const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id).eq('profile_id', userId);
    if (deleteError) throw new Error(deleteError.message);
    await refresh();
  }, [refresh, userId]);

  return { transactions, loading, error, refresh, addTransaction, updateTransaction, deleteTransaction };
}
