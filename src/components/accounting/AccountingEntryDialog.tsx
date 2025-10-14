import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AccountingEntry, useAccountingEntries } from '@/hooks/useAccountingEntries';
import { Add01Icon, Edit02Icon, AttachmentIcon, Delete02Icon, Alert01Icon, Loading03Icon } from 'hugeicons-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { UnifiedDialog } from '@/components/ui/unified-dialog';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';

const formSchema = z.object({
  entry_type: z.enum(['Credit', 'Debit', 'Assets']),
  category: z.enum([
    'Cameras',
    'Lenses',
    'Lighting Equipment',
    'Audio Equipment',
    'Drones',
    'Stabilizers & Gimbals',
    'Tripods & Stands',
    'Storage & Backup',
    'Computer & Software',
    'Office Equipment',
    'Vehicles',
    'Studio Rent',
    'Utilities',
    'Marketing',
    'Insurance',
    'Maintenance',
    'Travel',
    'Staff Salary',
    'Freelancer Payment',
    'Bank Charges',
    'Taxes',
    'Loan & EMI',
    'Event Revenue',
    'Other Income',
    'Other Expense',
    'Custom'
  ]),
  subcategory: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  entry_date: z.date(),
  payment_method: z.enum(['Cash', 'Digital']).default('Cash'),
  document_url: z.string().optional(),
  reflect_to_company: z.boolean().default(false),
});

interface AccountingEntryDialogProps {
  entry?: AccountingEntry;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editingEntry?: AccountingEntry;
}

// Photography/Videography Studio Categories
const INCOME_CATEGORIES = [
  'Event Revenue',
  'Other Income',
] as const;

const EXPENSE_CATEGORIES = [
  'Studio Rent',
  'Utilities',
  'Marketing',
  'Insurance',
  'Maintenance',
  'Travel',
  'Staff Salary',
  'Freelancer Payment',
  'Bank Charges',
  'Taxes',
  'Loan & EMI',
  'Other Expense',
] as const;

const ASSET_CATEGORIES = [
  'Cameras',
  'Lenses',
  'Lighting Equipment',
  'Audio Equipment',
  'Drones',
  'Stabilizers & Gimbals',
  'Tripods & Stands',
  'Storage & Backup',
  'Computer & Software',
  'Office Equipment',
  'Vehicles',
  'Custom',
] as const;

const ALL_CATEGORIES = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
  ...ASSET_CATEGORIES
] as const;

export const AccountingEntryDialog = ({ entry, trigger, onSuccess, open: externalOpen, onOpenChange: externalOnOpenChange, editingEntry }: AccountingEntryDialogProps) => {
  // Use editingEntry if provided, otherwise fall back to entry
  const currentEntry = editingEntry || entry;
  
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [submitting, setSubmitting] = useState(false);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<z.infer<typeof formSchema> | null>(null);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const isSubmittingRef = useRef(false); // Submission guard to prevent duplicates
  const { createEntry, updateEntry } = useAccountingEntries();
  const { currentFirmId } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entry_type: (currentEntry?.entry_type as any) || 'Credit',
      category: (currentEntry?.category as any) || 'Custom',
      subcategory: currentEntry?.subcategory || '',
      title: currentEntry?.title || '',
      description: currentEntry?.description || '',
      amount: currentEntry?.amount || 0,
      entry_date: currentEntry ? new Date(currentEntry.entry_date) : new Date(),
      payment_method: (currentEntry?.payment_method as any) || 'Cash',
      document_url: currentEntry?.document_url || '',
      reflect_to_company: currentEntry?.reflect_to_company || false,
    },
  });

  // Reset form when editingEntry changes
  useEffect(() => {
    if (currentEntry && open) {
      form.reset({
        entry_type: (currentEntry.entry_type as any) || 'Credit',
        category: (currentEntry.category as any) || 'Custom',
        subcategory: currentEntry.subcategory || '',
        title: currentEntry.title || '',
        description: currentEntry.description || '',
        amount: currentEntry.amount || 0,
        entry_date: currentEntry ? new Date(currentEntry.entry_date) : new Date(),
        payment_method: (currentEntry.payment_method as any) || 'Cash',
        document_url: currentEntry.document_url || '',
        reflect_to_company: currentEntry.reflect_to_company || false,
      });
    } else if (!currentEntry && open) {
      form.reset({
        entry_type: 'Credit',
        category: 'Custom',
        subcategory: '',
        title: '',
        description: '',
        amount: 0,
        entry_date: new Date(),
        payment_method: 'Cash',
        document_url: '',
        reflect_to_company: false,
      });
    }
  }, [currentEntry, open]);

  // Watch the entry type to dynamically filter categories
  const entryType = form.watch('entry_type');
  const currentCategory = form.watch('category');

  // Get available categories based on entry type
  const getAvailableCategories = () => {
    if (entryType === 'Credit') return INCOME_CATEGORIES;
    if (entryType === 'Debit') return EXPENSE_CATEGORIES;
    if (entryType === 'Assets') return ASSET_CATEGORIES;
    return ALL_CATEGORIES;
  };

  // Reset category if it's not valid for the selected entry type
  const handleEntryTypeChange = (newEntryType: 'Credit' | 'Debit' | 'Assets') => {
    form.setValue('entry_type', newEntryType);
    
    let availableCategories: readonly string[];
    if (newEntryType === 'Credit') {
      availableCategories = INCOME_CATEGORIES;
    } else if (newEntryType === 'Debit') {
      availableCategories = EXPENSE_CATEGORIES;
    } else {
      availableCategories = ASSET_CATEGORIES;
    }
    
    // If current category is not valid for the new entry type, reset to the first available category
    const categoryExists = availableCategories.some(cat => cat === currentCategory);
    if (!categoryExists) {
      form.setValue('category', availableCategories[0] as any);
    }
  };

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      console.log('Submission already in progress, ignoring duplicate');
      return;
    }

    // If editing existing entry, show confirmation
    if (currentEntry) {
      setPendingSubmission(values);
      setConfirmUpdateOpen(true);
      return;
    }

    // For new entries, show company reflection dialog
    setPendingSubmission(values);
    setShowCompanyDialog(true);
  };

  const submitEntry = async (values: z.infer<typeof formSchema>) => {
    // Double-check submission guard
    if (isSubmittingRef.current) {
      console.log('Submission blocked - already in progress');
      return;
    }

    // Set submission guard immediately
    isSubmittingRef.current = true;
    setSubmitting(true);
    
    try {
      const entryData = {
        category: values.category,
        subcategory: values.subcategory,
        title: values.title,
        description: values.description,
        amount: values.amount,
        entry_type: values.entry_type,
        entry_date: values.entry_date.toISOString().split('T')[0],
        payment_method: values.payment_method,
        document_url: values.document_url || null,
        reflect_to_company: values.reflect_to_company,
      };

      if (currentEntry) {
        await updateEntry(currentEntry.id, entryData);
        toast({
          title: "Entry updated",
          description: "Accounting entry has been updated successfully.",
        });
      } else {
        const result = await createEntry(entryData);
        if (result) {
          toast({
            title: "Entry created",
            description: values.reflect_to_company 
              ? "Accounting entry created and reflected in company finances."
              : "Accounting entry created as personal record.",
          });
        }
      }

      // Always close dialog and reset state after successful submission
      setOpen(false);
      setShowCompanyDialog(false);
      setPendingSubmission(null);
      form.reset();
      
      // Call the onSuccess callback to trigger refresh
      onSuccess?.();
    } catch (error) {
      console.error('Error saving accounting entry:', error);
      toast({
        title: "Error",
        description: "Failed to save entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false; // Reset guard
    }
  };

  const handleCompanyConfirmation = (reflectToCompany: boolean) => {
    if (pendingSubmission) {
      const finalValues = { ...pendingSubmission, reflect_to_company: reflectToCompany };
      submitEntry(finalValues);
    }
  };

  const handleNoCompanyReflection = () => {
    handleCompanyConfirmation(false);
  };

  // Reset form when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setShowCompanyDialog(false);
      setPendingSubmission(null);
      isSubmittingRef.current = false; // Reset guard when dialog closes
      form.reset();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button size="sm" className="h-9 w-9 p-0">
              <Add01Icon className="w-4 h-4" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle>{currentEntry ? 'Edit' : 'Add'} Accounting Entry</DialogTitle>
            <DialogDescription>
              {currentEntry ? 'Update the accounting entry details.' : 'Add a new accounting entry to track your business finances.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              {/* Row 1: Entry Type and Category */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entry_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Type <span className="text-destructive">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => handleEntryTypeChange(value as 'Credit' | 'Debit' | 'Assets')} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50">
                          <SelectItem value="Credit">Credit (Money In)</SelectItem>
                          <SelectItem value="Debit">Debit (Money Out)</SelectItem>
                          <SelectItem value="Assets">Assets (Purchases)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder={
                              form.watch('entry_type') === 'Credit' 
                                ? 'Select income category' 
                                : form.watch('entry_type') === 'Debit' 
                                  ? 'Select expense category'
                                  : form.watch('entry_type') === 'Assets'
                                    ? 'Select asset category'
                                    : 'Select category'
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50 max-h-[200px] overflow-y-auto">
                          {getAvailableCategories().map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter entry title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subcategory" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 2: Amount and Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border shadow-md z-50">
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Digital">Digital</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 3: Date - Full Width */}
              <FormField
                control={form.control}
                name="entry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <InlineDatePicker
                        value={field.value}
                        onSelect={field.onChange}
                        placeholder="Select date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Document URL */}
              <FormField
                control={form.control}
                name="document_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document URL (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/document.pdf" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Reflection Toggle for Editing */}
              {entry && (
                <FormField
                  control={form.control}
                  name="reflect_to_company"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Reflect in Company Finances</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Include this entry in finance reports and calculations
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || isSubmittingRef.current} className="flex-1">
                  {submitting ? (
                    <>
                      <Loading03Icon className="w-4 h-4 mr-2 animate-spin" />
                      {entry ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {entry ? 'Update' : 'Create'} Entry
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Company Reflection Confirmation Dialog */}
      <EnhancedConfirmationDialog
        open={showCompanyDialog}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            // User closed dialog without choosing - reset state to allow editing
            setShowCompanyDialog(false);
            setPendingSubmission(null);
            // Don't auto-submit, let user go back to form
          }
        }}
        onConfirm={() => handleCompanyConfirmation(true)}
        onCancel={() => handleCompanyConfirmation(false)}
        title="Reflect to Company Finances?"
        description="Do you want this entry to be reflected in your company's financial reports and statistics?

• YES: This entry will affect your company's payment in/out calculations and appear in financial reports.

• NO: This will be recorded as a personal accounting entry only.

• CLOSE (X): Cancel and go back to edit the form."
        confirmText="Yes, Reflect to Company" 
        cancelText="No, Personal Only"
        variant="warning"
        icon={<Alert01Icon className="h-5 w-5" />}
        loading={submitting}
      />

      {/* Edit Confirmation Dialog */}
      <UnifiedDialog
        open={confirmUpdateOpen}
        onOpenChange={setConfirmUpdateOpen}
        onConfirm={async () => {
          if (pendingSubmission) {
            setConfirmUpdateOpen(false);
            await submitEntry(pendingSubmission);
          }
        }}
        variant="info"
        title="Confirm Entry Update"
        description="Update this accounting entry? All changes will be saved to your records."
        confirmText="Confirm Update"
        cancelText="Cancel"
      />
    </>
  );
};