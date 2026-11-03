import { Timestamp, DocumentReference } from 'firebase/firestore';
import { ExchangeRates, CurrencyCode } from '../types';

/**
 * Fallback baseline exchange rates when remote rates are loading
 */
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  ZAR_USD: 0.055,
  BWP_ZAR: 1.34,
  ZMW_ZAR: 0.68,
  updatedAt: '2026-02-18T00:00:00.000Z',
};

/**
 * Extracts document ID or resource identifier from a DocumentReference, path string, or raw string.
 * Example: docRef -> "JRB 216MP", "trucks/JRB 216MP" -> "JRB 216MP", "JRB 216MP" -> "JRB 216MP"
 */
export function extractDocId(ref: DocumentReference | string | unknown): string {
  if (!ref) return '';
  if (typeof ref === 'string') {
    if (ref.includes('/')) {
      const parts = ref.split('/');
      return parts[parts.length - 1].trim();
    }
    return ref.trim();
  }
  if (typeof ref === 'object' && ref !== null && 'id' in ref) {
    return (ref as DocumentReference).id;
  }
  return String(ref);
}

/**
 * Normalizes truck registration strings across references and paths.
 * Delegates to extractDocId to avoid duplicate extraction logic.
 */
export function extractTruckRegistration(ref: DocumentReference | string | unknown): string {
  return extractDocId(ref);
}

/**
 * Safely parses any date representation (Firestore Timestamp, Date, ISO string, epoch) into a valid JS Date or null.
 */
export function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    const d = (val as { toDate: () => Date }).toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Safely format Firestore Timestamps, Dates, or strings into readable localized format
 */
export function formatDateTime(val: Timestamp | string | Date | unknown): string {
  const date = parseDate(val);
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Safely format Firestore Timestamps, Dates, or strings into short date format
 */
export function formatDateOnly(val: Timestamp | string | Date | unknown): string {
  const date = parseDate(val);
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Checks whether a trip reference (string, DocumentReference, or path) matches a target trip ID
 */
export function matchesTrip(ref: unknown, targetTripId: string): boolean {
  if (!ref || !targetTripId) return false;
  const extracted = extractDocId(ref);
  return extracted === targetTripId || ref === targetTripId || String(ref).includes(targetTripId);
}

/**
 * Convert any amount to USD based on the exchange_rates document:
 * latest: { ZAR_USD, BWP_ZAR, ZMW_ZAR }
 */
export function convertToUSD(amount: number, currency: CurrencyCode | string, rates: ExchangeRates | null): number {
  if (!amount || isNaN(amount)) return 0;
  const activeRates = rates || DEFAULT_EXCHANGE_RATES;

  const zarUsd = activeRates.ZAR_USD || DEFAULT_EXCHANGE_RATES.ZAR_USD;
  const bwpZar = activeRates.BWP_ZAR || DEFAULT_EXCHANGE_RATES.BWP_ZAR;
  const zmwZar = activeRates.ZMW_ZAR || DEFAULT_EXCHANGE_RATES.ZMW_ZAR;

  const curr = (currency || 'USD').toUpperCase();

  switch (curr) {
    case 'USD':
      return amount;
    case 'ZAR':
      return amount * zarUsd;
    case 'BWP':
      // BWP -> ZAR -> USD
      return amount * bwpZar * zarUsd;
    case 'ZMW':
      // ZMW -> ZAR -> USD
      return amount * zmwZar * zarUsd;
    default:
      return amount;
  }
}

/**
 * Convert an amount from one currency to another using the latest exchange rates
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode | string,
  to: CurrencyCode | string,
  rates: ExchangeRates | null
): number {
  if (!amount || isNaN(amount)) return 0;
  const source = (from || 'USD').toUpperCase();
  const target = (to || 'USD').toUpperCase();
  if (source === target) return amount;

  const activeRates = rates || DEFAULT_EXCHANGE_RATES;
  const usdAmount = convertToUSD(amount, source, activeRates);

  const zarUsd = activeRates.ZAR_USD || DEFAULT_EXCHANGE_RATES.ZAR_USD;
  const bwpZar = activeRates.BWP_ZAR || DEFAULT_EXCHANGE_RATES.BWP_ZAR;
  const zmwZar = activeRates.ZMW_ZAR || DEFAULT_EXCHANGE_RATES.ZMW_ZAR;

  switch (target) {
    case 'USD':
      return usdAmount;
    case 'ZAR':
      return usdAmount / zarUsd;
    case 'BWP':
      // USD -> ZAR -> BWP
      return (usdAmount / zarUsd) / bwpZar;
    case 'ZMW':
      // USD -> ZAR -> ZMW
      return (usdAmount / zarUsd) / zmwZar;
    default:
      return usdAmount;
  }
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbolMap: Record<string, string> = {
    USD: '$',
    ZAR: 'R ',
    BWP: 'P ',
    ZMW: 'K ',
  };
  const prefix = symbolMap[currency.toUpperCase()] ?? `${currency} `;
  return `${prefix}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Convert an amount in any supported currency directly to South African Rand (ZAR)
 * Delegates to convertCurrency for unified precision across the fleet platform.
 */
export function convertToZAR(
  amount: number,
  currency: CurrencyCode | string,
  rates: ExchangeRates | null
): number {
  return convertCurrency(amount, currency, 'ZAR', rates);
}
