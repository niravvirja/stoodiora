/**
 * Type utility functions for safe JSON parsing and type guards
 */

import { QuotationDetails, SalaryDetails } from '@/types/enhanced-types';

// Type guards
export function isQuotationDetails(value: unknown): value is QuotationDetails {
  return typeof value === 'object' && value !== null;
}

export function isSalaryDetails(value: unknown): value is SalaryDetails {
  return typeof value === 'object' && value !== null;
}

// Safe parsers for JSON types from database
export function parseQuotationDetails(value: string | QuotationDetails | null | undefined): QuotationDetails | null {
  if (!value) return null;
  
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isQuotationDetails(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  
  return isQuotationDetails(value) ? value : null;
}

export function parseSalaryDetails(value: string | SalaryDetails | null | undefined): SalaryDetails | null {
  if (!value) return null;
  
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isSalaryDetails(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  
  return isSalaryDetails(value) ? value : null;
}

// Safe property accessors
export function getQuotationProperty<K extends keyof QuotationDetails>(
  quotationDetails: string | QuotationDetails | null | undefined,
  property: K
): QuotationDetails[K] | null {
  const parsed = parseQuotationDetails(quotationDetails);
  return parsed?.[property] ?? null;
}

export function getSalaryProperty<K extends keyof SalaryDetails>(
  salaryDetails: string | SalaryDetails | null | undefined,
  property: K
): SalaryDetails[K] | null {
  const parsed = parseSalaryDetails(salaryDetails);
  return parsed?.[property] ?? null;
}

// Convenience functions for common properties
export function getQuotationDays(quotationDetails: string | QuotationDetails | null | undefined): number {
  return (getQuotationProperty(quotationDetails, 'days') as number) ?? 1;
}

export function getQuotationSameDayEditing(quotationDetails: string | QuotationDetails | null | undefined): boolean {
  return (getQuotationProperty(quotationDetails, 'sameDayEditing') as boolean) ?? false;
}

export function getQuotationEventType(quotationDetails: string | QuotationDetails | null | undefined): string | null {
  return getQuotationProperty(quotationDetails, 'eventType') as string | null;
}

export function getQuotationVenue(quotationDetails: string | QuotationDetails | null | undefined): string | null {
  return getQuotationProperty(quotationDetails, 'venue') as string | null;
}

export function getQuotationTotalAmount(quotationDetails: string | QuotationDetails | null | undefined): number | null {
  return getQuotationProperty(quotationDetails, 'totalAmount') as number | null;
}

export function getQuotationAdvanceAmount(quotationDetails: string | QuotationDetails | null | undefined): number | null {
  return getQuotationProperty(quotationDetails, 'advanceAmount') as number | null;
}