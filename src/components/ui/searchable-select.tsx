import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectScrollUpButton, SelectScrollDownButton } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableSelect = ({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  className,
  disabled
}: SearchableSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm('');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchTerm(e.target.value);
  };

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-lg max-h-96">
        <SelectScrollUpButton />
        <div className="p-2 border-b pointer-events-auto" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="relative pointer-events-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={handleSearchChange}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
              className="pl-9 h-9 pointer-events-auto"
            />
          </div>
        </div>
        <div className="max-h-[250px] overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="hover:bg-accent">
                {option.label}
              </SelectItem>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No results found
            </div>
          )}
        </div>
        <SelectScrollDownButton />
      </SelectContent>
    </Select>
  );
};
