import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Freelancer } from '@/types/freelancer';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { applyUniversalFilter } from '@/components/common/UniversalExportFilterLogic';

interface FreelancerReportProps {
  freelancers: Freelancer[];
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

const FreelancerReportDocument: React.FC<FreelancerReportProps> = ({ freelancers, filterType, filterValue, firmData }) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const currentDate = formatDate(new Date());
  
  const freelancerStats = {
    total: freelancers.length,
    avgRate: freelancers.length > 0 ? freelancers.reduce((sum, f) => sum + (f.rate || 0), 0) / freelancers.length : 0,
    withEmail: freelancers.filter(f => f.email).length,
    withPhone: freelancers.filter(f => f.phone).length,
  };

  const getFilterDisplayText = () => {
    if (filterType === 'global') return 'All Freelancers';
    if (filterType === 'role') return `Role: ${filterValue}`;
    return filterValue;
  };

  const tableData = freelancers.map(freelancer => [
    freelancer.full_name,
    freelancer.role,
    freelancer.phone || '-',
    freelancer.email || '-',
    formatCurrency(freelancer.rate || 0),
  ]);

  // Split freelancers into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const freelancerChunks = [];
  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    freelancerChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasFreelancers = freelancers.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Freelancer Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Freelancers:</Text>
              <Text style={sharedStyles.detailValue}>{freelancerStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
        </View>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Statistics</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Average Rate:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(freelancerStats.avgRate)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>With Email:</Text>
              <Text style={sharedStyles.detailValue}>{freelancerStats.withEmail}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>With Phone:</Text>
              <Text style={sharedStyles.detailValue}>{freelancerStats.withPhone}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Freelancer Tables - 15 rows per page */}
      {freelancerChunks.map((chunk, chunkIndex) => (
        <Page key={`freelancer-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Freelancer Details {freelancerChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${freelancerChunks.length})` : ''}
          </Text>

          <SimpleTable
            headers={['Name', 'Role', 'Phone', 'Email', 'Rate']}
            rows={chunk}
          />

          {/* Add footer to the last content page */}
          {chunkIndex === freelancerChunks.length - 1 && (
            <>
              <View style={{ flex: 1 }} />
              <SharedPDFFooter firmData={firmData} />
            </>
          )}
        </Page>
      ))}

      {/* If no freelancers, add footer to first page */}
      {!hasFreelancers && (
        <>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </>
      )}
    </Document>
  );
};

export const generateFreelancerReportPDF = async (freelancers: Freelancer[], filterType: string, filterValue: string, firmData?: any) => {
  // ALWAYS fetch ALL freelancers unconditionally for comprehensive PDF reporting
  let allFreelancers: any[] = [];
  
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
    
    // Fetch ALL freelancers in batches of 1000 to handle large datasets
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('freelancers')
        .select('*')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allFreelancers.push(...data);
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`PDF Export: Fetched ${allFreelancers.length} total freelancers unconditionally`);
  } catch (error) {
    console.error('Error fetching all freelancers for PDF:', error);
    // Fallback: use the passed-in filtered data
    allFreelancers = freelancers;
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
          
          if (!error) {
            firmData = firm;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching firm data:', error);
    }
  }

  // Apply export filter to the fetched complete dataset
  const finalFreelancers = filterType ? applyUniversalFilter(allFreelancers, filterType, filterValue || '') : allFreelancers;
  
  const blob = await pdf(<FreelancerReportDocument freelancers={finalFreelancers} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Freelancer Report (${finalFreelancers.length} entries) ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateFreelancerReportPDF;
