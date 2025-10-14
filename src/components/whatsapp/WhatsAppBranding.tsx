import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Save, RotateCcw, BrushIcon } from 'lucide-react';

interface BrandingSettings {
  firm_name: string;
  firm_tagline: string;
  contact_info: string;
  footer_signature: string;
}

const defaultBranding: BrandingSettings = {
  firm_name: 'PRIT PHOTO',
  firm_tagline: 'Professional Event Management',
  contact_info: 'Contact: +91 91064 03233',
  footer_signature: 'Your memories, our passion'
};

const WhatsAppBranding = () => {
  const { currentFirmId } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<BrandingSettings>(defaultBranding);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadBrandingSettings();
  }, [currentFirmId]);

  const loadBrandingSettings = async () => {
    if (!currentFirmId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wa_sessions')
        .select('firm_name, firm_tagline, contact_info, footer_signature')
        .eq('firm_id', currentFirmId)
        .single();

      if (data) {
        setSettings({
          firm_name: data.firm_name || defaultBranding.firm_name,
          firm_tagline: data.firm_tagline || defaultBranding.firm_tagline,
          contact_info: data.contact_info || defaultBranding.contact_info,
          footer_signature: data.footer_signature || defaultBranding.footer_signature
        });
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBrandingSettings = async () => {
    if (!currentFirmId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('wa_sessions')
        .upsert({
          id: currentFirmId,
          firm_id: currentFirmId,
          ...settings
        });

      if (error) throw error;

      toast({
        title: "Branding Saved",
        description: "WhatsApp branding settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast({
        title: "Error",
        description: "Failed to save branding settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings(defaultBranding);
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(defaultBranding);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              Loading branding settings...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Firm Branding</h3>
          <p className="text-sm text-muted-foreground">
            Customize how your firm appears in WhatsApp messages
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults} size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={saveBrandingSettings} 
            disabled={isSaving || !hasChanges}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Firm Name & Tagline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firm Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firm_name">Firm Name</Label>
              <Input
                id="firm_name"
                value={settings.firm_name}
                onChange={(e) => setSettings(prev => ({ ...prev, firm_name: e.target.value }))}
                placeholder="Your Firm Name"
                disabled={isSaving}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="firm_tagline">Tagline</Label>
              <Input
                id="firm_tagline"
                value={settings.firm_tagline}
                onChange={(e) => setSettings(prev => ({ ...prev, firm_tagline: e.target.value }))}
                placeholder="#YourFirmTagline"
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="contact_info">Contact Details</Label>
              <Textarea
                id="contact_info"
                value={settings.contact_info}
                onChange={(e) => setSettings(prev => ({ ...prev, contact_info: e.target.value }))}
                placeholder="Contact: +91 98765 43210&#10;Email: your@email.com"
                rows={3}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Contact information for messages
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            How your branding will appear in WhatsApp messages
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-4 rounded-lg border-2 border-dashed border-border">
            <div className="bg-background p-4 rounded-lg shadow-sm font-mono text-sm">
              <div className="space-y-2">
                <div className="font-bold">*EVENT CONFIRMED*</div>
                <div>Dear *John Doe*,</div>
                <div>Your event has been successfully confirmed:</div>
                <div className="my-3 text-muted-foreground">
                  [Event details would appear here]
                </div>
                <div className="border-t pt-3 space-y-1 text-xs">
                  <div>Thank you for choosing *{settings.firm_name}*</div>
                  <div className="italic">_{settings.firm_tagline}_</div>
                  <div>{settings.contact_info}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppBranding;