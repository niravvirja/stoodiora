import { useState, useMemo, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import * as SelectPrimitive from "@radix-ui/react-select";

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const timeoutId = setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.click();
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

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

  // Find the selected staff to display in trigger
  const selectedStaff = useMemo(() => {
    if (!value) return null;
    return staffOptions.find(staff => staff.id === value);
  }, [value, staffOptions]);


  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      onOpenChange={handleOpenChange}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedStaff ? getStaffDisplayText(selectedStaff) : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent 
        className="p-0 min-w-[200px]"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.search-input-container')) {
            e.preventDefault();
          }
        }}
      >
        <div 
          className="search-input-container sticky top-0 bg-popover border-b p-3 z-50"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-10 pr-3 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-text"
              autoComplete="off"
              spellCheck={false}
              aria-label={searchPlaceholder}
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1" style={{ scrollbarWidth: 'thin' }}>
          {allowClear && (
            <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
          )}
          {filteredStaff.length > 0 ? (
            filteredStaff.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {getStaffDisplayText(staff)}
              </SelectItem>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No staff found
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};