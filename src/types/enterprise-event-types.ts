/**
 * Enterprise-grade type definitions for event data structures
 * Ensures type safety and prevents runtime errors in crew completion logic
 */

export interface CrewMember {
  role: string;
  quantity: number;
}

export interface QuotationItem {
  id: string;
  name: string;
  price: number;
  crew?: CrewMember[];
}

export interface QuotationAddon {
  id: string;
  name: string;
  price: number;
  crew?: CrewMember[];
}

export interface DayConfig {
  photographers: number;
  cinematographers: number;
  drone: number;
  sameDayEditors: number;
}

export interface QuotationDetails {
  items?: QuotationItem[];
  addons?: QuotationAddon[];
  days?: DayConfig[];
  sameDayEditing?: boolean;
}

export interface StaffAssignment {
  id: string;
  event_id: string;
  staff_id?: string;
  freelancer_id?: string;
  role: string;
  day_number: number;
  day_date?: string;
}

export interface EnhancedEvent {
  id: string;
  title: string;
  event_date: string;
  quotation_source_id?: string;
  quotation_details?: QuotationDetails;
  event_staff_assignments?: StaffAssignment[];
  total_days?: number;
  _dataLoaded?: boolean; // Enterprise flag to indicate complete data loading
}

/**
 * Type guard to check if an event has complete data loaded
 */
export function isEventDataComplete(event: any): event is EnhancedEvent & { _dataLoaded: true } {
  return event && event._dataLoaded === true;
}

/**
 * Type guard to check if quotation details are available
 */
export function hasQuotationDetails(event: any): event is EnhancedEvent & { quotation_details: QuotationDetails } {
  return event && event.quotation_details != null;
}