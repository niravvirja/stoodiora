import { useState, useMemo, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Camera02Icon, VideoReplayIcon, AdobePremierIcon, DroneIcon, UserIcon } from 'hugeicons-react';
import { displayRole } from '@/lib/role-utils';
import * as SelectPrimitive from "@radix-ui/react-select";

interface Staff {
  id: string;
  full_name: string;
  role?: string;
  is_freelancer?: boolean;
}

interface SearchableGroupedStaffSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  staffOptions: Staff[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  required?: boolean;
}

const getRoleIcon = (role: string) => {
  const normalizedRole = displayRole(role);
  switch (normalizedRole) {
    case 'Photographer':
      return <Camera02Icon className="h-4 w-4" />;
    case 'Cinematographer':
      return <VideoReplayIcon className="h-4 w-4" />;
    case 'Editor':
      return <AdobePremierIcon className="h-4 w-4" />;
    case 'Drone Pilot':
      return <DroneIcon className="h-4 w-4" />;
    case 'Other':
    default:
      return <UserIcon className="h-4 w-4" />;
  }
};

export const SearchableGroupedStaffSelect = ({
  value,
  onValueChange,
  staffOptions,
  placeholder = "Select staff or freelancer",
  searchPlaceholder = "Search staff...",
  className,
  disabled,
  allowClear = false,
  required = false,
}: SearchableGroupedStaffSelectProps) => {
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

  const { staffMembers, freelancers } = useMemo(() => {
    const filtered = staffOptions.filter(person =>
      !searchTerm.trim() || 
      person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (person.role && person.role.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Deduplicate by name across Staff and Freelancers
    const normalize = (s: string) => s.trim().toLowerCase();

    const isFreelancerSelected = value?.startsWith('freelancer_');
    const selectedFreelancerId = isFreelancerSelected ? value?.replace('freelancer_', '') : undefined;
    const selectedStaffId = !isFreelancerSelected && value ? value : undefined;

    const staffCandidates = filtered.filter(person => !person.is_freelancer);
    const freelancerCandidates = filtered.filter(person => person.is_freelancer);

    const staffMap = new Map<string, Staff>();
    for (const s of staffCandidates) {
      const key = normalize(s.full_name);
      if (!staffMap.has(key) || (selectedStaffId && s.id === selectedStaffId)) {
        staffMap.set(key, s);
      }
    }

    const freelancerMap = new Map<string, Staff>();
    for (const f of freelancerCandidates) {
      const key = normalize(f.full_name);
      const isSelectedFreelancerItem = !!selectedFreelancerId && f.id === selectedFreelancerId;

      // If a Staff with same name exists, hide the Freelancer duplicate unless it is the currently selected value
      if (staffMap.has(key) && !isSelectedFreelancerItem) continue;

      if (!freelancerMap.has(key) || isSelectedFreelancerItem) {
        freelancerMap.set(key, f);
      }
    }

    return {
      staffMembers: Array.from(staffMap.values()),
      freelancers: Array.from(freelancerMap.values())
    };
  }, [staffOptions, searchTerm, value]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm('');
    }
  };

  const getPersonDisplayValue = (person: Staff) => {
    if (person.is_freelancer) {
      return `freelancer_${person.id}`;
    }
    return person.id;
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
      <SelectContent 
        className="p-0 min-w-[250px]"
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
        <div className="max-h-[250px] overflow-y-auto p-1" style={{ scrollbarWidth: 'thin' }}>
          {allowClear && (
            <SelectItem value="__CLEAR__">Clear Selection</SelectItem>
          )}
          
          {/* Staff Section */}
          {staffMembers.length > 0 && (
            <>
               <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 border-b">
                Staff
              </div>
              {staffMembers.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(staff.role || '')}
                    <span>{staff.full_name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          
          {/* Freelancers Section */}
          {freelancers.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 border-b">
                Freelancers
              </div>
              {freelancers.map((freelancer) => (
                <SelectItem key={freelancer.id} value={getPersonDisplayValue(freelancer)}>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(freelancer.role || '')}
                    <span>{freelancer.full_name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
          
          {staffMembers.length === 0 && freelancers.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No staff or freelancers found
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};