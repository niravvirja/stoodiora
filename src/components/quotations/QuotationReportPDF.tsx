import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

interface QuotationReportProps {
  quotations: any[];
  filterType: string;
  filterValue: string;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const QuotationReportDocument: React.FC<QuotationReportProps> = ({ quotations, filterType, filterValue, firmData }) => {
  const currentDate = formatDate(new Date());
  
  const quotationStats = {
    total: quotations.length,
    converted: quotations.filter(q => q.converted_to_event).length,
    pending: quotations.filter(q => !q.converted_to_event).length,
    totalAmount: quotations.reduce((sum, quotation) => sum + (quotation.amount || 0), 0),
    validQuotations: quotations.filter(q => !q.valid_until || new Date(q.valid_until) >= new Date()).length,
  };

  const getFilterDisplayText = () => {
    if (filterType === 'all') return 'All Quotations';
    if (['converted','pending','valid','expired'].includes(filterType)) {
      switch (filterType) {
        case 'converted': return 'Converted to Event';
        case 'pending': return 'Pending Conversion';
        case 'valid': return 'Still Valid';
        case 'expired': return 'Expired';
      }
    }
    if (filterType === 'event_type') return filterValue;
    return filterValue;
  };
  // Split quotations into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const quotationChunks = [];
  const tableData = quotations.map(quotation => [
    quotation.title,
    quotation.client?.name || 'Unknown Client',
    quotation.event_type,
    formatDate(new Date(quotation.event_date)),
    `₹${quotation.amount.toLocaleString()}`,
    quotation.converted_to_event ? 'Converted' : 'Pending',
    quotation.valid_until ? formatDate(new Date(quotation.valid_until)) : 'No Expiry'
  ]);

  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    quotationChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasQuotations = quotations.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Quotation Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Quotations:</Text>
              <Text style={sharedStyles.detailValue}>{quotationStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
          
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Quotation Statistics</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Converted:</Text>
              <Text style={sharedStyles.detailValue}>{quotationStats.converted}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Pending:</Text>
              <Text style={sharedStyles.detailValue}>{quotationStats.pending}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Still Valid:</Text>
              <Text style={sharedStyles.detailValue}>{quotationStats.validQuotations}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>₹{quotationStats.totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Quotation Tables - 15 rows per page */}
      {quotationChunks.map((chunk, chunkIndex) => (
        <Page key={`quotation-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Quotation Details {quotationChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${quotationChunks.length})` : ''}
          </Text>
          
          <SimpleTable
            headers={['Title', 'Client', 'Type', 'Event Date', 'Amount', 'Status', 'Valid Until']}
            rows={chunk}
          />

          {/* Add footer to the last content page */}
          {chunkIndex === quotationChunks.length - 1 && (
            <>
              <View style={{ flex: 1 }} />
              <SharedPDFFooter firmData={firmData} />
            </>
          )}
        </Page>
      ))}

      {/* If no quotations, add footer to first page */}
      {!hasQuotations && (
        <>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </>
      )}
    </Document>
  );
};

export const generateQuotationReportPDF = async (quotations: any[], filterType: string, filterValue: string, firmData?: any) => {
  // Use the provided quotations data directly - it's already filtered by UniversalExportDialog
  console.log('PDF Generation: Using pre-filtered quotations:', quotations.length);
  console.log('Filter type:', filterType, 'Filter value:', filterValue);

  // Use provided firmData or fetch it if not provided
  if (!firmData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const userFirmKey = `selectedFirmId_${user.id}`;
        let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
        
        if (!firmId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_firm_id, firm_id')
            .eq('user_id', user.id)
            .single();
          
          firmId = profile?.current_firm_id || profile?.firm_id;
        }
        
        if (firmId) {
          const { data: firm, error } = await supabase
            .from('firms')
            .select('name, description, logo_url, header_left_content, footer_content')
            .eq('id', firmId)
            .single();
          
          if (!error && firm) {
            firmData = firm;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching firm data for PDF:', error);
    }
  }

  const blob = await pdf(<QuotationReportDocument quotations={quotations} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Quotation Report (${quotations.length} entries) ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateQuotationReportPDF;
