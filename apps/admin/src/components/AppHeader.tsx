import { useState, useRef, useEffect } from 'react';
import { Button } from '@dento/ui';
import { Link } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Settings,
  User,
  LogOut,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext.js';
import { ChatToggle } from '../layouts/ChatPanel/ChatToggle.js';
import {
  useNotificationList,
  useUnreadCount,
  useMarkAsRead,
} from '../features/notifications/hooks/useNotifications.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useSocket, setNotificationSoundPreset } from '../hooks/useSocket.js';
import { useNotificationPreferences } from '../features/notifications/hooks/useNotificationPreferences.js';
import { useTranslation } from '../stores/locale.store.js';
import { useThemeStore } from '../stores/theme.store.js';
import { useSupportedLanguages } from '../hooks/useSupportedLanguages.js';

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AppHeader() {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { t, locale } = useTranslation();
  const { isMultiLang, supportedLanguages } = useSupportedLanguages();
  const setLocale = useThemeStore((s) => s.setLocale);

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'User';
  const shortName = user?.firstName || 'User';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';
  const userEmail = user?.email || '';
  const userRole = user?.role || '';

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const { data: notifData } = useNotificationList({ limit: 5 });
  const { data: unreadCount = 0 } = useUnreadCount();
  const { mutate: markAsRead } = useMarkAsRead();

  // Socket.io for real-time notifications + sound
  useSocket();

  // Sync sound preset from user preferences
  const { data: prefs } = useNotificationPreferences();
  useEffect(() => {
    if (prefs?.soundPreset) {
      setNotificationSoundPreset(prefs.soundPreset);
    }
  }, [prefs?.soundPreset]);

  const notifications = notifData?.notifications ?? [];

  return (
    <header className="sticky top-0 z-40 flex h-[72px] w-full items-center border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
      <div className="flex flex-1 items-center justify-between">
        {/* Left: Menu Toggle + Search */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileSidebar}
            aria-label={t('app.menu.toggle', 'Toggle menu')}
            className="h-10 w-10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Desktop Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={t('app.menu.toggle', 'Toggle menu')}
            className="hidden h-10 w-10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 lg:flex"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('app.search.placeholder')}
              className="h-10 w-[280px] rounded-lg border border-gray-200 bg-gray-50 ps-10 pe-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-400 lg:w-[360px]"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={t('app.darkMode')}
            className="h-10 w-10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Language Toggle */}
          {isMultiLang &&
            (() => {
              const idx = supportedLanguages.indexOf(locale);
              const nextLocale = supportedLanguages[(idx + 1) % supportedLanguages.length] ?? 'en';
              const label = nextLocale === 'ar' ? 'ع' : nextLocale.toUpperCase();
              return (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocale(nextLocale)}
                  aria-label={t('app.language')}
                  className="h-10 w-10 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {label}
                </Button>
              );
            })()}

          {/* Chat Toggle — §14 / §37 */}
          <ChatToggle />

          {/* Notifications */}
          <div ref={notificationRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label={t('app.notifications', 'Notifications')}
              className="relative h-10 w-10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute end-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="animate-dropdown absolute end-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t('app.notifications')}
                  </h3>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    {unreadCount} {t('app.notifications.new')}
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                      {t('app.notifications.none')}
                    </p>
                  )}
                  {notifications.map((notification) => {
                    const title =
                      typeof notification.title === 'string'
                        ? notification.title
                        : (notification.title?.en ?? '');
                    const message =
                      typeof notification.body === 'string'
                        ? notification.body
                        : (notification.body?.en ?? '');
                    const timeAgo = formatTimeAgo(notification.createdAt);

                    return (
                      <div
                        key={notification._id}
                        className={`flex cursor-pointer gap-3 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 ${
                          !notification.isRead ? 'bg-brand-50/50 dark:bg-brand-500/5' : ''
                        }`}
                        onClick={() => {
                          if (!notification.isRead) markAsRead(notification._id);
                        }}
                      >
                        <div
                          className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                            notification.isRead ? 'bg-gray-300 dark:bg-gray-600' : 'bg-brand-500'
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {message}
                          </p>
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{timeAgo}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Link
                  to="/notifications"
                  className="block border-t border-gray-200 px-4 py-3 text-center text-sm font-medium text-brand-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-brand-400 dark:hover:bg-gray-700/50"
                >
                  {t('app.notifications.viewAll')}
                </Link>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div ref={userMenuRef} className="relative">
            <Button
              variant="ghost"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label={t('app.user.menu', 'User menu')}
              className="gap-2 py-1.5 ps-1.5 pe-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                {initials}
              </div>
              <div className="hidden text-start md:block">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{shortName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {userRole.replace('_', ' ')}
                </p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-400 md:block" />
            </Button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="animate-dropdown absolute end-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 px-4 pb-3 pt-1 dark:border-gray-700">
                  <p className="font-medium text-gray-900 dark:text-white">{fullName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <User className="h-4 w-4" />
                    {t('app.user.profile')}
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Settings className="h-4 w-4" />
                    {t('app.user.settings')}
                  </Link>
                  <Link
                    to="/help"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {t('app.user.help')}
                  </Link>
                </div>
                <div className="border-t border-gray-200 pt-1 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    className="flex w-full gap-3 px-4 py-2 text-sm text-error-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => {
                      clearAuth();
                      setShowUserMenu(false);
                      navigate('/login');
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t('app.user.signOut')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
