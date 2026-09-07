import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BudgetTransaction, NewBudgetTransaction, TransactionCategory, TransactionType } from '@/types/budget';

interface TransactionRow {
  id: string;
  profile_id: string;
  type: TransactionType;
  amount: number | string;
  description: string;
  date: string;
  category: TransactionCategory;
  created_at: string;
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
      .select('id,profile_id,type,amount,description,date,category,created_at')
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
    });
    if (insertError) throw new Error(insertError.message);
    await refresh();
  }, [refresh, userId]);

  return { transactions, loading, error, refresh, addTransaction };
}
