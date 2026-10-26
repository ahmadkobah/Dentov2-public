import { useState } from 'react';
import { Bell, Search, Moon, Sun, User, LogOut, Settings } from 'lucide-react';
import { Button } from '@dento/ui';
import { cn } from '@dento/ui';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
    >
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants, modules, logs…"
            aria-label="Global search"
            className="w-64 rounded-lg border border-gray-200 bg-gray-50 py-2 ps-10 pe-4 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white lg:w-80"
          />
          <kbd className="absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-800 sm:inline">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="h-9 w-9"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative h-9 w-9">
          <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        {/* User Menu */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="gap-2 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden font-medium text-gray-700 dark:text-gray-300 sm:inline">
              Admin
            </span>
          </Button>

          {showUserMenu && (
            <div className="absolute end-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-red-600 dark:hover:bg-gray-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
