import { supabase } from '@/lib/supabase';
import type { NewBudgetTransaction } from '@/types/budget';

export type TransactionDatabaseRow = Record<string, unknown>;
const columns = 'id,profile_id,type,amount,description,date,transaction_time,category,created_at,original_currency,original_amount,exchange_rate';
const batchSize = 200;

function payload(userId: string, transaction: NewBudgetTransaction) {
  return {
    profile_id: userId,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description.trim(),
    date: transaction.transactionDate,
    transaction_time: transaction.transaction_time || null,
    category: transaction.category,
    original_currency: transaction.originalCurrency ?? 'MYR',
    original_amount: transaction.originalAmount ?? transaction.amount,
    exchange_rate: transaction.exchangeRate ?? 1,
  };
}

export async function fetchTransactions(userId: string): Promise<TransactionDatabaseRow[]> {
  const rows: TransactionDatabaseRow[] = [];
  for (let from = 0; ; from += batchSize) {
    const { data, error } = await supabase.from('transactions').select(columns).eq('profile_id', userId)
      .order('date', { ascending: false }).order('transaction_time', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, from + batchSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as TransactionDatabaseRow[];
    rows.push(...batch);
    if (batch.length < batchSize) break;
  }
  return rows;
}

export function subscribeToTransactions(userId: string, onChange: () => void) {
  const channel = supabase.channel(`transactions-${userId}`).on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'transactions', filter: `profile_id=eq.${userId}` },
    onChange,
  ).subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function createTransaction(userId: string, transaction: NewBudgetTransaction) {
  const { error } = await supabase.from('transactions').insert(payload(userId, transaction));
  if (error) throw new Error(error.message);
}

export async function createTransactions(userId: string, transactions: NewBudgetTransaction[]) {
  const { error } = await supabase.from('transactions').insert(transactions.map(item => payload(userId, item)));
  if (error) throw new Error(error.message);
}

export async function updateTransactionById(userId: string, id: string, transaction: NewBudgetTransaction) {
  const changes: Partial<ReturnType<typeof payload>> = { ...payload(userId, transaction) };
  delete changes.profile_id;
  const { data, error } = await supabase.from('transactions').update(changes).eq('id', id).eq('profile_id', userId).select('id').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Transaction was not updated. Check the update RLS policy.');
}

export async function deleteTransactionById(userId: string, id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('profile_id', userId);
  if (error) throw new Error(error.message);
}

export async function parseReceipt<T>(imageUrl: string) {
  return supabase.functions.invoke<T>('parse-receipt', { body: { imageUrl } });
}
