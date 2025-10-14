import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { FileEditIcon, Invoice01Icon, BookmarkAdd01Icon, RefreshIcon } from 'hugeicons-react';

interface DocumentShareTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotificationTemplate {
  title: string;
  greeting: string;
  content: string;
  footer?: string;
}

interface NotificationTemplates {
  invoice_share: NotificationTemplate;
  quotation_share: NotificationTemplate;
  [key: string]: NotificationTemplate;
}

const DocumentShareTemplateEditor = ({ open, onOpenChange }: DocumentShareTemplateEditorProps) => {
  const { toast } = useToast();
  const { currentFirm } = useAuth();
  const [templates, setTemplates] = useState<NotificationTemplates>({
    invoice_share: {
      title: 'INVOICE DOCUMENT',
      greeting: 'Dear *{clientName}*,',
      content: 'Please find your invoice document for {eventType} event attached.',
      footer: 'Thank you for your business!'
    },
    quotation_share: {
      title: 'QUOTATION DOCUMENT',
      greeting: 'Dear *{clientName}*,',
      content: 'Please find your quotation document for {eventType} event attached.',
      footer: 'We look forward to working with you!'
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const availableVariables = [
    { key: '{clientName}', description: 'Client name from the record' },
    { key: '{eventType}', description: 'Type of event (Wedding, Pre-Wedding, etc.)' },
    { key: '{firmName}', description: 'Your firm name' },
    { key: '{contactInfo}', description: 'Your firm contact information' }
  ];

  const loadTemplates = async () => {
    if (!currentFirm?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wa_sessions')
        .select('notification_templates')
        .eq('firm_id', currentFirm.id)
        .single();

      if (error) throw error;

      if (data?.notification_templates) {
        const savedTemplates = data.notification_templates as any;
        if (savedTemplates.invoice_share && savedTemplates.quotation_share) {
          setTemplates({
            invoice_share: savedTemplates.invoice_share,
            quotation_share: savedTemplates.quotation_share
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates. Using defaults.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplates = async () => {
    if (!currentFirm?.id) return;

    setIsSaving(true);
    try {
      // First get current templates
      const { data: currentData, error: fetchError } = await supabase
        .from('wa_sessions')
        .select('notification_templates')
        .eq('firm_id', currentFirm.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Merge with existing templates
      const existingTemplates = (currentData?.notification_templates as any) || {};
      const updatedTemplates = {
        ...existingTemplates,
        invoice_share: templates.invoice_share,
        quotation_share: templates.quotation_share
      };

      // Update or insert
      const { error: upsertError } = await supabase
        .from('wa_sessions')
        .upsert({
          id: currentFirm.id, // Use firm_id as id since it's the primary key
          firm_id: currentFirm.id,
          notification_templates: updatedTemplates
        }, {
          onConflict: 'firm_id'
        });

      if (upsertError) throw upsertError;

      toast({
        title: 'Success',
        description: 'Document sharing templates saved successfully!'
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to save templates. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateTemplate = (templateKey: 'invoice_share' | 'quotation_share', field: keyof NotificationTemplate, value: string) => {
    setTemplates(prev => {
      const prevTemplate = prev[templateKey];
      if (!prevTemplate) return prev;
      
      return {
        ...prev,
        [templateKey]: {
          ...prevTemplate,
          [field]: value
        }
      };
    });
  };

  const resetToDefaults = () => {
    setTemplates({
      invoice_share: {
        title: 'INVOICE DOCUMENT',
        greeting: 'Dear *{clientName}*,',
        content: 'Please find your invoice document for {eventType} event attached.',
        footer: 'Thank you for your business!'
      },
      quotation_share: {
        title: 'QUOTATION DOCUMENT',
        greeting: 'Dear *{clientName}*,',
        content: 'Please find your quotation document for {eventType} event attached.',
        footer: 'We look forward to working with you!'
      }
    });
  };

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, currentFirm?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEditIcon className="h-5 w-5 text-primary" />
            Document Sharing Templates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available Variables */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Available Variables</CardTitle>
              <CardDescription>Use these placeholders in your templates - they'll be replaced with actual data when sharing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableVariables.map((variable) => (
                  <Badge key={variable.key} variant="secondary" className="font-mono text-xs">
                    {variable.key}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Template Editor */}
          <Tabs defaultValue="invoice_share" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invoice_share" className="flex items-center gap-2">
                <Invoice01Icon className="h-4 w-4" />
                Invoice Template
              </TabsTrigger>
              <TabsTrigger value="quotation_share" className="flex items-center gap-2">
                <FileEditIcon className="h-4 w-4" />
                Quotation Template
              </TabsTrigger>
            </TabsList>

            {(['invoice_share', 'quotation_share'] as const).map((templateKey) => (
              <TabsContent key={templateKey} value={templateKey} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {templateKey === 'invoice_share' ? 'Invoice' : 'Quotation'} Sharing Template
                    </CardTitle>
                    <CardDescription>
                      Customize the message that will be sent when sharing {templateKey === 'invoice_share' ? 'invoices' : 'quotations'} with clients
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`${templateKey}-title`}>Title</Label>
                        <Input
                          id={`${templateKey}-title`}
                          value={templates[templateKey].title}
                          onChange={(e) => updateTemplate(templateKey, 'title', e.target.value)}
                          placeholder="DOCUMENT TITLE"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${templateKey}-greeting`}>Greeting</Label>
                        <Input
                          id={`${templateKey}-greeting`}
                          value={templates[templateKey].greeting}
                          onChange={(e) => updateTemplate(templateKey, 'greeting', e.target.value)}
                          placeholder="Dear *{clientName}*,"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor={`${templateKey}-content`}>Main Content</Label>
                      <Textarea
                        id={`${templateKey}-content`}
                        value={templates[templateKey].content}
                        onChange={(e) => updateTemplate(templateKey, 'content', e.target.value)}
                        placeholder="Your main message content..."
                        className="min-h-[100px]"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`${templateKey}-footer`}>Footer Message</Label>
                      <Textarea
                        id={`${templateKey}-footer`}
                        value={templates[templateKey].footer || ''}
                        onChange={(e) => updateTemplate(templateKey, 'footer', e.target.value)}
                        placeholder="Optional footer message..."
                        className="min-h-[60px]"
                      />
                    </div>

                    {/* Preview */}
                    <div className="bg-muted p-4 rounded-lg">
                      <Label className="text-sm font-medium text-muted-foreground">Preview:</Label>
                      <div className="mt-2 whitespace-pre-wrap text-sm font-mono bg-background p-3 rounded border">
                        {`*${templates[templateKey].title}*

${templates[templateKey].greeting}

${templates[templateKey].content}

${templates[templateKey].footer || ''}

Thank you for choosing *{firmName}*
_{firmTagline}_
{contactInfo}`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              disabled={isLoading || isSaving}
            >
              <RefreshIcon className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={saveTemplates}
                disabled={isLoading || isSaving}
              >
                <BookmarkAdd01Icon className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Templates'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentShareTemplateEditor;