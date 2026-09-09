export interface ParsedOCRResult {
  amount: number;
  date: string;
  time?: string | null;
  description: string;
}

/**
 * Minimal transaction shape required by the duplicate checker. Both API/database
 * and application field names are supported so the utility remains pure.
 */
export interface Transaction {
  amount: number;
  description: string;
  date?: string;
  transactionDate?: string;
  time?: string | null;
  transaction_time?: string | null;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedTransaction?: Transaction;
  /** Confidence from 0 to 1 for the strongest candidate. */
  matchScore: number;
}

const AMOUNT_TOLERANCE = 0.01;
const TIME_WINDOW_MINUTES = 5;
const NAME_SIMILARITY_THRESHOLD = 0.6;

function normalizeDescription(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function bigrams(value: string): string[] {
  const compact = value.replace(/\s/g, '');
  if (compact.length < 2) return compact ? [compact] : [];
  return Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2));
}

function diceCoefficient(left: string, right: string): number {
  if (left === right) return left ? 1 : 0;
  const leftPairs = bigrams(left);
  const rightPairs = bigrams(right);
  if (leftPairs.length === 0 || rightPairs.length === 0) return 0;

  const remaining = new Map<string, number>();
  for (const pair of rightPairs) remaining.set(pair, (remaining.get(pair) ?? 0) + 1);

  let intersection = 0;
  for (const pair of leftPairs) {
    const count = remaining.get(pair) ?? 0;
    if (count > 0) {
      intersection += 1;
      remaining.set(pair, count - 1);
    }
  }
  return (2 * intersection) / (leftPairs.length + rightPairs.length);
}

function descriptionSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeDescription(left);
  const normalizedRight = normalizeDescription(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const shorter = normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  const longer = shorter === normalizedLeft ? normalizedRight : normalizedLeft;
  if (shorter.length >= 3 && longer.includes(shorter)) {
    return Math.max(0.8, shorter.length / longer.length);
  }
  return diceCoefficient(normalizedLeft, normalizedRight);
}

function timeInMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function transactionDate(transaction: Transaction): string | undefined {
  return transaction.date ?? transaction.transactionDate;
}

function transactionTime(transaction: Transaction): string | null | undefined {
  return transaction.time ?? transaction.transaction_time;
}

export function checkDuplicateTransaction(
  parsedTx: ParsedOCRResult,
  existingTransactions: Transaction[],
): DuplicateCheckResult {
  let strongestCandidateScore = 0;
  let strongestDuplicateScore = -1;
  let strongestDuplicate: Transaction | undefined;

  for (const transaction of existingTransactions) {
    const amountMatches = Math.abs(parsedTx.amount - transaction.amount) < AMOUNT_TOLERANCE;
    const dateMatches = parsedTx.date === transactionDate(transaction);
    const parsedMinutes = timeInMinutes(parsedTx.time);
    const existingMinutes = timeInMinutes(transactionTime(transaction));
    const bothHaveTime = parsedMinutes !== null && existingMinutes !== null;
    const timeMatches = !bothHaveTime || Math.abs(parsedMinutes - existingMinutes) <= TIME_WINDOW_MINUTES;
    const nameScore = descriptionSimilarity(parsedTx.description, transaction.description);
    const nameMatches = nameScore >= NAME_SIMILARITY_THRESHOLD;

    const score = Math.min(1,
      (amountMatches ? 0.35 : 0)
      + (dateMatches ? 0.3 : 0)
      + (bothHaveTime && timeMatches ? 0.15 : 0)
      + nameScore * 0.2,
    );

    if (score > strongestCandidateScore) strongestCandidateScore = score;
    if (amountMatches && dateMatches && timeMatches && nameMatches && score > strongestDuplicateScore) {
      strongestDuplicate = transaction;
      strongestDuplicateScore = score;
    }
  }

  return {
    isDuplicate: strongestDuplicate !== undefined,
    ...(strongestDuplicate ? { matchedTransaction: strongestDuplicate } : {}),
    matchScore: Number((strongestDuplicate ? strongestDuplicateScore : strongestCandidateScore).toFixed(4)),
  };
}
