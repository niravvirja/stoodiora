import { supabase } from '@/integrations/supabase/client';

interface WhatsAppShareData {
  clientName: string;
  clientPhone: string;
  eventType: string;
  documentType: 'quotation' | 'invoice';
  file: File;
  firmId: string;
  firmData?: {
    name: string;
    tagline?: string;
    contact_phone?: string;
    contact_email?: string;
  };
}

export const shareToClientWhatsApp = async (data: WhatsAppShareData) => {
  try {
    // Fetch firm data and templates from database
    let firmName = 'Studio';
    let firmTagline = 'Professional Photography & Videography Services';
    let contactPhone = '';
    let contactEmail = '';
    let template = null;

    // Get firm data and WhatsApp session with templates
    const [firmResponse, sessionResponse] = await Promise.all([
      data.firmData 
        ? Promise.resolve({ data: data.firmData })
        : supabase
            .from('firms')
            .select('name, tagline, contact_phone, contact_email')
            .eq('id', data.firmId)
            .single(),
      supabase
        .from('wa_sessions')
        .select('notification_templates')
        .eq('firm_id', data.firmId)
        .single()
    ]);

    // Process firm data
    if (firmResponse.data) {
      firmName = firmResponse.data.name || firmName;
      firmTagline = firmResponse.data.tagline || firmTagline;
      contactPhone = firmResponse.data.contact_phone || '';
      contactEmail = firmResponse.data.contact_email || '';
    }

    // Process template data
    if (sessionResponse.data?.notification_templates) {
      const templateKey = data.documentType === 'quotation' ? 'quotation_share' : 'invoice_share';
      template = sessionResponse.data.notification_templates[templateKey];
    }

    // Build contact info only with available data
    const contactParts = [];
    if (contactPhone) contactParts.push(`Contact: ${contactPhone}`);
    if (contactEmail) contactParts.push(`Email: ${contactEmail}`);
    const contactInfo = contactParts.join('\n');

    // Use dynamic template or fallback to default
    let message = '';
    if (template) {
      // Replace template variables
      const replacedTitle = template.title || (data.documentType === 'quotation' ? 'QUOTATION DOCUMENT' : 'INVOICE DOCUMENT');
      const replacedGreeting = template.greeting?.replace('{clientName}', data.clientName) || `Dear *${data.clientName}*,`;
      const replacedContent = template.content
        ?.replace('{clientName}', data.clientName)
        ?.replace('{eventType}', data.eventType)
        ?.replace('{firmName}', firmName) || `Please find your ${data.documentType} document for ${data.eventType} event attached.`;
      const replacedFooter = template.footer || '';

      message = `*${replacedTitle}*

${replacedGreeting}

${replacedContent}

${replacedFooter ? `${replacedFooter}\n\n` : ''}Thank you for choosing *${firmName}*
_${firmTagline}_
${contactInfo}`;
    } else {
      // Fallback to default format
      const documentTitle = data.documentType === 'quotation' ? 'QUOTATION DOCUMENT' : 'INVOICE DOCUMENT';
      message = `*${documentTitle}*

Dear *${data.clientName}*,

Please find your ${data.documentType} document for ${data.eventType} event attached.

Thank you for choosing *${firmName}*
_${firmTagline}_
${contactInfo}`;
    }

    // Create the file data for WhatsApp API
    const fileData = {
      name: data.file.name,
      type: data.file.type,
      data: await fileToBase64(data.file)
    };

    // Call the WhatsApp edge function to send message with file
    const { data: result, error } = await supabase.functions.invoke('send-whatsapp-document', {
      body: {
        firmId: data.firmId,
        clientPhone: formatPhoneNumber(data.clientPhone),
        message: message,
        file: fileData
      }
    });

    if (error) {
      throw error;
    }

    if (!result || result.error) {
      throw new Error(result?.error || 'Failed to send WhatsApp message');
    }

    return { success: true, result };
  } catch (error: any) {
    console.error('Error sharing to WhatsApp:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    
    // Check for specific WhatsApp session error
    if (errorMessage.includes('WhatsApp session not found') || errorMessage.includes('No active WhatsApp session found')) {
      return { 
        success: false, 
        error: 'WhatsApp is not connected for your firm. Please go to WhatsApp page and connect your WhatsApp first.' 
      };
    }
    
    // Check for backend URL error  
    if (errorMessage.includes('Backend URL not configured') || 
        errorMessage.includes('Edge Function returned a non-2xx status code') ||
        errorMessage.includes('FunctionsHttpError') ||
        errorMessage.includes('WhatsApp service is currently unavailable')) {
      return {
        success: false,
        error: 'WhatsApp service is currently unavailable. Please try again later or contact support.'
      };
    }
    
    return { success: false, error: errorMessage };
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data:mime/type;base64, prefix
      resolve(base64.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove +91 prefix if exists and re-add it properly
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  
  // If it starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // If it's a 10-digit number, add 91
  if (cleaned.length === 10) {
    return '91' + cleaned;
  }
  
  // If it's already 12 digits starting with 91, return as is
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  
  return cleaned;
};