import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, CheckCircle, MessageCircle, Link, RefreshCw, Zap, Settings, BrushIcon, FileText } from 'lucide-react';
import { QrCode01Icon } from 'hugeicons-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { EmptyState } from '@/components/ui/empty-state';
import { useIsMobile } from '@/hooks/use-mobile';
import WhatsAppBranding from '@/components/whatsapp/WhatsAppBranding';
import UnifiedNotificationTemplates from '@/components/whatsapp/UnifiedNotificationTemplates';

type ConnectionStage = 'initial' | 'qr-generated' | 'connected';

const WhatsAppIntegration = () => {
  const { profile, currentFirmId } = useAuth();
  const isMobile = useIsMobile();
  const [stage, setStage] = useState<ConnectionStage>('initial');
  const [qrCode, setQrCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  const hasCheckedStatus = useRef<string | boolean>(false);
  const [activeSection, setActiveSection] = useState<'connection' | 'branding' | 'templates'>('connection');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from WhatsApp Integration.');
  const [testPhone, setTestPhone] = useState('');
  const { toast } = useToast();

  // Reset state when firm changes
  useEffect(() => {
    if (currentFirmId) {
      hasCheckedStatus.current = false;
      setStage('initial');
      setQrCode('');
      setIsLoading(false);
      setIsSendingTest(false);
      setIsCheckingStatus(false);
      setInitialLoading(true);
    }
  }, [currentFirmId]);

  // Get backend URL and check initial status
  useEffect(() => {
    const initializeWhatsApp = async () => {
      if (!currentFirmId) {
        setInitialLoading(false);
        return;
      }
      
      setInitialLoading(true);
      
      try {
        // Get backend URL with timeout and error handling
        let backendUrlData;
        try {
          const { data } = await supabase.functions.invoke('get-backend-url');
          backendUrlData = data;
        } catch (backendError) {
          console.warn('Backend URL fetch failed, using fallback:', backendError);
          setBackendUrl('');
          setStage('initial');
          setInitialLoading(false);
          return;
        }
        
        if (!backendUrlData?.url) {
          console.warn('Backend URL not configured');
          setBackendUrl('');
          setStage('initial');
          setInitialLoading(false);
          return;
        }
        setBackendUrl(backendUrlData.url);
        
        // Check database for existing session
        const { data: sessionData, error: sessionError } = await supabase
          .from('wa_sessions')
          .select('status, session_data, updated_at')
          .eq('id', currentFirmId)
          .eq('firm_id', currentFirmId)
          .maybeSingle();

        if (!sessionData || sessionError) {
          setStage('initial');
          setInitialLoading(false);
          return;
        }

        if (sessionData.status === 'connected') {
          setStage('connected');
        } else {
          try {
            const response = await fetch(`${backendUrlData.url}/api/whatsapp/status?firmId=${currentFirmId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
              const statusData = await response.json();
              if (statusData.isConnected && statusData.firmId === currentFirmId) {
                setStage('connected');
              } else if (statusData.hasQR && statusData.firmId === currentFirmId) {
                setStage('qr-generated');
              } else {
                setStage('initial');
              }
            } else {
              setStage('initial');
            }
          } catch (fetchError) {
            console.warn('Backend status check failed:', fetchError);
            setStage('initial');
          }
        }
      } catch (error) {
        console.error('WhatsApp initialization error:', error);
        toast({
          title: "Initialization Warning",
          description: "Some features may be limited. Please refresh if issues persist.",
          variant: "destructive",
        });
        setStage('initial');
      } finally {
        setInitialLoading(false);
      }
    };
    
    const timeoutId = setTimeout(initializeWhatsApp, 100);
    return () => clearTimeout(timeoutId);
  }, [currentFirmId, toast]);

  // Real-time subscription for WhatsApp session status changes
  useEffect(() => {
    if (!currentFirmId) return;

    const channel = supabase
      .channel('wa-session-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wa_sessions',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          console.log('Real-time WhatsApp status update:', payload);
          const newStatus = payload.new?.status;
          if (newStatus === 'connected') {
            setStage('connected');
            toast({
              title: "WhatsApp Connected!",
              description: "Your WhatsApp account is now linked successfully",
            });
          } else if (newStatus === 'disconnected') {
            setStage('initial');
            toast({
              title: "WhatsApp Disconnected",
              description: "Your WhatsApp connection has been lost",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentFirmId, toast]);

  const generateQR = async () => {
    if (!currentFirmId) {
      toast({
        title: "Configuration Error",
        description: "Please select a firm first",
        variant: "destructive",
      });
      return;
    }
    
    if (!backendUrl) {
      toast({
        title: "Backend Configuration Error",
        description: "Backend service is not available. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    
    if (initialLoading) {
      toast({
        title: "Please Wait",
        description: "WhatsApp is still initializing. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStage('initial'); // Reset stage
    setQrCode(''); // Clear old QR
    
    try {
      // First disconnect any existing session
      try {
        await fetch(`${backendUrl}/api/whatsapp/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firmId: currentFirmId }),
        });
      } catch (disconnectErr) {
        console.warn('Disconnect error (continuing):', disconnectErr);
      }

      // Wait a moment for cleanup
      await new Promise(r => setTimeout(r, 1000));

      const generateResponse = await fetch(`${backendUrl}/api/whatsapp/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmId: currentFirmId }),
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text().catch(() => 'Unknown error');
        throw new Error(`Backend generate-qr failed: ${generateResponse.status} - ${errorText}`);
      }

      const generateData = await generateResponse.json();
      if (!generateData.success) {
        throw new Error(generateData.message || 'Failed to initiate QR generation');
      }

      // Poll for QR availability with reduced timeout
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max (reduced from 60)
      
      while (attempts < maxAttempts) {
        try {
          const qrResponse = await fetch(`${backendUrl}/api/whatsapp/qr?firmId=${currentFirmId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            if (qrData.success && qrData.qrCode && qrData.firmId === currentFirmId) {
              setQrCode(qrData.qrCode);
              setStage('qr-generated');
              toast({
                title: 'QR Code Generated',
                description: 'Scan with your WhatsApp to connect',
              });
              return;
            }
          }
        } catch (pollErr) {
          console.warn('[WhatsApp] QR poll failed, retrying...', pollErr);
        }

        attempts++;
        await new Promise((r) => setTimeout(r, 1000));
      }
      
      throw new Error('Timeout waiting for QR code generation');
    } catch (error: unknown) {
      console.error('QR generation error:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = "Failed to generate QR code. Please try again.";
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (errorMsg.includes('405') || errorMsg.includes('BLOCKED')) {
        errorMessage = "⚠️ WhatsApp Connection Blocked\n\nYour backend server's IP has been flagged by WhatsApp's anti-bot system.\n\n✅ Solutions:\n1. Enable VPN on your backend server\n2. Switch hosting provider\n3. Use WhatsApp Business API\n4. Wait 24-48 hours\n\n💡 This is NOT a code error - WhatsApp blocks automated connections.";
      } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
        errorMessage = "Connection timeout. Backend may be sleeping. Wait 1 minute and retry.";
      } else if (errorMsg.includes('Backend')) {
        errorMessage = "Backend connection error. Check if server is running.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setStage('initial');
      setQrCode('');
      toast({
        title: 'Connection Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnection = async () => {
    if (!backendUrl || initialLoading || !currentFirmId) {
      toast({
        title: "Configuration Error",
        description: !currentFirmId ? "Please select a firm first" : "Backend URL not configured",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingStatus(true);
    try {
      const response = await fetch(`${backendUrl}/api/whatsapp/status?firmId=${currentFirmId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.isConnected && data.firmId === currentFirmId) {
          try {
            // Get firm data to populate session info
            const { data: firmData } = await supabase
              .from('firms')
              .select('name, tagline, contact_phone, contact_email')
              .eq('id', currentFirmId)
              .single();

            const { error: upsertError } = await supabase
              .from('wa_sessions')
              .upsert({
                id: currentFirmId,
                firm_id: currentFirmId,
                session_data: data.sessionData || { connected: true, timestamp: new Date().toISOString() },
                status: 'connected',
                reconnect_enabled: false
              });
            
            if (upsertError) {
              console.error('Error storing session data:', upsertError);
            }
          } catch (dbError) {
            console.error('Database error occurred:', dbError);
          }

          setStage('connected');
          toast({
            title: "WhatsApp Connected!",
            description: `Your WhatsApp account is now linked successfully for firm ${data.firmId}`,
          });
        } else {
          toast({
            title: "Not Connected Yet",
            description: `Please scan the QR code with your WhatsApp for firm ${currentFirmId}`,
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Failed to check connection status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check connection status",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const sendTestMessage = async () => {
    if (!backendUrl || initialLoading || !currentFirmId) {
      toast({
        title: "Configuration Error",
        description: !currentFirmId ? "Please select a firm first" : "Backend URL not configured",
        variant: "destructive",
      });
      return;
    }

    if (!testPhone || !testMessage) {
      toast({
        title: "Missing Information",
        description: "Please enter both message and phone number",
        variant: "destructive",
      });
      return;
    }

    // Phone validation
    const cleaned = testPhone.replace(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 15) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number with country code",
        variant: "destructive",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch(`${backendUrl}/api/whatsapp/send-custom-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          firmId: currentFirmId,
          message: testMessage,
          phone: testPhone
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Test Message Sent!",
            description: `Message sent successfully to ${testPhone}`,
          });
          setTestDialogOpen(false);
        } else {
          throw new Error(data.message || 'Failed to send test message');
        }
      } else {
        throw new Error('Failed to send test message');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send test message",
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentFirmId) {
      toast({
        title: "Configuration Error",
        description: "Please select a firm first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, clear session from database
      const { error: deleteError } = await supabase
        .from('wa_sessions')
        .delete()
        .eq('firm_id', currentFirmId);

      if (deleteError) {
        console.error('Database delete error:', deleteError);
      }

      // Then try to disconnect from backend if available
      if (backendUrl) {
        try {
          const response = await fetch(`${backendUrl}/api/whatsapp/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firmId: currentFirmId }),
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const data = await response.json();
            if (!data.success) {
              console.warn('Backend disconnect returned failure:', data.message);
            }
          }
        } catch (backendError) {
          console.warn('Backend disconnect failed (continuing):', backendError);
        }
      }

      // Always reset UI state
      setStage('initial');
      setQrCode('');
      
      toast({
        title: "Disconnected",
        description: "WhatsApp session cleared successfully",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      
      // Force clear UI even on error
      setStage('initial');
      setQrCode('');
      
      toast({
        title: "Session Cleared",
        description: "WhatsApp session has been cleared. You can reconnect now.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Initializing WhatsApp...</p>
        </div>
      </div>
    );
  }

  if (!currentFirmId) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="No Firm Selected"
        description="Please select a firm to configure WhatsApp integration."
      />
    );
  }

  const isAnyLoading = initialLoading || isLoading || isCheckingStatus || isSendingTest;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex justify-center">
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${
          stage === 'connected' 
            ? 'bg-primary/10 border-primary/20 text-primary' 
            : 'bg-muted/50 border-border'
        }`}>
          {stage === 'connected' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Link className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {stage === 'connected' ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      {/* Tab Navigation - Desktop Tabs / Mobile Dropdown */}
      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as any)} className="w-full">
        <div className="flex justify-center mb-6">
          {isMobile ? (
            <Select value={activeSection} onValueChange={(value) => setActiveSection(value as any)}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connection">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Connection
                  </div>
                </SelectItem>
                <SelectItem value="branding">
                  <div className="flex items-center gap-2">
                    <BrushIcon className="h-4 w-4" />
                    Branding
                  </div>
                </SelectItem>
                <SelectItem value="templates">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Templates
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger 
                value="connection" 
                className="flex items-center gap-2 text-sm"
              >
                <Link className="h-4 w-4" />
                Connection
              </TabsTrigger>
              <TabsTrigger 
                value="branding" 
                className="flex items-center gap-2 text-sm"
              >
                <BrushIcon className="h-4 w-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="flex items-center gap-2 text-sm"
              >
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
            </TabsList>
          )}
        </div>

        {/* Connection Tab */}
        <TabsContent value="connection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                WhatsApp Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {stage === 'initial' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Connect WhatsApp</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate a QR code to link your WhatsApp account
                    </p>
                  </div>
                  <Button 
                    onClick={generateQR} 
                    disabled={isAnyLoading}
                    size="lg"
                    className="w-full max-w-xs"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating QR...
                      </>
                    ) : (
                      <>
                        <QrCode01Icon className="mr-2 h-4 w-4" />
                        Generate QR Code
                      </>
                    )}
                  </Button>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      Having connection issues or seeing sync errors?
                    </p>
                    <Button 
                      onClick={handleDisconnect} 
                      disabled={isAnyLoading}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Clear Session & Retry
                    </Button>
                  </div>
                </div>
              )}

              {stage === 'qr-generated' && qrCode && (
                <div className="text-center space-y-4">
                  <div className="bg-white p-4 rounded-lg border inline-block">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Scan QR Code</h3>
                    <p className="text-sm text-muted-foreground">
                      Open WhatsApp on your phone and scan this code
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      onClick={checkConnection} 
                      disabled={isAnyLoading}
                      variant="outline"
                    >
                      {isCheckingStatus ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Check Status
                        </>
                      )}
                    </Button>
                    <Button onClick={generateQR} disabled={isAnyLoading}>
                      <QrCode01Icon className="mr-2 h-4 w-4" />
                      New QR
                    </Button>
                  </div>
                </div>
              )}

              {stage === 'connected' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-primary">Connected!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your WhatsApp is successfully connected
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button disabled={isAnyLoading} variant="outline">
                          <Send className="mr-2 h-4 w-4" />
                          Send Test
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Send Test WhatsApp Message</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="test-message">Test Message</Label>
                            <Textarea 
                              id="test-message"
                              value={testMessage} 
                              onChange={(e) => setTestMessage(e.target.value)}
                              placeholder="Enter your test message..."
                              rows={4}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="test-phone">Recipient Phone Number</Label>
                            <Input 
                              id="test-phone"
                              value={testPhone}
                              onChange={(e) => setTestPhone(e.target.value)}
                              placeholder="+91 98765 43210"
                              type="tel"
                              className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Enter with country code (e.g., +91 for India)
                            </p>
                          </div>
                          <Button 
                            onClick={sendTestMessage} 
                            disabled={isSendingTest}
                            className="w-full"
                          >
                            {isSendingTest ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Test Message
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button onClick={handleDisconnect} disabled={isAnyLoading} variant="destructive">
                      Disconnect
                    </Button>
                    <Button onClick={generateQR} disabled={isAnyLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reconnect
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <WhatsAppBranding />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <UnifiedNotificationTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppIntegration;