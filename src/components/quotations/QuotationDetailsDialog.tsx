import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar01Icon, 
  Location01Icon, 
  UserGroupIcon,
  Download01Icon,
  Call02Icon,
  AiMailIcon,
  MoneyBag02Icon,
  DollarCircleIcon,
  Loading03Icon,
  ContactIcon,
  CreditCardIcon,
  PercentIcon,
  Time01Icon,
  FileEditIcon,
  Camera02Icon,
  Video02Icon,
  DroneIcon,
  Edit02Icon,
  Add01Icon
} from 'hugeicons-react';
import { Quotation } from '@/types/studio';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { downloadQuotationPDF } from './QuotationPDFRenderer';

interface QuotationDetailsDialogProps {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuotationDetailsDialog = ({ quotation, open, onOpenChange }: QuotationDetailsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [enhancedQuotation, setEnhancedQuotation] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (quotation && open) {
      loadQuotationDetails();
    }
  }, [quotation, open]);

  const loadQuotationDetails = async () => {
    if (!quotation) return;

    try {
      setLoading(true);

      // Fetch detailed quotation data with client information
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select(`
          *,
          client:clients(name, phone, email, address)
        `)
        .eq('id', quotation.id)
        .single();

      if (quotationError) throw quotationError;
      setEnhancedQuotation(quotationData);
    } catch (error: any) {
      toast({
        title: "Error loading quotation details",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!enhancedQuotation) return;

    try {
      setDownloadingPDF(true);
      const result = await downloadQuotationPDF(enhancedQuotation);
      if (result.success) {
        toast({
          title: "PDF Downloaded",
          description: "Quotation PDF has been downloaded successfully.",
        });
      } else {
        throw new Error('PDF generation failed');
      }
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (!quotation || !enhancedQuotation) return null;

  // Calculate financial details
  const originalAmount = enhancedQuotation.amount || 0;
  const hasDiscount = enhancedQuotation.discount_type && enhancedQuotation.discount_value && enhancedQuotation.discount_value > 0;
  const discountAmount = enhancedQuotation.discount_amount || 0;
  const discountedAmount = hasDiscount ? originalAmount - discountAmount : originalAmount;

  // Extract quotation details with better structure
  const quotationDetails = enhancedQuotation.quotation_details as any;
  const photographerCount = quotationDetails?.photographers || 0;
  const cinematographerCount = quotationDetails?.cinematographers || 0;
  const addOns = quotationDetails?.addOns || [];
  const days = quotationDetails?.days || [];
  const totalDays = days.length || 1;
  const sameDayEditing = quotationDetails?.sameDayEditing || false;
  const postProductionItems = quotationDetails?.postProductionItems || [];
  const selectedPostProductionPackage = quotationDetails?.selectedPostProductionPackage || '45k';
  const customPostProductionAmount = quotationDetails?.customPostProductionAmount || 0;

  // Calculate crew totals
  const totalCrewByRole = days.reduce((totals: any, day: any) => {
    return {
      photographers: totals.photographers + (day.photographers || 0),
      cinematographers: totals.cinematographers + (day.cinematographers || 0),
      drone: totals.drone + (day.drone || 0),
    };
  }, { photographers: 0, cinematographers: 0, drone: 0 });

  // Check if expired
  const isExpired = enhancedQuotation.valid_until ? 
    new Date(enhancedQuotation.valid_until) < new Date() : false;

  // Format date range
  const startDate = new Date(enhancedQuotation.event_date);
  const formattedDateRange = totalDays === 1 
    ? startDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      }).toUpperCase()
    : `${startDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase()} - ${new Date(startDate.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase()}`;

  if (loading && !enhancedQuotation) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] h-[70vh] sm:max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base sm:text-lg font-semibold">
            <div className="flex items-center gap-2">
              <FileEditIcon className="h-4 w-4 text-primary" />
              <span className="text-sm sm:text-base font-semibold truncate">{enhancedQuotation.title}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="gap-1 h-8 text-xs w-full sm:w-auto"
            >
              {downloadingPDF ? (
                <>
                  <Loading03Icon className="h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download01Icon className="h-3 w-3" />
                  Download PDF
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Status Section */}
          <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={
                    enhancedQuotation.converted_to_event ? 'default' :
                    isExpired ? 'destructive' : 'secondary'
                  }
                  className="text-xs"
                >
                  {enhancedQuotation.converted_to_event ? 'Converted to Event' : 
                   isExpired ? 'Expired' : 'Active'}
                </Badge>
                {enhancedQuotation.valid_until && !isExpired && (
                  <span className="text-xs text-muted-foreground">
                    Valid until: {new Date(enhancedQuotation.valid_until).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-foreground">
                  ₹{discountedAmount.toLocaleString()}
                </div>
                {hasDiscount && (
                  <div className="text-xs text-muted-foreground line-through">
                    ₹{originalAmount.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quotation Basic Info */}
          <div className="bg-muted/30 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <FileEditIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              Event Information
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-start gap-2 min-w-0">
                <ContactIcon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground">Client: </span>
                  <span className="font-medium break-words">{enhancedQuotation.client?.name || 'No client'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 min-w-0">
                <Calendar01Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground">Event Date: </span>
                  <span className="font-medium break-words">{formattedDateRange}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 min-w-0">
                <Location01Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground">Venue: </span>
                  <span className="font-medium break-words">{enhancedQuotation.venue || 'Not specified'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 min-w-0">
                <Time01Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-muted-foreground">Event Type: </span>
                  <span className="font-medium break-words">{enhancedQuotation.event_type || 'Not specified'}</span>
                </div>
              </div>
              {enhancedQuotation.client?.phone && (
                <div className="flex items-start gap-2 min-w-0">
                  <Call02Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-muted-foreground">Phone: </span>
                    <span className="font-medium break-all">{enhancedQuotation.client.phone}</span>
                  </div>
                </div>
              )}
              {enhancedQuotation.client?.email && (
                <div className="flex items-start gap-2 min-w-0">
                  <AiMailIcon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-muted-foreground">Email: </span>
                    <span className="font-medium break-all">{enhancedQuotation.client.email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Crew Information - Day by Day */}
          {days.length > 0 && (
            <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Crew Configuration ({totalDays} day{totalDays > 1 ? 's' : ''})
              </h3>
              
              {/* Crew Summary */}
              <div className="rounded-lg p-3 border border-border">
                <div className="text-xs font-medium text-muted-foreground mb-3">Total Crew Summary</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-center sm:justify-start gap-2 p-2 rounded border border-border">
                    <Camera02Icon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="text-center sm:text-left">
                      <div className="font-bold text-lg text-blue-500">{totalCrewByRole.photographers}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">Photographers</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 p-2 rounded border border-border">
                    <Video02Icon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div className="text-center sm:text-left">
                      <div className="font-bold text-lg text-green-500">{totalCrewByRole.cinematographers}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">Cinematographers</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 p-2 rounded border border-border">
                    <DroneIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <div className="text-center sm:text-left">
                      <div className="font-bold text-lg text-purple-500">{totalCrewByRole.drone}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">Drone Operators</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Day-by-Day Breakdown */}
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground">Day-wise Breakdown</div>
                {days.map((day: any, index: number) => (
                  <div key={day.id || index} className="rounded-lg p-3 border border-border overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 min-w-0">
                      <h4 className="text-sm font-medium truncate">{day.name || `Day ${index + 1}`}</h4>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        Total: ₹{((day.photographers * day.photographerRate) + 
                                 (day.cinematographers * day.cinematographerRate) + 
                                 (day.drone * day.droneRate)).toLocaleString()}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded border border-border min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <Camera02Icon className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          <span className="text-blue-500 font-medium">{day.photographers}</span>
                          <span className="text-muted-foreground truncate">Photographers</span>
                        </div>
                        <span className="font-medium text-foreground whitespace-nowrap">₹{(day.photographers * day.photographerRate).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded border border-border min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <Video02Icon className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span className="text-green-500 font-medium">{day.cinematographers}</span>
                          <span className="text-muted-foreground truncate">Cinematographers</span>
                        </div>
                        <span className="font-medium text-foreground whitespace-nowrap">₹{(day.cinematographers * day.cinematographerRate).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded border border-border min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <DroneIcon className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          <span className="text-purple-500 font-medium">{day.drone}</span>
                          <span className="text-muted-foreground truncate">Drone Operators</span>
                        </div>
                        <span className="font-medium text-foreground whitespace-nowrap">₹{(day.drone * day.droneRate).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Same Day Editing */}
              {sameDayEditing && (
                <div className="rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2">
                    <Edit02Icon className="h-3 w-3 text-amber-600" />
                    <span className="text-sm font-medium text-amber-600">Same Day Editing Included</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Fast editing and delivery on the same day
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Post-Production Items */}
          {Array.isArray(postProductionItems) && postProductionItems.length > 0 && (
            <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <Edit02Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Post-Production Deliverables
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                {postProductionItems.map((item: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded border border-border">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="break-words text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {Array.isArray(addOns) && addOns.length > 0 && (
            <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <Add01Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Add-ons & Extras
              </h3>
              <div className="space-y-2 text-xs sm:text-sm">
                {addOns.filter((addOn: any) => addOn.enabled).map((addOn: any, index: number) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 px-3 rounded border border-border gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-words text-foreground">{addOn.name || `Add-on ${index + 1}`}</div>
                      {addOn.description && (
                        <div className="text-xs text-muted-foreground mt-1 break-words">{addOn.description}</div>
                      )}
                      {addOn.unit && addOn.quantity > 1 && (
                        <div className="text-xs text-muted-foreground">
                          Quantity: {addOn.quantity} {addOn.unit}
                        </div>
                      )}
                    </div>
                    <span className="font-medium flex-shrink-0 text-primary text-base sm:text-sm">
                      ₹{((addOn.price || 0) * (addOn.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              Financial Summary
            </h3>
            
            {/* Amount Section */}
            <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm sm:text-base font-medium text-muted-foreground flex-1 min-w-0">Original Amount:</span>
                <span className="text-sm sm:text-lg font-bold text-foreground flex-shrink-0">₹{originalAmount.toLocaleString()}</span>
              </div>
              
              {hasDiscount && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground flex-1 min-w-0">
                      Discount ({enhancedQuotation.discount_type === 'percentage' ? `${enhancedQuotation.discount_value}%` : '₹' + enhancedQuotation.discount_value}):
                    </span>
                    <span className="text-sm font-medium text-destructive flex-shrink-0">-₹{discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between gap-2">
                    <span className="text-sm sm:text-base font-semibold text-foreground flex-1 min-w-0">Final Amount:</span>
                    <span className="text-sm sm:text-lg font-bold text-foreground flex-shrink-0">₹{discountedAmount.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {enhancedQuotation.description && (
            <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Description</h3>
              <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {enhancedQuotation.description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationDetailsDialog;