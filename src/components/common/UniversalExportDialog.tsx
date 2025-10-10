import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download01Icon, FilterIcon } from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';
import { useFirmData } from '@/hooks/useFirmData';
import { applyUniversalFilter, getFilterDisplayLabel } from './UniversalExportFilterLogic';

export interface FilterOption {
  value: string;
  label: string;
}

export interface ExportConfig {
  title: string;
  filterTypes: {
    value: string;
    label: string;
    options?: FilterOption[];
  }[];
  exportFunction: (data: any[], filterType: string, filterValue: string, firmData?: any) => Promise<void>;
  getPreviewData: (data: any[], filterType: string, selectedValue: string) => {
    count: number;
    summary?: Record<string, any>;
  };
}

interface UniversalExportDialogProps {
  data: any[];
  config: ExportConfig;
  trigger?: React.ReactNode;
  additionalData?: any;
}

const UniversalExportDialog: React.FC<UniversalExportDialogProps> = ({ 
  data, 
  config, 
  trigger,
  additionalData 
}) => {
  const [filterType, setFilterType] = useState<string>(config.filterTypes[0]?.value || '');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { firmData } = useFirmData();

  const currentFilterConfig = config.filterTypes.find(ft => ft.value === filterType);
  const hasOptions = currentFilterConfig?.options && currentFilterConfig.options.length > 0;

  const getFilteredData = () => {
    // If this filter type has no options, treat the type itself as the filter key
    const effectiveSelected = hasOptions ? selectedValue : filterType;
    const effectiveType = hasOptions ? filterType : 'status';
    return applyUniversalFilter(data, effectiveType, effectiveSelected);
  };

  const getFilterDisplayValue = () => {
    return getFilterDisplayLabel(filterType, selectedValue, currentFilterConfig);
  };

  const handleExport = async () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) {
      toast({
        title: "No Data Found",
        description: "No items match the selected filter criteria.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const actualSelectedValue = hasOptions 
        ? (selectedValue || currentFilterConfig?.options?.[0]?.value)
        : filterType;
      await config.exportFunction(filteredData, filterType, actualSelectedValue || getFilterDisplayValue(), firmData);
      toast({
        title: "Export Successful",
        description: `${config.title} exported with ${filteredData.length} items.`,
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to generate ${config.title.toLowerCase()}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isValid = () => {
    if (filterType === 'global' || filterType === 'all') return true;
    if (hasOptions) return selectedValue !== '';
    return true;
  };

  const previewData = config.getPreviewData(getFilteredData(), filterType, selectedValue);

  const defaultTrigger = (
    <Button variant="outline" className="rounded-full p-3" disabled={isExporting}>
      {isExporting ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Download01Icon className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[calc(100vh-6rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Export {config.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {config.filterTypes.length > 1 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Filter Type</Label>
              <Select 
                value={filterType} 
                onValueChange={(value) => {
                  setFilterType(value);
                  setSelectedValue(''); // Reset selection when filter type changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select filter type" />
                </SelectTrigger>
                <SelectContent>
                  {config.filterTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasOptions && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {currentFilterConfig?.label.replace('By ', '')}
              </Label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${currentFilterConfig?.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {currentFilterConfig?.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Records:</span>
                  <span className="font-semibold">{previewData.count}</span>
                </div>
                
                {previewData.summary && Object.entries(previewData.summary).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!isValid() || isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <Download01Icon className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UniversalExportDialog;
