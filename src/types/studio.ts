
import { 
  StaffMember, 
  EventStaffAssignment, 
  SalaryDetails, 
  QuotationDetails 
} from './enhanced-types';

export type EventType = 'Ring-Ceremony' | 'Pre-Wedding' | 'Wedding' | 'Maternity Photography' | 'Others';
export type TaskStatus = 'Waiting for Response' | 'Accepted' | 'Declined' | 'In Progress' | 'Completed' | 'Under Review' | 'On Hold' | 'Reported';
export type TaskType = 'Photo Editing' | 'Video Editing' | 'Other';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type PaymentMethod = 'Cash' | 'Digital';
export type PaymentStatus = 'Pending' | 'Paid' | 'Partial' | 'Overdue';
export type ExpenseCategory = 'Equipment' | 'Travel' | 'Accommodation' | 'Food' | 'Marketing' | 'Software' | 'Maintenance' | 'Salary' | 'Other';


export interface Client {
  id: string;
  firm_id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  firm_id: string;
  client_id: string;
  title: string;
  event_type: EventType;
  event_date: string;
  venue?: string;
  description?: string;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  // Removed old staff assignment columns - now using event_staff_assignments table
  photo_editing_status?: boolean;
  video_editing_status?: boolean;
  storage_disk?: string;
  storage_size?: number;
  calendar_event_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  client?: Client;
  photographer?: StaffMember;
  cinematographer?: StaffMember;
  drone_pilot?: StaffMember;
  editor?: StaffMember;
  tasks?: TaskFromDB[];
  payments?: Payment[];
  event_closing_balances?: EventClosingBalance[];

  // Event staff assignments
  event_staff_assignments?: EventStaffAssignment[];
}

export interface EventClosingBalance {
  id: string;
  event_id: string;
  firm_id: string;
  closing_amount: number;
  closing_reason?: string;
  total_bill: number;
  collected_amount: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Quotation {
  id: string;
  title: string;
  client_id: string | null;
  client?: Client;
  event_type: EventType;
  event_date: string;
  venue: string | null;
  description: string | null;
  amount: number;
  valid_until: string | null;
  converted_to_event: string | null;
  firm_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  quotation_details?: unknown; // Raw JSON from database
  discount_type?: string | null;
  discount_value?: number | null;
  discount_amount?: number | null;
}

// Database representation of Task (with Json types and legacy support)
export interface TaskFromDB {
  id: string;
  firm_id: string;
  event_id?: string;
  assigned_to?: string;
  freelancer_id?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  status: TaskStatus | 'Pending'; // Allow legacy "Pending" status from database
  priority: TaskPriority;
  due_date?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  amount?: number;
  is_salary_based?: boolean;
  salary_details?: unknown; // Raw JSON from database
  report_data?: unknown; // Raw JSON from database
  // Optional relations that might be loaded
  assignee?: {
    full_name: string;
  };
}

// Application representation of Task (with proper types)
export interface Task {
  id: string;
  firm_id: string;
  event_id?: string;
  assigned_to?: string;
  freelancer_id?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  amount?: number;
  is_salary_based?: boolean;
  salary_details?: {
    rate: number;
    hours: number;
    bonus: number;
    payment_type: 'hourly' | 'fixed' | 'percentage';
  } | null;
  // Relations
  event?: Event;
  assignee?: {
    id: string;
    full_name: string;
  };
  freelancer?: {
    id: string;
    full_name: string;
  };
  assigned_staff?: StaffMember;
  // Report data for task issues
  report_data?: {
    reason: string;
    additional_notes?: string;
    reported_at: string;
  } | null;
}

// Helper function to convert database task to application task
export const convertDbTaskToTask = (dbTask: TaskFromDB): Task => {
  // Handle legacy "Pending" status by converting it to "Waiting for Response"
  const normalizedStatus = (dbTask.status as any) === 'Pending' ? 'Waiting for Response' : dbTask.status;
  
  return {
    ...dbTask,
    status: normalizedStatus as TaskStatus,
    salary_details: dbTask.salary_details ? (typeof dbTask.salary_details === 'string' ? JSON.parse(dbTask.salary_details) : dbTask.salary_details) : null,
    assigned_staff: (dbTask as any).assignee || (dbTask as any).freelancer || null,  // Map assignee or freelancer from DB to assigned_staff for UI
    assignee: (dbTask as any).assignee || null,
    freelancer: (dbTask as any).freelancer || null,
    report_data: dbTask.report_data ? (typeof dbTask.report_data === 'string' ? JSON.parse(dbTask.report_data) : dbTask.report_data) : null
  };
};

export interface Payment {
  id: string;
  firm_id: string;
  event_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  event?: Event;
}

export interface Expense {
  id: string;
  firm_id: string;
  event_id?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expense_date: string;
  receipt_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  event?: Event;
}

export interface StaffPayment {
  id: string;
  firm_id: string;
  staff_id: string;
  event_id?: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  staff?: StaffMember;
  event?: Event;
}


// Re-export auth types inline to remove file dependency - matches database enum exactly
export type UserRole = 'Admin' | 'Photographer' | 'Cinematographer' | 'Editor' | 'Drone Pilot' | 'Other';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number: string;
  role: UserRole;
  firm_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Firm {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AuthFormData {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  role: UserRole;
  firmId?: string;
  adminPin?: string;
}

// Dashboard Analytics Types
export interface DashboardStats {
  totalRevenue: number;
  pendingAmount: number;
  totalExpenses: number;
  activeEvents: number;
  pendingTasks: number;
  completedEvents: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

export interface RevenueChart {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface TaskProgress {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

// Form Types
export interface EventFormData {
  title: string;
  client_id: string;
  event_type: EventType;
  event_date: string;
  venue?: string;
  description?: string;
  total_amount: number;
  // Using event_staff_assignments table instead
}

export interface ClientFormData {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  task_type: TaskType;
  assigned_to?: string;
  freelancer_id?: string;
  due_date?: string;
  priority: TaskPriority;
  event_id?: string;
  amount?: number;
  is_salary_based?: boolean;
  salary_details?: {
    rate: number;
    hours: number;
    bonus: number;
    payment_type: 'hourly' | 'fixed' | 'percentage';
  } | null;
}

export interface PaymentFormData {
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

export interface ExpenseFormData {
  category: ExpenseCategory;
  amount: number;
  description: string;
  expense_date: string;
  event_id?: string;
}

// Enhanced event type with color mapping
export const EVENT_TYPE_COLORS = {
  'Ring-Ceremony': 'bg-eventTypes-ring-ceremony-bg text-eventTypes-ring-ceremony-color border-eventTypes-ring-ceremony-border',
  'Pre-Wedding': 'bg-eventTypes-pre-wedding-bg text-eventTypes-pre-wedding-color border-eventTypes-pre-wedding-border', 
  'Wedding': 'bg-eventTypes-wedding-bg text-eventTypes-wedding-color border-eventTypes-wedding-border',
  'Maternity Photography': 'bg-eventTypes-maternity-bg text-eventTypes-maternity-color border-eventTypes-maternity-border',
  'Others': 'bg-eventTypes-others-bg text-eventTypes-others-color border-eventTypes-others-border'
} as const;

// Storage disk options with colors
export const STORAGE_DISK_OPTIONS = [
  { value: 'Disk A', color: 'bg-storage-diskA-bg text-storage-diskA-text' },
  { value: 'Disk B', color: 'bg-storage-diskB-bg text-storage-diskB-text' },
  { value: 'Disk C', color: 'bg-storage-diskC-bg text-storage-diskC-text' },
  { value: 'Disk D', color: 'bg-storage-diskD-bg text-storage-diskD-text' },
  { value: 'Disk E', color: 'bg-storage-diskE-bg text-storage-diskE-text' },
  { value: 'Disk F', color: 'bg-storage-diskF-bg text-storage-diskF-text' },
  { value: 'Disk G', color: 'bg-storage-diskG-bg text-storage-diskG-text' },
  { value: 'Disk H', color: 'bg-storage-diskH-bg text-storage-diskH-text' },
  { value: 'Disk I', color: 'bg-storage-diskI-bg text-storage-diskI-text' },
  { value: 'Disk J', color: 'bg-storage-diskJ-bg text-storage-diskJ-text' },
  { value: 'Disk K', color: 'bg-storage-diskK-bg text-storage-diskK-text' },
  { value: 'Disk L', color: 'bg-storage-diskL-bg text-storage-diskL-text' },
  { value: 'Disk M', color: 'bg-storage-diskM-bg text-storage-diskM-text' },
  { value: 'Disk N', color: 'bg-storage-diskN-bg text-storage-diskN-text' },
  { value: 'Disk O', color: 'bg-storage-diskO-bg text-storage-diskO-text' },
  { value: 'Disk P', color: 'bg-storage-diskP-bg text-storage-diskP-text' },
  { value: 'Disk Q', color: 'bg-storage-diskQ-bg text-storage-diskQ-text' },
  { value: 'Disk R', color: 'bg-storage-diskR-bg text-storage-diskR-text' },
  { value: 'Disk S', color: 'bg-storage-diskS-bg text-storage-diskS-text' },
  { value: 'Disk T', color: 'bg-storage-diskT-bg text-storage-diskT-text' },
  { value: 'Disk U', color: 'bg-storage-diskU-bg text-storage-diskU-text' },
  { value: 'Disk V', color: 'bg-storage-diskV-bg text-storage-diskV-text' },
  { value: 'Disk W', color: 'bg-storage-diskW-bg text-storage-diskW-text' },
  { value: 'Disk X', color: 'bg-storage-diskX-bg text-storage-diskX-text' },
  { value: 'Disk Y', color: 'bg-storage-diskY-bg text-storage-diskY-text' },
  { value: 'Disk Z', color: 'bg-storage-diskZ-bg text-storage-diskZ-text' }
] as const;
