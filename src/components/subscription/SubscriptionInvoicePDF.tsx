import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { SharedPDFHeader, SharedPDFFooter, StatusBadge, sharedStyles } from '../pdf/SharedPDFLayout';

const styles = StyleSheet.create({
  ...sharedStyles,
  invoiceSection: {
    backgroundColor: '#f8f6f1',
    padding: 16,
    marginVertical: 16,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c4b28d',
  },
  invoiceHeader: {
    textAlign: 'center',
    marginBottom: 12,
  },
  invoiceAmount: {
    fontSize: 24,
    fontWeight: 700,
    color: '#c4b28d',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  invoiceSubtitle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  itemsTable: {
    marginVertical: 16,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#c4b28d',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    color: '#FFFFFF',
    textAlign: 'left',
    paddingHorizontal: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: '#333333',
    textAlign: 'left',
    paddingHorizontal: 8,
    lineHeight: 1.4,
  },
  tableCellRight: {
    flex: 1,
    fontSize: 10,
    color: '#333333',
    textAlign: 'right',
    paddingHorizontal: 8,
    fontWeight: 600,
  },
  totalsSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  totalLabel: {
    fontSize: 11,
    color: '#666666',
    fontWeight: 600,
  },
  totalValue: {
    fontSize: 11,
    color: '#333333',
    fontWeight: 700,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f6f1',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c4b28d',
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    color: '#c4b28d',
    fontWeight: 700,
  },
  grandTotalValue: {
    fontSize: 14,
    color: '#c4b28d',
    fontWeight: 700,
  },
  paymentSection: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginVertical: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c4b28d',
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 10,
    color: '#666666',
    width: 120,
  },
  paymentValue: {
    fontSize: 10,
    color: '#333333',
    fontWeight: 600,
  },
  thankYouSection: {
    backgroundColor: '#f8f6f1',
    padding: 16,
    marginVertical: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c4b28d',
    alignItems: 'center',
  },
  thankYouText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#c4b28d',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  termsSection: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  termsText: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.5,
  },
});

interface SubscriptionInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  firm: {
    name: string;
    email: string;
  };
  payment: {
    id: string;
    amount: number;
    planType: string;
    periodMonths: number;
    paidAt: string;
    razorpayPaymentId: string;
    currency: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    period: string;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
  paymentMethod: string;
  transactionId: string;
}

interface SubscriptionInvoicePDFProps {
  invoiceData: SubscriptionInvoiceData;
  firmData?: any;
}

const SubscriptionInvoicePDFDocument: React.FC<SubscriptionInvoicePDFProps> = ({ invoiceData, firmData }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <SharedPDFHeader firmData={firmData} />

        <View>
          <Text style={styles.title}>SUBSCRIPTION RECEIPT</Text>
        </View>

        {/* Receipt Details - Bill To, Subscription Details, and Payment Information */}
        <View style={styles.detailsContainer}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company:</Text>
              <Text style={styles.detailValue}>{invoiceData.firm.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{invoiceData.firm.email}</Text>
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Subscription Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plan:</Text>
              <Text style={styles.detailValue}>{invoiceData.payment.planType === 'monthly' ? 'Monthly' : 'Annual'} Plan</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>{invoiceData.payment.periodMonths} Month{invoiceData.payment.periodMonths > 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Date:</Text>
              <Text style={styles.detailValue}>{new Date(invoiceData.payment.paidAt).toLocaleDateString('en-IN')}</Text>
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Method:</Text>
              <Text style={styles.detailValue}>{invoiceData.paymentMethod}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction:</Text>
              <Text style={styles.detailValue}>{invoiceData.transactionId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Items Table with Total Only */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Description</Text>
            <Text style={styles.tableHeaderCell}>Period</Text>
            <Text style={styles.tableHeaderCell}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, { textAlign: 'right' }]}>Total</Text>
          </View>
          
          {invoiceData.items.map((item, index) => (
            <View key={index} style={styles.tableDataRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
              <Text style={styles.tableCell}>{item.period}</Text>
              <Text style={styles.tableCell}>{item.quantity}</Text>
              <Text style={styles.tableCellRight}>₹{item.unitPrice.toLocaleString()}</Text>
              <Text style={styles.tableCellRight}>₹{item.total.toLocaleString()}</Text>
            </View>
          ))}
          
          {/* Tax Row (if applicable) */}
          {invoiceData.totals.tax > 0 && (
            <View style={[styles.tableDataRow, { backgroundColor: '#f8f8f8' }]}>
              <Text style={[styles.tableCell, { flex: 3 }]}></Text>
              <Text style={styles.tableCell}></Text>
              <Text style={styles.tableCell}></Text>
              <Text style={[styles.tableCellRight, { fontWeight: 600 }]}>Tax:</Text>
              <Text style={[styles.tableCellRight, { fontWeight: 600 }]}>₹{invoiceData.totals.tax.toLocaleString()}</Text>
            </View>
          )}
          
          {/* Total Row */}
          <View style={[styles.tableDataRow, { backgroundColor: '#c4b28d', borderBottomWidth: 0 }]}>
            <Text style={[styles.tableCell, { flex: 3 }]}></Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCell}></Text>
            <Text style={[styles.tableCellRight, { fontWeight: 700, color: '#FFFFFF' }]}>Total:</Text>
            <Text style={[styles.tableCellRight, { fontWeight: 700, color: '#FFFFFF' }]}>₹{invoiceData.totals.total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Thank You Section */}
        <View style={styles.thankYouSection}>
          <Text style={styles.thankYouText}>Thank you for your subscription!</Text>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            • This receipt is auto-generated for your subscription payment.{'\n'}
            • Your subscription is active and will auto-renew unless cancelled.{'\n'}
            • For support, contact us at pritphoto1985@gmail.com or +917265072603.{'\n'}
            • All amounts are in Indian Rupees (₹).
          </Text>
        </View>

        {/* Footer */}
        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const generateSubscriptionInvoicePDF = async (invoiceData: SubscriptionInvoiceData, firmData?: any) => {
  try {
    const doc = <SubscriptionInvoicePDFDocument invoiceData={invoiceData} firmData={firmData} />;
    const asPdf = pdf(doc);
    const blob = await asPdf.toBlob();
    
    const fileName = `${invoiceData.invoiceNumber}.pdf`;
    saveAs(blob, fileName);
    
    return { success: true };
  } catch (error) {
    console.error('Error generating subscription invoice PDF:', error);
    return { success: false, error };
  }
};

export default SubscriptionInvoicePDFDocument;