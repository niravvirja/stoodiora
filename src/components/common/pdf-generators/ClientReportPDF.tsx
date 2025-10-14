import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

interface ClientReportProps {
  clients: any[];
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

const ClientReportDocument: React.FC<ClientReportProps> = ({ clients, filterType, filterValue, firmData }) => {
  const formatPhoneNumber = (phone: string) => phone || 'N/A';
  const currentDate = formatDate(new Date());
  
  const clientStats = {
    total: clients.length,
    withEvents: clients.filter(client => client.events && client.events.length > 0).length,
    withEmail: clients.filter(client => client.email).length,
    withAddress: clients.filter(client => client.address).length,
  };

  const getFilterDisplayText = () => {
    if (filterType === 'all') return 'All Clients';
    if (filterType === 'event') return `Event-wise Clients: ${filterValue}`;
    return filterValue;
  };

  const tableData = clients.map(client => [
    client.name,
    formatPhoneNumber(client.phone),
    client.email || 'N/A',
    client.address || 'N/A',
    (client.events?.length || 0).toString(),
    formatDate(new Date(client.created_at))
  ]);

  // Split clients into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const clientChunks = [];
  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    clientChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasClients = clients.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Client Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Clients:</Text>
              <Text style={sharedStyles.detailValue}>{clientStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
          
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Client Statistics</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Clients with Events:</Text>
              <Text style={sharedStyles.detailValue}>{clientStats.withEvents}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Clients with Email:</Text>
              <Text style={sharedStyles.detailValue}>{clientStats.withEmail}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Clients with Address:</Text>
              <Text style={sharedStyles.detailValue}>{clientStats.withAddress}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Client Tables - 15 rows per page */}
      {clientChunks.map((chunk, chunkIndex) => (
        <Page key={`client-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Client Details {clientChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${clientChunks.length})` : ''}
          </Text>
          
          <SimpleTable
            headers={['Name', 'Phone', 'Email', 'Address', 'Events', 'Added On']}
            rows={chunk}
          />

          {/* Add footer to the last content page */}
          {chunkIndex === clientChunks.length - 1 && (
            <>
              <View style={{ flex: 1 }} />
              <SharedPDFFooter firmData={firmData} />
            </>
          )}
        </Page>
      ))}
      
      {/* Client-wise Event Details Pages */}
      {clients
        .filter(client => client.events && client.events.length > 0)
        .map((client, clientIndex) => (
          <Page key={`events-${client.id}`} size="A4" style={sharedStyles.page}>
            <Text style={sharedStyles.title}>
              Events for {client.name}
            </Text>
            
            <View style={sharedStyles.detailsContainer}>
              <View style={sharedStyles.column}>
                <View style={sharedStyles.detailRow}>
                  <Text style={sharedStyles.detailLabel}>Client:</Text>
                  <Text style={sharedStyles.detailValue}>{client.name}</Text>
                </View>
                <View style={sharedStyles.detailRow}>
                  <Text style={sharedStyles.detailLabel}>Contact:</Text>
                  <Text style={sharedStyles.detailValue}>{formatPhoneNumber(client.phone)}</Text>
                </View>
              </View>
              <View style={sharedStyles.column}>
                <View style={sharedStyles.detailRow}>
                  <Text style={sharedStyles.detailLabel}>Total Events:</Text>
                  <Text style={sharedStyles.detailValue}>{client.events.length}</Text>
                </View>
                <View style={sharedStyles.detailRow}>
                  <Text style={sharedStyles.detailLabel}>Email:</Text>
                  <Text style={sharedStyles.detailValue}>{client.email || 'N/A'}</Text>
                </View>
              </View>
            </View>
            
            <SimpleTable
              headers={['Event Title', 'Date', 'Type', 'Venue', 'Amount']}
              rows={client.events.map((event: any) => [
                event.title || 'Untitled',
                formatDate(new Date(event.event_date)),
                event.event_type || 'N/A',
                event.venue || 'N/A',
                `₹${(event.total_amount || 0).toLocaleString('en-IN')}`
              ])}
            />
            
            <View style={{ flex: 1 }} />
            <SharedPDFFooter firmData={firmData} />
          </Page>
        ))}

      {/* If no clients, add footer to first page */}
      {!hasClients && (
        <>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </>
      )}
    </Document>
  );
};

export const generateClientReportPDF = async (clients: any[], filterType: string, filterValue: string, firmData?: any) => {
  // ALWAYS fetch ALL clients unconditionally for comprehensive PDF reporting
  let allClients: any[] = [];
  let allEvents: any[] = [];
  
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
    
    // Fetch ALL clients in batches of 1000 to handle large datasets
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allClients.push(...data);
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }
    
    // Fetch ALL events for these clients
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date, event_type, venue, total_amount, client_id')
      .eq('firm_id', firmId)
      .order('event_date', { ascending: false });
    
    if (eventsError) throw eventsError;
    allEvents = eventsData || [];
    
    // Group events by client_id
    const eventsByClient: Record<string, any[]> = {};
    allEvents.forEach(event => {
      if (event.client_id) {
        if (!eventsByClient[event.client_id]) {
          eventsByClient[event.client_id] = [];
        }
        eventsByClient[event.client_id].push(event);
      }
    });
    
    // Attach events to clients
    allClients = allClients.map(client => ({
      ...client,
      events: eventsByClient[client.id] || []
    }));
    
    console.log(`PDF Export: Fetched ${allClients.length} clients with ${allEvents.length} total events`);
  } catch (error) {
    console.error('Error fetching all clients for PDF:', error);
    // Fallback: use the passed-in filtered data
    allClients = clients;
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
      // Error fetching firm data for PDF
    }
  }

  const blob = await pdf(<ClientReportDocument clients={allClients} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Client Report ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateClientReportPDF;