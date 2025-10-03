import { useMemo } from 'react';
import { generateClientReportPDF } from '@/components/common/pdf-generators/ClientReportPDF';
import { useGlobalClientStats } from './useGlobalClientStats';
import { ExportConfig } from '@/components/common/UniversalExportDialog';

export const useClientExportConfig = (): ExportConfig => {
  const { clients, loading } = useGlobalClientStats();
  
  return useMemo(() => ({
    title: "Client Report",
    filterTypes: [
      { value: 'all', label: 'All Clients' },
      { 
        value: 'has_email', 
        label: 'Clients with Email',
        options: [{ value: 'has_email', label: 'Has Email' }]
      },
      { 
        value: 'has_address', 
        label: 'Clients with Address',
        options: [{ value: 'has_address', label: 'Has Address' }]
      },
      { 
        value: 'recent', 
        label: 'Recently Added',
        options: [{ value: 'recent', label: 'Added This Week' }]
      }
    ],
    exportFunction: async (data, filterType, filterValue, firmData) => {
      await generateClientReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => ({
      count: data.length,
      summary: {
        'Total Clients': data.length.toString(),
        'With Phone Numbers': data.filter((client: any) => client.phone).length.toString(),
        'With Email': data.filter((client: any) => client.email && client.email.trim() !== '').length.toString(),
        'With Address': data.filter((client: any) => client.address && client.address.trim() !== '').length.toString()
      }
    })
  }), [clients, loading]);
};