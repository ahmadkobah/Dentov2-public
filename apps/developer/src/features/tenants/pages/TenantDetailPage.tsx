import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  Box,
  Database,
  CreditCard,
  Palette,
  Settings,
  HeadphonesIcon,
  ExternalLink,
  Globe,
  Activity,
  Loader2,
  ShieldOff,
  Languages,
  HardDrive,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@dento/ui';
import type { TabId } from '../types/tenant-detail.types.js';
import { useTenantDetail, useUpdateTenantModules } from '../hooks/useTenants.js';
import { StartSessionDialog } from '../../support/components/StartSessionDialog.js';
import { useSupportSessions, useEndSession } from '../../support/hooks/useSupport.js';
import { OverviewTab } from '../components/OverviewTab.js';
import { ModulesTab } from '../components/ModulesTab.js';
import { UsersTab } from '../components/UsersTab.js';
import { BillingTab } from '../components/BillingTab.js';
import { ChannelsTab } from '../components/ChannelsTab.js';
import { SettingsTab } from '../components/SettingsTab.js';
import { BrandingTab } from '../components/BrandingTab.js';
import { WorkflowsTab } from '../components/WorkflowsTab.js';
import { SupportTab } from '../components/SupportTab.js';
import { DatabaseTab } from '../components/DatabaseTab.js';
import { LanguagesTab } from '../components/LanguagesTab.js';
import { BackupTab } from '../components/BackupTab.js';
import { StorageTab } from '../components/StorageTab.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

// Tab definitions per MASTER_PLAN §8 (10 Tabs)
const tabs = [
  { id: 'overview' as const, label: 'Overview', icon: Building2 },
  { id: 'modules' as const, label: 'Modules', icon: Box },
  { id: 'users' as const, label: 'Users', icon: Users },
  { id: 'billing' as const, label: 'Billing', icon: CreditCard },
  { id: 'channels' as const, label: 'Channels', icon: Globe },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
  { id: 'branding' as const, label: 'Branding', icon: Palette },
  { id: 'workflows' as const, label: 'Workflows', icon: Activity },
  { id: 'support' as const, label: 'Support', icon: HeadphonesIcon },
  { id: 'database' as const, label: 'Database', icon: Database },
  { id: 'languages' as const, label: 'Languages', icon: Languages },
  { id: 'storage' as const, label: 'Storage', icon: FolderOpen },
  { id: 'backup' as const, label: 'Backup', icon: HardDrive },
];

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [showImpersonate, setShowImpersonate] = useState(false);
  const { data: tenant, isLoading, isError, refetch } = useTenantDetail(tenantId);
  const updateModules = useUpdateTenantModules(tenantId!);

  const { data: sessionsData } = useSupportSessions({
    tenantSlug: tenantId,
    status: 'active',
    limit: 1,
  });
  const activeSession = sessionsData?.sessions?.[0] ?? null;
  const endSession = useEndSession();

  const toggleModule = (moduleId: string) => {
    const current = tenant?.modules ?? [];
    const next = current.includes(moduleId)
      ? current.filter((m) => m !== moduleId)
      : [...current, moduleId];
    updateModules.mutate(next);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="space-y-6">
        <Link
          to="/tenants"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Link>
        <QueryErrorBanner onRetry={() => refetch()} />
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab tenant={tenant} />;
      case 'modules':
        return (
          <ModulesTab
            enabledModules={tenant.modules}
            onToggle={toggleModule}
            isSaving={updateModules.isPending}
            tenantCountry={tenant.country}
            tenantCurrency={tenant.currency}
          />
        );
      case 'users':
        return <UsersTab tenantId={tenantId!} />;
      case 'billing':
        return <BillingTab tenant={tenant} tenantId={tenantId!} />;
      case 'channels':
        return <ChannelsTab tenant={tenant} />;
      case 'settings':
        return <SettingsTab tenant={tenant} tenantId={tenantId!} />;
      case 'branding':
        return <BrandingTab tenant={tenant} tenantId={tenantId!} />;
      case 'workflows':
        return <WorkflowsTab tenant={tenant} />;
      case 'support':
        return <SupportTab tenantId={tenantId!} />;
      case 'database':
        return <DatabaseTab tenant={tenant} />;
      case 'languages':
        return <LanguagesTab tenant={tenant} tenantId={tenantId!} />;
      case 'storage':
        return <StorageTab tenant={tenant} tenantId={tenantId!} />;
      case 'backup':
        return <BackupTab tenant={tenant} tenantId={tenantId!} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/tenants"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl dark:bg-brand-500/10">
              {tenant.branding.logo ? (
                <img
                  src={tenant.branding.logo}
                  alt={tenant.name.en}
                  className="h-14 w-14 rounded-2xl object-cover"
                />
              ) : (
                '🦷'
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tenant.name.en}
                </h1>
                <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                  {tenant.status}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {tenant.slug} · {tenant.country}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeSession ? (
            <Button
              variant="destructive"
              className="gap-2"
              disabled={endSession.isPending}
              onClick={() => endSession.mutate(activeSession.sessionId)}
            >
              <ShieldOff className="h-4 w-4" />
              {endSession.isPending ? 'Stopping…' : 'Stop Session'}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="gap-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => setShowImpersonate(true)}
            >
              <ExternalLink className="h-4 w-4" />
              Impersonate
            </Button>
          )}
          <Button variant="default" className="gap-2" onClick={() => setActiveTab('settings')}>
            <Settings className="h-4 w-4" />
            Configure
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={`gap-2 rounded-none border-b-2 px-4 py-3 hover:bg-transparent ${
                  isActive
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>

      <StartSessionDialog
        open={showImpersonate}
        onOpenChange={setShowImpersonate}
        defaultTenantSlug={tenant.slug}
      />
    </div>
  );
}
