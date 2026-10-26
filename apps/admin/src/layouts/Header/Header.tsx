import { Menu, Bell, Moon, Sun, User } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@dento/ui';
import { useTranslation } from '../../stores/locale.store.js';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false);
  const { t } = useTranslation();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 dark:border-gray-700 dark:bg-gray-800 md:px-6">
      {/* Left */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          aria-label={t('app.menu.toggle', 'Toggle menu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          aria-label={t('app.darkMode', 'Toggle dark mode')}
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('app.notifications', 'Notifications')}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        {/* User Avatar */}
        <Button variant="ghost" size="icon" aria-label={t('app.user.menu', 'User menu')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
        </Button>
      </div>
    </header>
  );
}
