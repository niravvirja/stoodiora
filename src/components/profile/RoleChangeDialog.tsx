import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedDialog } from '@/components/ui/unified-dialog';
import { UserRole } from '@/types/studio';
import { UserEdit01Icon, Building02Icon } from 'hugeicons-react';

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: UserRole;
  newRole: UserRole;
  userId: string;
  firmId: string;
  onSuccess: () => void;
}

// Security: Prevent admin role changes
const ADMIN_ROLE: UserRole = 'Admin';
const isAdminRole = (role: UserRole) => role === ADMIN_ROLE;

export const RoleChangeDialog = ({
  open,
  onOpenChange,
  currentRole,
  newRole,
  userId,
  firmId,
  onSuccess
}: RoleChangeDialogProps) => {
  const { toast } = useToast();
  const [firmIdInput, setFirmIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Security: Prevent admin role changes
    if (isAdminRole(currentRole)) {
      toast({
        title: "Cannot Change Admin Role",
        description: "Admin roles cannot be modified for security reasons.",
        variant: "destructive"
      });
      return;
    }

    // Security: Prevent becoming admin
    if (isAdminRole(newRole)) {
      toast({
        title: "Cannot Become Admin",
        description: "You cannot assign yourself the Admin role. Only existing Admins have this privilege.",
        variant: "destructive"
      });
      return;
    }

    // Validate firm ID
    if (firmIdInput.trim() !== firmId) {
      toast({
        title: "Invalid Firm ID",
        description: "The Firm ID you entered doesn't match your firm. Please check and try again.",
        variant: "destructive"
      });
      return;
    }

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmRoleChange = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `Your role has been successfully changed to ${newRole}.`
      });

      onSuccess();
      onOpenChange(false);
      setFirmIdInput('');
      setShowConfirmation(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFirmIdInput('');
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4">
              <UserEdit01Icon className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Confirm Role Change</DialogTitle>
            <DialogDescription className="text-center">
              You are changing from <strong>{currentRole}</strong> to <strong>{newRole}</strong>. Please verify your Firm ID to confirm.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            {/* Role Change Summary */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Role:</span>
                <span className="font-semibold">{currentRole}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">New Role:</span>
                <span className="font-semibold text-primary">{newRole}</span>
              </div>
            </div>

            {/* Firm ID Verification */}
            <div className="space-y-2">
              <Label htmlFor="firmId" className="flex items-center gap-2">
                <Building02Icon className="h-4 w-4" />
                Enter Your Firm ID to Confirm
              </Label>
              <Input
                id="firmId"
                type="text"
                value={firmIdInput}
                onChange={(e) => setFirmIdInput(e.target.value)}
                placeholder="Paste your Firm ID here"
                className="font-mono text-sm"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                You can find your Firm ID in the Firm Management section
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!firmIdInput.trim()}
              >
                <UserEdit01Icon className="mr-2 h-4 w-4" />
                Confirm Change
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <UnifiedDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={handleConfirmRoleChange}
        title="Confirm Role Change"
        description={
          <span>
            Are you sure you want to change your role from <strong>{currentRole}</strong> to <strong>{newRole}</strong>? 
            This action will update your permissions in the system.
          </span>
        }
        confirmText="Yes, Change Role"
        cancelText="Cancel"
        variant="warning"
        loading={loading}
      />
    </>
  );
};
