import { format as formatDate } from 'date-fns';

let currencySymbol = '₱';

export function setCurrency(sym: string) {
  currencySymbol = sym || '₱';
}

export function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${currencySymbol}${grouped}.${frac}`;
}

export function toCents(value: number | string): number {
  const n = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export const fmtDateTime = (iso: string) => formatDate(new Date(iso), 'MMM d, yyyy · h:mm a');
export const fmtDate = (iso: string) => formatDate(new Date(iso), 'MMM d, yyyy');
export const fmtTime = (iso: string) => formatDate(new Date(iso), 'h:mm a');
export const nowIso = () => new Date().toISOString();
