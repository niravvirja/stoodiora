/**
 * Enhanced type definitions to replace 'any' types
 */

export interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  mobile_number?: string;
  email?: string;
  is_freelancer?: boolean;
}

export interface EventStaffAssignment {
  id: string;
  event_id: string;
  staff_id?: string;
  freelancer_id?: string;
  role: string;
  day_number: number;
  day_date?: string;
  staff_type?: string;
  staff?: StaffMember;
  freelancer?: StaffMember;
  profiles?: StaffMember; // Legacy compatibility
}

export interface SalaryDetails {
  rate: number;
  hours: number;
  bonus: number;
  payment_type: 'hourly' | 'fixed' | 'percentage';
  
  // Additional flexible properties for JSON compatibility
  [key: string]: unknown;
}

export interface QuotationDetails {
  // Event specific properties
  eventType?: string;
  venue?: string;
  totalAmount?: number;
  advanceAmount?: number;
  days?: number;
  sameDayEditing?: boolean;
  
  // Quotation items and services
  items?: QuotationItem[];
  services?: QuotationService[];
  addons?: QuotationAddon[];
  notes?: string;
  terms?: string;
  
  // Additional flexible properties for JSON compatibility
  [key: string]: unknown;
}

export interface QuotationItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface QuotationService {
  id: string;
  service_type: string;
  description?: string;
  price: number;
  included: boolean;
}

export interface QuotationAddon {
  id: string;
  addon_type: string;
  description?: string;
  price: number;
  selected: boolean;
}

// Enhanced API Response Types
export interface ApiResponse<T = unknown> {
  data: T;
  error?: ApiError;
  success: boolean;
  metadata?: ApiMetadata;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
  field?: string;
}

export interface ApiMetadata {
  count?: number;
  page?: number;
  totalPages?: number;
  limit?: number;
  hasMore?: boolean;
}

// Form State Management
export interface FormFieldError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
  warnings?: FormFieldError[];
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
}

export interface TableComponentProps<T> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  onRowClick?: (row: T) => void;
  onSort?: (field: keyof T, direction: 'asc' | 'desc') => void;
  sortField?: keyof T;
  sortDirection?: 'asc' | 'desc';
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

// Notification Types
export interface NotificationTemplate {
  title: string;
  content: string;
  greeting: string;
}

export interface NotificationData {
  recipient: string;
  template: NotificationTemplate;
  variables: Record<string, string>;
  metadata?: Record<string, unknown>;
}

// File Upload Types
export interface FileUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  bucket?: string;
  path?: string;
}