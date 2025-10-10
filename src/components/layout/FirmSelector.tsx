
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FirmCreationDialog from '@/components/FirmCreationDialog';

interface FirmSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FirmSelectorDialog = ({ open, onOpenChange }: FirmSelectorDialogProps) => {
  const { 
    currentFirmId, 
    currentFirm, 
    firms, 
    updateCurrentFirm, 
    loadFirms,
  } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleFirmSelect = (firmId: string) => {
    updateCurrentFirm(firmId);
    onOpenChange(false);
    toast({
      title: "Firm switched",
      description: "Successfully switched to the selected firm.",
    });
  };

  const handleFirmCreated = async (firmId?: string) => {
    await loadFirms();
    if (firmId) {
      updateCurrentFirm(firmId);
    }
    setCreateDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] max-w-[360px] p-0 bg-card">
          <DialogHeader className="sr-only">
            <DialogTitle>Switch Firm</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto">
            <div className="p-3 border-b">
              <h3 className="text-sm font-semibold text-foreground">Switch Firm</h3>
            </div>
            
            {firms.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-2">No firms available</p>
                <p className="text-xs opacity-75">Create your first firm to get started</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {firms.map((firm) => (
                  <Button
                    key={firm.id}
                    variant="ghost"
                    onClick={() => handleFirmSelect(firm.id)}
                    className={`w-full justify-start h-auto p-3 rounded-lg transition-all ${
                      firm.id === currentFirmId 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md mr-3 flex-shrink-0 ${
                      firm.id === currentFirmId 
                        ? 'bg-primary/20' 
                        : 'bg-muted'
                    }`}>
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{firm.name}</p>
                    </div>
                    {firm.id === currentFirmId && (
                      <div className="w-2 h-2 bg-primary rounded-full ml-2 flex-shrink-0" />
                    )}
                  </Button>
                ))}
              </div>
            )}

            <div className="border-t p-2">
              <Button 
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(true);
                  onOpenChange(false);
                }}
                className="w-full justify-center text-sm py-2.5 rounded-lg hover:bg-accent"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span>Create New Firm</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FirmCreationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onFirmCreated={handleFirmCreated}
      />
    </>
  );
};

export default FirmSelectorDialog;
