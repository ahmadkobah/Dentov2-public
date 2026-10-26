/**
 * Online Booking Settings Tab — Per-branch booking configuration
 *
 * Displays a card per branch with toggles for:
 *   - isEnabled, isAutoConfirm, isDoctorSelectionAllowed
 *   - isPatientPhoneRequired, isPatientEmailRequired
 *   - autoConfirmLeadTimeHours (number)
 *   - enabledServices (multi-select)
 *   - confirmationMessage (textarea)
 *
 * Uses useUpdateOnlineBookingConfig to persist changes.
 */

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Switch,
  Textarea,
} from '@dento/ui';
import { Loader2, Save, Globe, Building2, Check } from 'lucide-react';
import { useBranchList, type OnlineBookingConfig } from '@/features/branches/hooks/useBranches.js';
import { useServiceList } from '@/features/services/hooks/useServices.js';
import { useUpdateOnlineBookingConfig } from '@/features/schedules/hooks/useSchedules.js';
import { useTranslation } from '@/stores/locale.store.js';

// ── Per-branch form state ──────────────────────────────────

interface BranchBookingForm {
  isEnabled: boolean;
  isAutoConfirm: boolean;
  autoConfirmLeadTimeHours: number;
  isPatientPhoneRequired: boolean;
  isPatientEmailRequired: boolean;
  isDoctorSelectionAllowed: boolean;
  enabledServices: string[];
  confirmationMessage: string;
}

function configToForm(config?: OnlineBookingConfig): BranchBookingForm {
  return {
    isEnabled: config?.isEnabled ?? false,
    isAutoConfirm: config?.isAutoConfirm ?? false,
    autoConfirmLeadTimeHours: config?.autoConfirmLeadTimeHours ?? 24,
    isPatientPhoneRequired: config?.isPatientPhoneRequired ?? true,
    isPatientEmailRequired: config?.isPatientEmailRequired ?? false,
    isDoctorSelectionAllowed: config?.isDoctorSelectionAllowed ?? true,
    enabledServices: config?.enabledServices ?? [],
    confirmationMessage: config?.confirmationMessage?.en ?? '',
  };
}

// ── Branch Card ─────────────────────────────────────────────

function BranchBookingCard({
  branchId,
  branchName,
  initialConfig,
  services,
}: {
  branchId: string;
  branchName: string;
  initialConfig?: OnlineBookingConfig;
  services: { _id: string; name: { en: string; ar?: string } }[];
}) {
  const [form, setForm] = useState<BranchBookingForm>(() => configToForm(initialConfig));
  const [isDirty, setIsDirty] = useState(false);
  const updateConfig = useUpdateOnlineBookingConfig();
  const { t } = useTranslation();

  const update = (patch: Partial<BranchBookingForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const toggleService = (serviceId: string) => {
    setForm((prev) => {
      const next = prev.enabledServices.includes(serviceId)
        ? prev.enabledServices.filter((s) => s !== serviceId)
        : [...prev.enabledServices, serviceId];
      return { ...prev, enabledServices: next };
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    updateConfig.mutate(
      {
        branchId,
        data: {
          isEnabled: form.isEnabled,
          isAutoConfirm: form.isAutoConfirm,
          autoConfirmLeadTimeHours: form.autoConfirmLeadTimeHours,
          isPatientPhoneRequired: form.isPatientPhoneRequired,
          isPatientEmailRequired: form.isPatientEmailRequired,
          isDoctorSelectionAllowed: form.isDoctorSelectionAllowed,
          enabledServices: form.enabledServices,
          confirmationMessage: { en: form.confirmationMessage, ar: '' },
        },
      },
      {
        onSuccess: () => setIsDirty(false),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">{branchName}</CardTitle>
              <CardDescription>{t('settings.onlineBooking.configTitle')}</CardDescription>
            </div>
          </div>
          <Badge variant={form.isEnabled ? 'default' : 'secondary'}>
            {form.isEnabled
              ? t('settings.onlineBooking.enabled')
              : t('settings.onlineBooking.disabled')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-sm font-medium">
              {t('settings.onlineBooking.enableToggle.label')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('settings.onlineBooking.enableToggle.description')}
            </p>
          </div>
          <Switch checked={form.isEnabled} onCheckedChange={(val) => update({ isEnabled: val })} />
        </div>

        {form.isEnabled && (
          <>
            {/* Confirmation Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('settings.onlineBooking.confirmation.title')}
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">
                      {t('settings.onlineBooking.confirmation.autoConfirmLabel')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.onlineBooking.confirmation.autoConfirmDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={form.isAutoConfirm}
                    onCheckedChange={(val) => update({ isAutoConfirm: val })}
                  />
                </div>
                {form.isAutoConfirm && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <Label htmlFor={`leadTime-${branchId}`} className="text-sm">
                      {t('settings.onlineBooking.confirmation.leadTimeLabel')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.onlineBooking.confirmation.leadTimeDescription')}
                    </p>
                    <Input
                      id={`leadTime-${branchId}`}
                      type="number"
                      min={0}
                      max={168}
                      value={form.autoConfirmLeadTimeHours}
                      onChange={(e) =>
                        update({ autoConfirmLeadTimeHours: Number(e.target.value) || 0 })
                      }
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Patient Requirements */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('settings.onlineBooking.patientRequirements.title')}
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">
                      {t('settings.onlineBooking.patientRequirements.phoneRequired')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.onlineBooking.patientRequirements.phoneDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={form.isPatientPhoneRequired}
                    onCheckedChange={(val) => update({ isPatientPhoneRequired: val })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">
                      {t('settings.onlineBooking.patientRequirements.emailRequired')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.onlineBooking.patientRequirements.emailDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={form.isPatientEmailRequired}
                    onCheckedChange={(val) => update({ isPatientEmailRequired: val })}
                  />
                </div>
              </div>
            </div>

            {/* Booking Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('settings.onlineBooking.bookingOptions.title')}
              </h4>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">
                    {t('settings.onlineBooking.bookingOptions.allowDoctorSelection')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.onlineBooking.bookingOptions.allowDoctorDescription')}
                  </p>
                </div>
                <Switch
                  checked={form.isDoctorSelectionAllowed}
                  onCheckedChange={(val) => update({ isDoctorSelectionAllowed: val })}
                />
              </div>
            </div>

            {/* Enabled Services */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('settings.onlineBooking.bookingOptions.enabledServices')}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t('settings.onlineBooking.bookingOptions.enabledServicesDescription')}
              </p>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {t('settings.onlineBooking.bookingOptions.noServices')}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((svc) => {
                    const selected = form.enabledServices.includes(svc._id);
                    return (
                      <button
                        key={svc._id}
                        type="button"
                        onClick={() => toggleService(svc._id)}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-start text-sm transition-colors ${
                          selected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-gray-400'
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            selected ? 'border-primary bg-primary text-white' : 'border-gray-300'
                          }`}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </div>
                        {svc.name.en}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirmation Message */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('settings.onlineBooking.confirmationMessage.label')}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t('settings.onlineBooking.confirmationMessage.description')}
              </p>
              <Textarea
                value={form.confirmationMessage}
                onChange={(e) => update({ confirmationMessage: e.target.value })}
                placeholder={t('settings.onlineBooking.confirmationMessage.placeholder')}
                rows={3}
              />
            </div>
          </>
        )}

        {/* Save */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateConfig.isPending}
            className="gap-2"
          >
            {updateConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('settings.onlineBooking.saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Tab ────────────────────────────────────────────────

export function OnlineBookingSettingsTab() {
  const { data: branchData, isLoading: branchesLoading } = useBranchList({ limit: 50 });
  const { data: serviceData, isLoading: servicesLoading } = useServiceList({
    page: 1,
    limit: 100,
    isActive: true,
  });
  const { t } = useTranslation();

  if (branchesLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const branches = branchData?.items ?? [];
  const services = serviceData?.items ?? [];

  if (branches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Globe className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">{t('settings.onlineBooking.noBranches.title')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('settings.onlineBooking.noBranches.description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {t('settings.onlineBooking.topDescription')}
        </p>
      </div>
      {branches.map((branch) => (
        <BranchBookingCard
          key={branch._id}
          branchId={branch._id}
          branchName={branch.name.en}
          initialConfig={branch.onlineBookingConfig}
          services={services}
        />
      ))}
    </div>
  );
}
