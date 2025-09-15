import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { 
  QrCode01Icon,
  Calculator01Icon,
  CreditCardIcon,
  UserMultiple02Icon,
  Settings02Icon
} from 'hugeicons-react';

interface AdminToolsMenuProps {
  className?: string;
  onAvailabilityClick?: () => void;
}

const AdminToolsMenu = ({ className, onAvailabilityClick }: AdminToolsMenuProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      label: 'Staff Availability',
      icon: UserMultiple02Icon,
      action: 'availability',
      description: 'Check staff availability'
    },
    {
      label: 'WhatsApp',
      icon: QrCode01Icon,
      href: '/whatsapp',
      description: 'WhatsApp Integration'
    },
    {
      label: 'Accounts',
      icon: Calculator01Icon,
      href: '/accounts',
      description: 'Accounts & Reports'
    },
    {
      label: 'Subscription',
      icon: CreditCardIcon,
      href: '/subscription',
      description: 'Manage subscription'
    }
  ];

  const handleItemClick = (item: typeof menuItems[0]) => {
    if (item.action === 'availability' && onAvailabilityClick) {
      onAvailabilityClick();
    } else if (item.href) {
      navigate(item.href);
    }
    setIsOpen(false);
  };

  return (
    <div className={className}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0 hover:bg-primary/10"
            title="Admin Tools"
          >
            <Settings02Icon className="h-3.5 w-3.5 text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
            Admin Tools
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="cursor-pointer p-3 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-1 rounded bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AdminToolsMenu;