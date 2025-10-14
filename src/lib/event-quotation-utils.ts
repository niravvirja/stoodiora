import { QuotationDetails, QuotationItem, QuotationAddon } from '@/types/enterprise-event-types';

// Helper to safely extract quotation details from various shapes on event
export const getQuotationDetailsFromEvent = (event: any): QuotationDetails | undefined => {
  const qs = (event?.quotation_source as any);
  if (event?.quotation_details) return event.quotation_details as QuotationDetails;
  if (qs?.quotation_details) return qs.quotation_details as QuotationDetails;
  if (Array.isArray(qs) && qs[0]?.quotation_details) return qs[0].quotation_details as QuotationDetails;
  return undefined;
};

const normalizeRole = (role: string): string => {
  const r = role?.toLowerCase() || '';
  if (r.includes('drone')) return 'drone';
  if (r.includes('cinema')) return 'cinematographer';
  if (r.includes('photo')) return 'photographer';
  if (r.includes('same day')) return 'same_day_editor';
  if (r.includes('editor')) return 'editor';
  return 'other';
};

// Check role presence in crew arrays on items/addons
const crewArraysContainRole = (details: QuotationDetails | undefined, target: 'photographer' | 'cinematographer' | 'drone' | 'editor' | 'same_day_editor' | 'other'): boolean => {
  if (!details) return false;
  const hasIn = (arr?: Array<QuotationItem | QuotationAddon>) =>
    !!arr?.some((entry: any) => entry?.crew?.some((c: any) => {
      const n = normalizeRole(c?.role);
      if (target === 'other') {
        return !['photographer','cinematographer','drone','editor','same_day_editor'].includes(n) && (c?.quantity || 0) > 0;
      }
      if (target === 'editor') {
        // Treat same day editor as editor too
        return (n === 'editor' || n === 'same_day_editor') && (c?.quantity || 0) > 0;
      }
      return n === target && (c?.quantity || 0) > 0;
    }));

  return hasIn(details.items) || hasIn(details.addons);
};

// Check role presence in day configs
const daysContainRole = (details: QuotationDetails | undefined, target: 'photographer' | 'cinematographer' | 'drone' | 'editor' | 'same_day_editor' | 'other'): boolean => {
  if (!details?.days || !Array.isArray(details.days)) return false;
  if (target === 'photographer') return details.days.some(d => (d.photographers || 0) > 0);
  if (target === 'cinematographer') return details.days.some(d => (d.cinematographers || 0) > 0);
  if (target === 'drone') return details.days.some(d => (d.drone || 0) > 0);
  if (target === 'editor' || target === 'same_day_editor') return details.days.some(d => (d.sameDayEditors || 0) > 0) || !!details.sameDayEditing;
  if (target === 'other') return false; // no clue from days
  return false;
};

export const quotationRequiresRole = (event: any, roleKey: string): boolean => {
  const details = getQuotationDetailsFromEvent(event);
  switch (roleKey) {
    case 'photographer':
      return daysContainRole(details, 'photographer') || crewArraysContainRole(details, 'photographer');
    case 'cinematographer':
      return daysContainRole(details, 'cinematographer') || crewArraysContainRole(details, 'cinematographer');
    case 'drone':
    case 'drone_pilot':
      return daysContainRole(details, 'drone') || crewArraysContainRole(details, 'drone');
    case 'editor':
      return daysContainRole(details, 'editor') || crewArraysContainRole(details, 'editor');
    case 'other_role':
      return crewArraysContainRole(details, 'other');
    default:
      return false;
  }
};
