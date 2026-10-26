import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Button } from '@dento/ui';
import { useSidebar } from '../context/SidebarContext.js';
import { usePlatformNotifications } from '../hooks/usePlatformNotifications.js';
import { useAuthStore } from '../stores/auth.store.js';
import { apiClient } from '../lib/api-client.js';

export function AppHeader() {
  const navigate = useNavigate();
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user, clearAuth } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [_showSearch, _setShowSearch] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        _setShowSearch(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const { data: notifications = [] } = usePlatformNotifications(10);
  const unreadCount = notifications.filter((n) => !n.read).length;

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
            aria-label="Toggle menu"
            className="text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Desktop Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
            className="hidden text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 lg:flex"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search */}
          <div ref={searchRef} className="relative hidden md:block">
            <div className="relative">
              <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search or type command..."
                aria-label="Search or type command"
                className="h-10 w-[280px] rounded-lg border border-gray-200 bg-gray-50 ps-10 pe-12 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-400 lg:w-[320px]"
                onFocus={() => _setShowSearch(true)}
              />
              <div className="absolute end-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
                  ⌘
                </kbd>
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-gray-400 dark:border-gray-600 dark:bg-gray-700">
                  K
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 md:hidden"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Notifications */}
          <div ref={notificationRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              className="relative text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute end-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-medium text-white">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute end-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                    {unreadCount} new
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`flex gap-3 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 ${
                          !notification.read ? 'bg-brand-50/30 dark:bg-brand-500/5' : ''
                        }`}
                      >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20">
                          <Bell className="h-4 w-4 text-brand-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">{notification.time}</p>
                        </div>
                        {!notification.read && (
                          <div className="flex h-2 w-2 flex-shrink-0 items-center justify-center rounded-full bg-brand-500" />
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                  <Link
                    to="/notifications"
                    className="block text-center text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div ref={userMenuRef} className="relative">
            <Button
              variant="outline"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="User menu"
              className="h-auto gap-3 border-gray-200 py-1.5 ps-1.5 pe-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20">
                <User className="h-4 w-4 text-brand-500" />
              </div>
              <div className="hidden text-start lg:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.firstName || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.platformRole?.replace(/_/g, ' ') || user?.role || 'Platform User'}
                </p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-gray-400 lg:block" />
            </Button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute end-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 px-4 pb-3 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.email || 'user@dento.app'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.platformRole?.replace(/_/g, ' ') || 'Platform User'}
                  </p>
                </div>
                <div className="py-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Link>
                  <Link
                    to="/support"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Help & Support
                  </Link>
                </div>
                <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 rounded-none px-4 py-2 text-error-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={async () => {
                      try {
                        await apiClient.post('/api/auth/logout');
                      } catch {
                        // cookie may already be expired — still clear client state
                      }
                      clearAuth();
                      navigate('/login');
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
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
