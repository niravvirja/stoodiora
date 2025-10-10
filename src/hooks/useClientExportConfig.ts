import { useMemo } from 'react';
import { generateClientReportPDF } from '@/components/common/pdf-generators/ClientReportPDF';
import { useGlobalClientStats } from './useGlobalClientStats';
import { useUniversalExportConfig } from './useUniversalExportConfig';
import { ExportConfig } from '@/components/common/UniversalExportDialog';

export const useClientExportConfig = (): ExportConfig => {
  const { clients, loading } = useGlobalClientStats();
  
  return useUniversalExportConfig({
    entityName: 'clients',
    title: 'Client Report',
    additionalFilterTypes: [
      { 
        value: 'email_filter', 
        label: 'By Email Status',
        options: [
          { value: 'has_email', label: 'With Email' },
          { value: 'no_email', label: 'Without Email' }
        ]
      },
      { 
        value: 'address_filter', 
        label: 'By Address Status',
        options: [
          { value: 'has_address', label: 'With Address' },
          { value: 'no_address', label: 'Without Address' }
        ]
      }
    ],
    exportFunction: async (data, filterType, filterValue, firmData) => {
      await generateClientReportPDF(data, filterType, filterValue, firmData);
    },
    getPreviewData: (data) => ({
      count: data.length,
      summary: {
        'Total Clients': data.length.toString(),
        'With Phone': data.filter((client: any) => client.phone).length.toString(),
        'With Email': data.filter((client: any) => client.email && client.email.trim() !== '').length.toString(),
        'With Address': data.filter((client: any) => client.address && client.address.trim() !== '').length.toString()
      }
    })
  });
};
