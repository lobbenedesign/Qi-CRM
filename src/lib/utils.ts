import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(iso));
}

export function initials(first?: string | null, last?: string | null): string {
  return [(first ?? '')[0], (last ?? '')[0]].filter(Boolean).join('').toUpperCase() || '?';
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
