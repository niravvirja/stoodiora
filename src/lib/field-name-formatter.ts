/**
 * Utility to format database field names to human-readable labels
 */

const fieldNameMap: Record<string, string> = {
  event_date: 'Event Date',
  event_end_date: 'Event End Date',
  event_title: 'Event Title',
  title: 'Title',
  venue: 'Venue',
  total_amount: 'Total Amount',
  advance_amount: 'Advance Amount',
  balance_amount: 'Balance Amount',
  client_id: 'Client',
  event_type: 'Event Type',
  description: 'Description',
  total_days: 'Total Days',
  same_day_editor: 'Same Day Editor',
  photo_editing_status: 'Photo Editing Status',
  video_editing_status: 'Video Editing Status',
  storage_disk: 'Storage Disk',
  storage_size: 'Storage Size',
  // Add more mappings as needed
};

/**
 * Formats a database field name to a human-readable label
 * @param fieldName - The database field name (e.g., 'event_date')
 * @returns Formatted label (e.g., 'Event Date')
 */
export const formatFieldName = (fieldName: string): string => {
  // Check if we have a custom mapping
  if (fieldNameMap[fieldName]) {
    return fieldNameMap[fieldName];
  }
  
  // Fallback: convert snake_case to Title Case
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Formats an array of field names to human-readable labels
 * @param fieldNames - Array of database field names
 * @returns Array of formatted labels
 */
export const formatFieldNames = (fieldNames: string[]): string[] => {
  return fieldNames.map(formatFieldName);
};
