import { useMemo } from 'react';
import { generateQuotationReportPDF } from '@/components/quotations/QuotationReportPDF';
import { useGlobalQuotationStats } from './useGlobalQuotationStats';
import { ExportConfig } from '@/components/common/UniversalExportDialog';

export const useQuotationExportConfig = (): ExportConfig => {
  const { quotations, loading } = useGlobalQuotationStats();
  
  return useMemo(() => ({
    title: "Quotation Report",
    filterTypes: [
      { value: 'all', label: 'All Quotations' },
      { value: 'converted', label: 'Converted to Event' },
      { value: 'pending', label: 'Pending Conversion' },
      { value: 'valid', label: 'Still Valid' },
      { value: 'expired', label: 'Expired' },
      { 
        value: 'event_type', 
        label: 'By Event Type',
        options: [
          { value: 'Wedding', label: 'Wedding' },
          { value: 'Pre Wedding', label: 'Pre Wedding' },
          { value: 'Maternity', label: 'Maternity' },
          { value: 'Ring Ceremony', label: 'Ring Ceremony' },
          { value: 'Others', label: 'Others' }
        ]
      }
    ],
    exportFunction: async (data, filterType, filterValue, firmData) => {
      // Use the already filtered data passed from the export dialog
      console.log('Export filtering - Using filtered data:', data.length);
      console.log('Filter type:', filterType, 'Filter value:', filterValue);
      
      // Generate PDF with the filtered data - no additional filtering needed
      await generateQuotationReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data, filterType, filterValue) => {
      // Use the already filtered data for preview calculation
      console.log('Preview filtering - Using filtered data:', data.length);
      
      const totalAmount = data.reduce((sum, quotation) => sum + (quotation.amount || 0), 0);
      const converted = data.filter((q: any) => q.converted_to_event !== null && q.converted_to_event !== undefined).length;
      const pending = data.length - converted;
      const now = new Date();
      const expired = data.filter((q: any) => q.valid_until && new Date(q.valid_until) < now).length;
      const valid = data.filter((q: any) => !q.valid_until || new Date(q.valid_until) >= now).length;
      
      console.log('Preview summary - Filtered:', data.length, 'Converted:', converted, 'Pending:', pending);
      
      return {
        count: data.length,
        summary: {
          'Total Quotations': data.length.toString(),
          'Total Amount': `₹${totalAmount.toLocaleString()}`,
          'Converted': converted.toString(),
          'Pending': pending.toString(),
          'Valid': valid.toString(),
          'Expired': expired.toString()
        }
      };
    }
  }), [quotations, loading]);
};
