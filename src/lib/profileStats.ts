import type { Achievement, Experience } from '@/types/profile';

export interface ProfileStats { experienceYears: number; projects: number; awards: number; certificatesCount: number }
interface MonthInterval { start: number; end: number }
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function monthIndex(value: string): number | null {
  const normalized = value.trim();
  const iso = /^(\d{4})-(\d{2})/.exec(normalized);
  if (iso) {
    const month = Number(iso[2]);
    return month >= 1 && month <= 12 ? Number(iso[1]) * 12 + month - 1 : null;
  }
  const named = /^([a-z]{3,9})\s+(\d{4})$/i.exec(normalized);
  if (!named) return null;
  const month = MONTHS.indexOf(named[1].slice(0, 3).toLowerCase());
  return month < 0 ? null : Number(named[2]) * 12 + month;
}

export function parseLegacyDateRange(dateRange: string): Pick<Experience, 'startDate' | 'endDate' | 'isCurrent'> {
  const [start = '', end = ''] = dateRange.split(/\s+(?:-|–|—)\s+/).map(value => value.trim());
  const isCurrent = /^(present|current|now)$/i.test(end);
  const toIsoMonth = (value: string) => {
    const index = monthIndex(value);
    return index === null ? '' : `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
  };
  return { startDate: toIsoMonth(start), endDate: isCurrent ? '' : toIsoMonth(end), isCurrent };
}

export function serializeDateRange(experience: Pick<Experience, 'startDate' | 'endDate' | 'isCurrent'>): string {
  return `${experience.startDate} - ${experience.isCurrent ? 'Present' : experience.endDate}`;
}

export function formatDateRange(experience: Pick<Experience, 'startDate' | 'endDate' | 'isCurrent'>, locale?: string): string {
  const format = (value: string) => {
    const index = monthIndex(value);
    return index === null ? value : new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Math.floor(index / 12), index % 12, 1)));
  };
  return `${format(experience.startDate)} - ${experience.isCurrent ? 'Present' : format(experience.endDate)}`;
}

export function calculateExperienceMonths(experiences: Experience[], today = new Date()): number {
  const currentMonth = today.getUTCFullYear() * 12 + today.getUTCMonth();
  const intervals = experiences.flatMap<MonthInterval>(experience => {
    const start = monthIndex(experience.startDate);
    const end = experience.isCurrent ? currentMonth : monthIndex(experience.endDate);
    return start === null || end === null || end < start ? [] : [{ start, end }];
  }).sort((left, right) => left.start - right.start);
  const merged: MonthInterval[] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end + 1) previous.end = Math.max(previous.end, interval.end);
    else merged.push({ ...interval });
  }
  return merged.reduce((total, interval) => total + interval.end - interval.start + 1, 0);
}

export function calculateProfileStats(experiences: Experience[], achievements: Achievement[], today = new Date()): ProfileStats {
  return {
    experienceYears: Number((calculateExperienceMonths(experiences, today) / 12).toFixed(1)),
    projects: achievements.filter(item => item.category === 'project').length,
    awards: achievements.filter(item => item.category === 'award').length,
    certificatesCount: achievements.filter(item => item.category === 'certificate' || item.category === 'certification').length,
  };
}
