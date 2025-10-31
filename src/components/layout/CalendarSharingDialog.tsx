import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar01Icon, Delete02Icon, Mail01Icon } from 'hugeicons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalendarSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firmId: string;
}

interface CalendarEntry {
  id: string;
  email: string;
  role: string;
}

export const CalendarSharingDialog = ({ open, onOpenChange, firmId }: CalendarSharingDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'reader' | 'writer'>('writer');
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [calendarId, setCalendarId] = useState<string>('');

  const loadEntries = async () => {
    if (!firmId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-calendar-sharing', {
        body: { firmId, action: 'list' }
      });

      if (error) throw error;

      if (data.success) {
        setEntries(data.entries || []);
        setCalendarId(data.calendarId || '');
      } else {
        throw new Error(data.error || 'Failed to load calendar entries');
      }
    } catch (error: any) {
      console.error('Error loading calendar entries:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load calendar sharing settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open, firmId]);

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-calendar-sharing', {
        body: { 
          firmId, 
          action: 'add',
          email: newEmail.trim(),
          role: newRole
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });
        setNewEmail('');
        setNewRole('writer');
        await loadEntries();
      } else {
        throw new Error(data.error || 'Failed to share calendar');
      }
    } catch (error: any) {
      console.error('Error sharing calendar:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to share calendar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-calendar-sharing', {
        body: { 
          firmId, 
          action: 'remove',
          email
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });
        await loadEntries();
      } else {
        throw new Error(data.error || 'Failed to remove access');
      }
    } catch (error: any) {
      console.error('Error removing calendar access:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove calendar access",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar01Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Manage Calendar Sharing
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Share your Google Calendar with team members or clients. They'll receive an invitation to view/edit events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Calendar ID Display */}
          {calendarId && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Calendar ID</p>
              <p className="text-xs font-mono break-all" title={calendarId}>
                {calendarId}
              </p>
            </div>
          )}

          {/* Add New Email Section */}
          <div className="space-y-3 rounded-lg border p-4 bg-card">
            <h3 className="text-sm font-semibold">Share with New Email</h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm">Permission Level</Label>
                <Select value={newRole} onValueChange={(value: 'reader' | 'writer') => setNewRole(value)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reader">Read Only (View events)</SelectItem>
                    <SelectItem value="writer">Full Access (View & edit events)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAddEmail} 
                disabled={loading || !newEmail.trim()}
                className="w-full"
              >
                <Mail01Icon className="h-4 w-4 mr-2" />
                {loading ? 'Sharing...' : 'Share Calendar'}
              </Button>
            </div>
          </div>

          {/* Current Shared Emails */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Current Access</h3>
            
            {loading && entries.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground rounded-lg border border-dashed">
                No emails shared yet
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {entries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-all">{entry.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.role === 'owner' ? 'Owner' : 
                         entry.role === 'writer' ? 'Full Access' : 
                         'Read Only'}
                      </p>
                    </div>
                    
                    {entry.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEmail(entry.email)}
                        disabled={loading}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Delete02Icon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
