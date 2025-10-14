import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Sun02Icon, Moon02Icon } from 'hugeicons-react';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="h-8 w-8 rounded-full p-0 hover:bg-primary/10"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? (
          <Sun02Icon className="h-3.5 w-3.5 text-primary transition-transform duration-300 ease-in-out transform rotate-180" />
        ) : (
          <Moon02Icon className="h-3.5 w-3.5 text-primary transition-transform duration-300 ease-in-out transform rotate-0" />
        )}
      </Button>
    </div>
  );
};

export default ThemeToggle;