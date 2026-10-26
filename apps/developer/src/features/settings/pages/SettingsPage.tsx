/**
 * Platform SettingsPage — Dev Portal
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.8
 * Tabs: General, Branding, Currencies, Maintenance
 * Uses combined query to prefetch all singletons, then delegates to tab components.
 */

import { Tabs, TabsList, TabsTrigger, TabsContent, PageHeader, Skeleton } from '@dento/ui';
import { Settings, Palette, Coins, AlertTriangle, Radio } from 'lucide-react';
import { useAllPlatformSettings } from '../hooks/useSystemSettings.js';
import { GeneralSettingsTab } from '../components/GeneralSettingsTab.js';
import { BrandingSettingsTab } from '../components/BrandingSettingsTab.js';
import { CurrenciesTab } from '../components/CurrenciesTab.js';
import { MaintenanceTab } from '../components/MaintenanceTab.js';
import { PlatformChannelsTab } from '../components/PlatformChannelsTab.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

/* ------------------------------------------------------------------ */
/*  Tab config                                                         */
/* ------------------------------------------------------------------ */

const TABS = [
  { value: 'general', label: 'General', icon: Settings },
  { value: 'channels', label: 'Channels', icon: Radio },
  { value: 'branding', label: 'Branding', icon: Palette },
  { value: 'currencies', label: 'Currencies', icon: Coins },
  { value: 'maintenance', label: 'Maintenance', icon: AlertTriangle },
] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { data, isLoading, isError, refetch } = useAllPlatformSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings"
        description="Manage global system configuration, branding, currencies, and maintenance mode"
      />

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {!isLoading && data && (
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="general">
            <GeneralSettingsTab settings={data.systemSettings} />
          </TabsContent>

          <TabsContent value="channels">
            <PlatformChannelsTab />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettingsTab branding={data.branding} />
          </TabsContent>

          <TabsContent value="currencies">
            <CurrenciesTab currencies={data.currencies} />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceTab settings={data.systemSettings} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
