import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { checkDuplicateTransaction, type DuplicateCheckResult, type ParsedOCRResult } from '@/lib/deduplication';
import { parseReceipt } from '@/services/budgetService';
import { uploadToR2 } from '@/services/storageService';
import { categoriesForType, type BudgetTransaction, type NewBudgetTransaction, type TransactionCategory, type TransactionType } from '@/types/budget';

export const MAX_RECEIPT_IMAGES = 3;
const RECEIPT_SCAN_CONCURRENCY = 3;

export type ReceiptScanStatus = 'pending' | 'compressing' | 'uploading' | 'scanning' | 'done' | 'failed';

export interface ReceiptScanImage {
  id: string;
  file: File;
  previewUrl: string;
  status: ReceiptScanStatus;
  error: string | null;
}

export interface ReceiptReviewTransaction {
  id: string;
  imageId: string;
  transaction: NewBudgetTransaction;
  duplicate: DuplicateCheckResult | null;
  selected: boolean;
}

interface ReceiptOCRResult extends ParsedOCRResult {
  currency: 'MYR';
  transaction_time: string;
  type: TransactionType;
  suggested_category: 'Groceries' | 'Food' | 'Transport' | 'Utilities' | 'Entertainment' | 'Healthcare' | 'Other';
}

interface ReceiptBatchResult { transactions: ReceiptOCRResult[] }
interface ReceiptFunctionError { error: string }
type ReceiptFunctionResponse = ReceiptBatchResult | ReceiptFunctionError;

interface ReceiptScanMessages {
  scanError: string;
  noTransactions: string;
  rateLimit: string;
  serviceUnavailable: string;
  invalidImage: string;
}

interface UseReceiptBatchScanOptions {
  existingTransactions: BudgetTransaction[];
  messages: ReceiptScanMessages;
}

function scanId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
}

async function invokeErrorMessage(error: unknown, messages: ReceiptScanMessages): Promise<string> {
  if (typeof error !== 'object' || error === null) return messages.scanError;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return messages.scanError;
  if (context.status === 429) return messages.rateLimit;
  if (context.status === 503) return messages.serviceUnavailable;
  try {
    const body = await context.clone().json() as unknown;
    if (typeof body === 'object' && body !== null) {
      const response = body as { error?: unknown; details?: unknown };
      if (response.details !== undefined) console.error('400 Detailed Response:', response.details);
      if (typeof response.error === 'string' && response.error.trim()) return response.error;
    }
  } catch {
    // Keep the localized fallback when the response is not JSON.
  }
  return messages.scanError;
}

function mapReceiptResult(item: ReceiptOCRResult, imageId: string, index: number, existingTransactions: BudgetTransaction[]): ReceiptReviewTransaction {
  const normalizedCategory = item.suggested_category.toLocaleLowerCase();
  const suggestedCategory = normalizedCategory === 'other' ? 'other_expense' : normalizedCategory as TransactionCategory;
  const category = categoriesForType(item.type).includes(suggestedCategory)
    ? suggestedCategory
    : item.type === 'income' ? 'other_income' : 'other_expense';
  const parsed: ParsedOCRResult = {
    amount: item.amount,
    date: item.date,
    time: item.transaction_time,
    description: item.description,
  };
  const duplicate = checkDuplicateTransaction(parsed, existingTransactions);
  return {
    id: `${imageId}-${index}`,
    imageId,
    transaction: {
      type: item.type,
      amount: item.amount,
      description: item.description,
      transactionDate: item.date,
      transaction_time: item.transaction_time,
      category,
      originalCurrency: 'MYR',
      originalAmount: item.amount,
      exchangeRate: 1,
    },
    duplicate: duplicate.isDuplicate ? duplicate : null,
    selected: !duplicate.isDuplicate,
  };
}

export function useReceiptBatchScan({ existingTransactions, messages }: UseReceiptBatchScanOptions) {
  const [images, setImages] = useState<ReceiptScanImage[]>([]);
  const [reviewTransactions, setReviewTransactions] = useState<ReceiptReviewTransaction[]>([]);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const imagesRef = useRef<ReceiptScanImage[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => {
    mountedRef.current = false;
    imagesRef.current.forEach(image => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const updateImage = useCallback((id: string, changes: Partial<Pick<ReceiptScanImage, 'status' | 'error'>>) => {
    if (!mountedRef.current) return;
    setImages(current => current.map(image => image.id === id ? { ...image, ...changes } : image));
  }, []);

  const clearBatch = useCallback(() => {
    if (processing) return;
    imagesRef.current.forEach(image => URL.revokeObjectURL(image.previewUrl));
    imagesRef.current = [];
    setImages([]);
    setReviewTransactions([]);
    setSelectionMessage(null);
  }, [processing]);

  const selectFiles = useCallback((fileList: FileList | File[]) => {
    if (processing) return { limited: false, invalid: false };
    const incoming = Array.from(fileList);
    const imageFiles = incoming.filter(file => file.type.startsWith('image/'));
    const limited = imageFiles.length > MAX_RECEIPT_IMAGES;
    const validFiles = imageFiles.slice(0, MAX_RECEIPT_IMAGES);
    const invalid = imageFiles.length !== incoming.length;

    imagesRef.current.forEach(image => URL.revokeObjectURL(image.previewUrl));
    const nextImages = validFiles.map(file => ({
      id: scanId('receipt'),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending' as const,
      error: null,
    }));
    imagesRef.current = nextImages;
    setImages(nextImages);
    setReviewTransactions([]);
    setSelectionMessage(invalid ? messages.invalidImage : null);
    return { limited, invalid };
  }, [messages.invalidImage, processing]);

  const removeImage = useCallback((imageId: string) => {
    if (processing) return;
    const target = imagesRef.current.find(image => image.id === imageId);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setImages(current => {
      const next = current.filter(image => image.id !== imageId);
      imagesRef.current = next;
      return next;
    });
    setReviewTransactions(current => current.filter(item => item.imageId !== imageId));
  }, [processing]);

  const processImage = useCallback(async (image: ReceiptScanImage): Promise<ReceiptReviewTransaction[]> => {
    try {
      updateImage(image.id, { status: 'compressing', error: null });
      const compressedFile = await imageCompression(image.file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
      updateImage(image.id, { status: 'uploading' });
      const imageUrl = await uploadToR2(compressedFile, 'receipts');
      updateImage(image.id, { status: 'scanning' });
      const { data, error } = await parseReceipt<ReceiptFunctionResponse>(imageUrl);
      if (error) throw new Error(await invokeErrorMessage(error, messages));
      if (!data) throw new Error(messages.scanError);
      if ('error' in data) throw new Error(data.error);
      if (!Array.isArray(data.transactions) || data.transactions.length === 0) throw new Error(messages.noTransactions);
      const rows = data.transactions.map((item, index) => mapReceiptResult(item, image.id, index, existingTransactions));
      if (mountedRef.current) {
        setReviewTransactions(current => [...current.filter(item => item.imageId !== image.id), ...rows]);
      }
      updateImage(image.id, { status: 'done', error: null });
      return rows;
    } catch (cause) {
      const error = cause instanceof Error && cause.message.trim() ? cause.message : messages.scanError;
      updateImage(image.id, { status: 'failed', error });
      return [];
    }
  }, [existingTransactions, messages, updateImage]);

  const runDynamicQueue = useCallback(async (queue: ReceiptScanImage[]): Promise<ReceiptReviewTransaction[]> => {
    const results: ReceiptReviewTransaction[] = [];
    let nextIndex = 0;
    let activeCount = 0;
    return new Promise(resolve => {
      const launchNext = () => {
        if (nextIndex >= queue.length && activeCount === 0) {
          resolve(results);
          return;
        }
        while (activeCount < RECEIPT_SCAN_CONCURRENCY && nextIndex < queue.length) {
          const image = queue[nextIndex++];
          activeCount += 1;
          void processImage(image).then(rows => { results.push(...rows); }).finally(() => {
            activeCount -= 1;
            launchNext();
          });
        }
      };
      launchNext();
    });
  }, [processImage]);

  const processSelectedImages = useCallback(async () => {
    if (processing) return [];
    const queue = imagesRef.current.filter(image => image.status === 'pending');
    if (queue.length === 0) return [];
    setProcessing(true);
    setSelectionMessage(null);
    setReviewTransactions([]);
    try { return await runDynamicQueue(queue); }
    finally { if (mountedRef.current) setProcessing(false); }
  }, [processing, runDynamicQueue]);

  const retryImage = useCallback(async (imageId: string) => {
    if (processing) return [];
    const image = imagesRef.current.find(candidate => candidate.id === imageId && candidate.status === 'failed');
    if (!image) return [];
    setProcessing(true);
    setReviewTransactions(current => current.filter(item => item.imageId !== imageId));
    try { return await processImage(image); }
    finally { if (mountedRef.current) setProcessing(false); }
  }, [processImage, processing]);

  const updateReviewTransaction = useCallback((id: string, changes: Partial<NewBudgetTransaction>) => {
    setReviewTransactions(current => current.map(item => item.id === id
      ? { ...item, transaction: { ...item.transaction, ...changes } }
      : item));
  }, []);

  const toggleReviewTransaction = useCallback((id: string, selected: boolean) => {
    setReviewTransactions(current => current.map(item => item.id === id ? { ...item, selected } : item));
  }, []);

  const selectedTransactions = useMemo(
    () => reviewTransactions.filter(item => item.selected).map(item => item.transaction),
    [reviewTransactions],
  );
  const allFinished = images.length > 0 && images.every(image => image.status === 'done' || image.status === 'failed');

  return {
    images,
    reviewTransactions,
    selectedTransactions,
    selectionMessage,
    setSelectionMessage,
    scanningReceipt: processing,
    allFinished,
    selectFiles,
    removeImage,
    processSelectedImages,
    retryImage,
    updateReviewTransaction,
    toggleReviewTransaction,
    clearBatch,
  } as const;
}
