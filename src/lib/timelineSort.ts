import type { EducationItem, Experience } from '@/types/profile';

const CURRENT_PATTERN = /(?:\b(?:present|current|ongoing|now)\b|至今|目前|在读)/i;
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10,
  october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

interface TimelineDates { start: number; end: number; isCurrent: boolean }

function dateRank(value: string): number {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return Number.NEGATIVE_INFINITY;

  const iso = /^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/.exec(normalized);
  if (iso) {
    const month = Number(iso[2]);
    return month >= 1 && month <= 12 ? Number(iso[1]) * 12 + month : Number.NEGATIVE_INFINITY;
  }

  const namedMonth = /^([a-z]+)\s+(\d{4})$/.exec(normalized) ?? /^(\d{4})\s+([a-z]+)$/.exec(normalized);
  if (namedMonth) {
    const firstIsYear = /^\d{4}$/.test(namedMonth[1]);
    const year = Number(firstIsYear ? namedMonth[1] : namedMonth[2]);
    const month = MONTHS[firstIsYear ? namedMonth[2] : namedMonth[1]];
    return month ? year * 12 + month : Number.NEGATIVE_INFINITY;
  }

  const year = /\b(\d{4})\b/.exec(normalized);
  return year ? Number(year[1]) * 12 : Number.NEGATIVE_INFINITY;
}

function rangeDates(dateRange: string): TimelineDates {
  const compactYearRange = /^(\d{4})\s*-\s*(\d{4})$/.exec(dateRange.trim());
  const parts = compactYearRange
    ? [compactYearRange[1], compactYearRange[2]]
    : dateRange.split(/\s+(?:-|–|—|to)\s+/i).map(value => value.trim());
  const startText = parts[0] ?? '';
  const endText = parts.slice(1).join(' ');
  return {
    start: dateRank(startText),
    end: dateRank(endText),
    isCurrent: CURRENT_PATTERN.test(endText),
  };
}

function descending(left: number, right: number): number {
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

export function sortExperiencesByMostRecent(items: Experience[]): Experience[] {
  return [...items].sort((left, right) => {
    const leftCurrent = Boolean(left.isCurrent);
    const rightCurrent = Boolean(right.isCurrent);
    if (leftCurrent !== rightCurrent) return leftCurrent ? -1 : 1;

    const startDifference = descending(dateRank(left.startDate), dateRank(right.startDate));
    if (leftCurrent) return startDifference;

    const endDifference = descending(dateRank(left.endDate), dateRank(right.endDate));
    return endDifference || startDifference;
  });
}

export function sortEducationsByMostRecent(items: EducationItem[]): EducationItem[] {
  return [...items].sort((left, right) => {
    const leftDates = rangeDates(left.dateRange);
    const rightDates = rangeDates(right.dateRange);
    if (leftDates.isCurrent !== rightDates.isCurrent) return leftDates.isCurrent ? -1 : 1;

    if (leftDates.isCurrent) return descending(leftDates.start, rightDates.start);
    const leftSortDate = Number.isFinite(leftDates.end) ? leftDates.end : leftDates.start;
    const rightSortDate = Number.isFinite(rightDates.end) ? rightDates.end : rightDates.start;
    return descending(leftSortDate, rightSortDate) || descending(leftDates.start, rightDates.start);
  });
}
