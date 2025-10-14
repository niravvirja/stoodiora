import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectScrollUpButton, SelectScrollDownButton } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Staff {
  id: string;
  full_name: string;
  role?: string;
}

interface SearchableStaffSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  staffOptions: Staff[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  required?: boolean;
  getDisplayText?: (staff: Staff) => string;
}

export const SearchableStaffSelect = ({
  value,
  onValueChange,
  staffOptions,
  placeholder = "Select staff",
  searchPlaceholder = "Search staff...",
  className,
  disabled,
  allowClear = false,
  required = false,
  getDisplayText
}: SearchableStaffSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredStaff = useMemo(() => {
    if (!searchTerm.trim()) return staffOptions;
    
    return staffOptions.filter(staff =>
      staff.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.role && staff.role.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [staffOptions, searchTerm]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm('');
    }
  };

  const getStaffDisplayText = (staff: Staff) => {
    if (getDisplayText) {
      return getDisplayText(staff);
    }
    return staff.full_name;
  };

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      onOpenChange={handleOpenChange}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-lg min-w-[200px] max-h-96">
        <SelectScrollUpButton />
        <div className="p-2 border-b pointer-events-auto" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="relative pointer-events-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
              className="pl-9 h-9 pointer-events-auto"
            />
          </div>
        </div>
        <div className="max-h-[250px] overflow-y-auto">
          {allowClear && (
            <SelectItem value="__CLEAR__" className="hover:bg-accent">Clear Selection</SelectItem>
          )}
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => (
              <SelectItem key={staff.id} value={staff.id} className="hover:bg-accent">
                {getStaffDisplayText(staff)}
              </SelectItem>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No staff found
            </div>
          )}
        </div>
        <SelectScrollDownButton />
      </SelectContent>
    </Select>
  );
};
