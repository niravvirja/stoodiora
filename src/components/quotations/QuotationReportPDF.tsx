import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { applyUniversalFilter } from '@/components/common/UniversalExportFilterLogic';

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
    if (filterType === 'all' || filterType === 'global') return 'All Quotations';
    
    // Status filters
    if (filterType === 'status' || ['converted','pending','valid','expired'].includes(filterValue)) {
      const statusLabels: Record<string, string> = {
        'converted': 'Converted to Event',
        'pending': 'Pending Conversion',
        'valid': 'Still Valid',
        'expired': 'Expired Quotations'
      };
      return statusLabels[filterValue] || filterValue;
    }
    
    // Event type filters
    if (filterType === 'type') {
      const typeLabels: Record<string, string> = {
        'wedding': 'Wedding Quotations',
        'pre_wedding': 'Pre-Wedding Quotations',
        'maternity': 'Maternity Quotations',
        'others': 'Other Event Quotations'
      };
      return typeLabels[filterValue] || `Type: ${filterValue}`;
    }
    
    return filterValue || 'All Quotations';
  };

  const getTableHeaders = () => {
    // Converted quotations - show conversion details
    if (filterValue === 'converted') {
      return [
        { text: 'Title', width: '22%' },
        { text: 'Client', width: '18%' },
        { text: 'Event Date', width: '12%' },
        { text: 'Amount', width: '15%' },
        { text: 'Converted On', width: '13%' },
        { text: 'Event Type', width: '20%' }
      ];
    }
    
    // Pending quotations - show validity details
    if (filterValue === 'pending') {
      return [
        { text: 'Title', width: '25%' },
        { text: 'Client', width: '18%' },
        { text: 'Event Date', width: '12%' },
        { text: 'Amount', width: '15%' },
        { text: 'Valid Until', width: '13%' },
        { text: 'Days Left', width: '17%' }
      ];
    }
    
    // Expired quotations - show expiry details
    if (filterValue === 'expired') {
      return [
        { text: 'Title', width: '25%' },
        { text: 'Client', width: '18%' },
        { text: 'Event Date', width: '12%' },
        { text: 'Amount', width: '15%' },
        { text: 'Expired On', width: '13%' },
        { text: 'Days Ago', width: '17%' }
      ];
    }
    
    // Event type filters - show type-specific details
    if (filterType === 'type') {
      return [
        { text: 'Title', width: '25%' },
        { text: 'Client', width: '20%' },
        { text: 'Event Date', width: '12%' },
        { text: 'Amount', width: '15%' },
        { text: 'Status', width: '13%' },
        { text: 'Venue', width: '15%' }
      ];
    }
    
    // Default comprehensive view
    return [
      { text: 'Title', width: '20%' },
      { text: 'Client', width: '15%' },
      { text: 'Type', width: '12%' },
      { text: 'Event Date', width: '12%' },
      { text: 'Amount', width: '13%' },
      { text: 'Status', width: '13%' },
      { text: 'Valid Until', width: '15%' }
    ];
  };

  const renderTableRow = (quotation: any) => {
    const calculateDaysRemaining = (validUntil: string) => {
      if (!validUntil) return 'No Expiry';
      const today = new Date();
      const expiry = new Date(validUntil);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays} days` : `Expired`;
    };

    const calculateDaysExpired = (validUntil: string) => {
      if (!validUntil) return 'N/A';
      const today = new Date();
      const expiry = new Date(validUntil);
      const diffTime = today.getTime() - expiry.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} days`;
    };

    // Converted quotations
    if (filterValue === 'converted') {
      return [
        quotation.title,
        quotation.client?.name || 'Unknown',
        formatDate(new Date(quotation.event_date)),
        `₹${quotation.amount.toLocaleString()}`,
        quotation.created_at ? formatDate(new Date(quotation.created_at)) : 'N/A',
        quotation.event_type
      ];
    }
    
    // Pending quotations
    if (filterValue === 'pending') {
      return [
        quotation.title,
        quotation.client?.name || 'Unknown',
        formatDate(new Date(quotation.event_date)),
        `₹${quotation.amount.toLocaleString()}`,
        quotation.valid_until ? formatDate(new Date(quotation.valid_until)) : 'No Expiry',
        calculateDaysRemaining(quotation.valid_until)
      ];
    }
    
    // Expired quotations
    if (filterValue === 'expired') {
      return [
        quotation.title,
        quotation.client?.name || 'Unknown',
        formatDate(new Date(quotation.event_date)),
        `₹${quotation.amount.toLocaleString()}`,
        quotation.valid_until ? formatDate(new Date(quotation.valid_until)) : 'N/A',
        calculateDaysExpired(quotation.valid_until)
      ];
    }
    
    // Event type specific
    if (filterType === 'type') {
      return [
        quotation.title,
        quotation.client?.name || 'Unknown',
        formatDate(new Date(quotation.event_date)),
        `₹${quotation.amount.toLocaleString()}`,
        quotation.converted_to_event ? 'Converted' : 'Pending',
        quotation.venue || 'N/A'
      ];
    }
    
    // Default comprehensive view
    return [
      quotation.title,
      quotation.client?.name || 'Unknown',
      quotation.event_type,
      formatDate(new Date(quotation.event_date)),
      `₹${quotation.amount.toLocaleString()}`,
      quotation.converted_to_event ? 'Converted' : 'Pending',
      quotation.valid_until ? formatDate(new Date(quotation.valid_until)) : 'No Expiry'
    ];
  };

  // Split quotations into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const quotationChunks = [];
  const tableData = quotations.map(quotation => renderTableRow(quotation));

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
            headers={getTableHeaders().map(h => h.text)}
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
  // ALWAYS fetch ALL quotations unconditionally for comprehensive PDF reporting
  let allQuotations: any[] = [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');
    
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
    
    if (!firmId) throw new Error('No firm ID found');
    
    // First try with relational data
    try {
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('quotations')
          .select(`
            *,
            client:clients(id, name, phone, email)
          `)
          .eq('firm_id', firmId)
          .order('event_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allQuotations.push(...data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`PDF Export: Fetched ${allQuotations.length} total quotations with relations`);
    } catch (relError) {
      console.warn('Failed to fetch with relations, trying without:', relError);
      // Fallback: fetch without relations
      allQuotations = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('quotations')
          .select('*')
          .eq('firm_id', firmId)
          .order('event_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allQuotations.push(...data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`PDF Export: Fetched ${allQuotations.length} total quotations without relations`);
    }
  } catch (error) {
    console.error('Error fetching all quotations for PDF:', error);
    // Fallback: use the passed-in filtered data
    allQuotations = quotations;
    console.warn('PDF Export: Using filtered data as fallback');
  }

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

  // Apply export filter to the fetched complete dataset
  const finalQuotations = filterType ? applyUniversalFilter(allQuotations, filterType, filterValue || '') : allQuotations;
  
  const blob = await pdf(<QuotationReportDocument quotations={finalQuotations} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Quotation Report (${finalQuotations.length} entries) ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateQuotationReportPDF;
