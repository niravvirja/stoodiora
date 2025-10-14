import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HardDriveIcon, Add01Icon, Delete02Icon } from 'hugeicons-react';
import { DiskDropdownSelect } from '@/components/forms/DiskDropdownSelect';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { syncEventInBackground } from '@/services/googleSheetsSync';
import type { Event } from '@/types/studio';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DiskEntry {
  id: string;
  name: string;
}

interface DiskManagementDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DiskManagementDialog = ({ event, open, onOpenChange }: DiskManagementDialogProps) => {
  const { toast } = useToast();
  const { currentFirmId } = useAuth();
  const [disks, setDisks] = useState<DiskEntry[]>([{ id: crypto.randomUUID(), name: '' }]);
  const [sizeValue, setSizeValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (event && open) {
      // Parse existing disks from comma-separated string
      const existingDisks = event.storage_disk 
        ? event.storage_disk.split(',').map(disk => ({ 
            id: crypto.randomUUID(), 
            name: disk.trim() 
          })).filter(disk => disk.name)
        : [{ id: crypto.randomUUID(), name: '' }];
      
      setDisks(existingDisks.length > 0 ? existingDisks : [{ id: crypto.randomUUID(), name: '' }]);
      setSizeValue(event.storage_size ? String(event.storage_size) : '');
    }
  }, [event, open]);

  const isValid = useMemo(() => {
    return disks.some(disk => disk.name.trim().length > 0);
  }, [disks]);

  const addDisk = () => {
    setDisks([...disks, { id: crypto.randomUUID(), name: '' }]);
  };

  const removeDisk = (id: string) => {
    if (disks.length > 1) {
      setDisks(disks.filter(disk => disk.id !== id));
    }
  };

  const updateDisk = (id: string, name: string) => {
    setDisks(disks.map(disk => disk.id === id ? { ...disk, name } : disk));
  };

  const confirmClearAll = async () => {
    if (!event || !currentFirmId) return;

    setShowClearConfirm(false);
    setSaving(true);
    
    try {
      // Update database - clear disk and storage data
      const { error } = await supabase
        .from('events')
        .update({
          storage_disk: null,
          storage_size: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (error) throw error;

      // Reset local state immediately for UI feedback
      setDisks([{ id: crypto.randomUUID(), name: '' }]);
      setSizeValue('');

      toast({ 
        title: 'Storage cleared', 
        description: 'Disk and storage data removed from database and syncing to Google Sheets...' 
      });

      // Sync to Google Sheets to remove the data there as well
      await syncEventInBackground(event.id, currentFirmId, 'update');

      // Close the dialog after successful clearing
      onOpenChange(false);

    } catch (err: any) {
      toast({ 
        title: 'Clear failed', 
        description: err.message || 'Failed to clear storage details', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!event || !currentFirmId) return;
    if (!isValid) {
      toast({ title: 'Disk name required', description: 'Please enter/select at least one disk name.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const numericSize = sizeValue && !isNaN(Number(sizeValue)) ? Number(sizeValue) : null;
      const sizeInGB = numericSize ? Math.round(numericSize) : null;

      // Join all non-empty disk names with commas
      const diskNames = disks
        .map(disk => disk.name.trim())
        .filter(name => name.length > 0)
        .join(', ');

      const { error } = await supabase
        .from('events')
        .update({
          storage_disk: diskNames,
          storage_size: sizeInGB,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({ title: 'Disks updated', description: 'Storage details saved successfully.' });

      // Background sync to Google Sheets
      syncEventInBackground(event.id, currentFirmId, 'update');

      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message || 'Failed to update storage details', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><HardDriveIcon className="h-5 w-5" /> Storage Disk</DialogTitle>
        </DialogHeader>

        {event && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Storage Disks</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDisk}
                  className="h-8 px-2"
                >
                  <Add01Icon className="h-3 w-3 mr-1" />
                  Add Disk
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {disks.map((disk, index) => (
                  <div key={disk.id} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <DiskDropdownSelect 
                        value={disk.name} 
                        onValueChange={(value) => updateDisk(disk.id, value)} 
                        placeholder={`Disk ${index + 1}...`}
                      />
                    </div>
                    {disks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDisk(disk.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Delete02Icon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Size (GB)</label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 500"
                value={sizeValue}
                onChange={(e) => setSizeValue(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center gap-2 pt-2">
              <Button 
                variant="destructive" 
                onClick={() => setShowClearConfirm(true)} 
                disabled={saving}
                className="mr-auto"
              >
                Clear All
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !isValid}>{saving ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Storage Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all disk names and storage size information from both the database and Google Sheets. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAll}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Clearing...' : 'Yes, Clear All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DiskManagementDialog;