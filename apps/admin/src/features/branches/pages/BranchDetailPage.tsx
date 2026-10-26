/**
 * Branch Detail / Edit Page
 *
 * Full branch management: info, chairs, working hours, ramadan hours,
 * holidays, slot config, online booking config.
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useBranchDetail,
  useUpdateBranch,
  useToggleRamadanMode,
  type Branch,
  type Chair,
  type WorkingHours,
  type SlotConfig,
} from '../hooks/useBranches.js';
import {
  Button,
  Input,
  Label,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
  PhoneInput,
} from '@dento/ui';
import { useTenantCountry } from '@/hooks/useTenantCountry.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '@/stores/locale.store.js';
import {
  ArrowLeft,
  Save,
  Loader2,
  Building2,
  Armchair,
  Clock,
  Moon,
  Plus,
  Trash2,
  CalendarOff,
  Settings,
} from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ── Helper to build default 7-day working hours ────────── */
function defaultWorkingHours(): WorkingHours[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    openTime: '09:00',
    closeTime: '17:00',
    isClosed: i === 5 || i === 6, // Fri + Sat closed by default
  }));
}

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: branch, isLoading, isError } = useBranchDetail(id ?? '');
  const updateMutation = useUpdateBranch(id ?? '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !branch) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/branches')}>
          <ArrowLeft className="me-2 h-4 w-4" /> {t('branches.detail.backBtn')}
        </Button>
        <div className="mt-8 text-center text-red-500">{t('branches.detail.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/branches')}>
          <ArrowLeft className="me-2 h-4 w-4" /> {t('branches.detail.breadcrumb')}
        </Button>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-6 w-6" />
            {branch.name.en}
            {branch.isPrimary && <Badge variant="default">Primary</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm">{branch.code}</p>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">
            <Building2 className="me-1.5 h-4 w-4" /> {t('branches.detail.tab.info')}
          </TabsTrigger>
          <TabsTrigger value="chairs">
            <Armchair className="me-1.5 h-4 w-4" /> {t('branches.detail.tab.chairs')}
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Clock className="me-1.5 h-4 w-4" /> {t('branches.detail.tab.workingHours')}
          </TabsTrigger>
          <TabsTrigger value="ramadan">
            <Moon className="me-1.5 h-4 w-4" /> {t('branches.detail.tab.ramadanHours')}
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <CalendarOff className="me-1.5 h-4 w-4" /> {t('branches.detail.tab.holidays')}
          </TabsTrigger>
          <TabsTrigger value="slot-config">
            <Settings className="me-1.5 h-4 w-4" /> {t('branches.detail.tab.slotConfig')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <InfoTab branch={branch} onSave={updateMutation} />
        </TabsContent>
        <TabsContent value="chairs">
          <ChairsTab branch={branch} onSave={updateMutation} />
        </TabsContent>
        <TabsContent value="hours">
          <WorkingHoursTab
            branch={branch}
            field="workingHours"
            title="Working Hours"
            description="Configure daily open/close times for this branch."
            onSave={updateMutation}
          />
        </TabsContent>
        <TabsContent value="ramadan">
          <RamadanModeToggle branchId={branch._id} isRamadanMode={branch.isRamadanMode} />
          <WorkingHoursTab
            branch={branch}
            field="ramadanHours"
            title="Ramadan Hours"
            description="Configure special Ramadan operating hours. These apply when Ramadan mode is enabled."
            onSave={updateMutation}
          />
        </TabsContent>
        <TabsContent value="holidays">
          <HolidaysTab branch={branch} onSave={updateMutation} />
        </TabsContent>
        <TabsContent value="slot-config">
          <SlotConfigTab branch={branch} onSave={updateMutation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Ramadan Mode Toggle
   ════════════════════════════════════════════════════════════ */

function RamadanModeToggle({
  branchId,
  isRamadanMode,
}: {
  branchId: string;
  isRamadanMode: boolean;
}) {
  const { t } = useTranslation();
  const toggleMutation = useToggleRamadanMode();

  return (
    <Card className="mb-4">
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="text-sm font-medium">{t('branches.detail.ramadan.modeLabel')}</p>
          <p className="text-muted-foreground text-xs">{t('branches.detail.ramadan.modeDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={isRamadanMode}
            onCheckedChange={() => toggleMutation.mutate(branchId)}
            disabled={toggleMutation.isPending}
          />
          <Badge variant={isRamadanMode ? 'default' : 'secondary'}>
            {isRamadanMode
              ? t('branches.detail.ramadan.modeOn')
              : t('branches.detail.ramadan.modeOff')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
   Info Tab
   ════════════════════════════════════════════════════════════ */

interface TabProps {
  branch: Branch;
  onSave: ReturnType<typeof useUpdateBranch>;
}

function InfoTab({ branch, onSave }: TabProps) {
  const { t } = useTranslation();
  const tenantCountry = useTenantCountry();
  const { isMultiLang } = useSupportedLanguages();
  const [form, setForm] = useState({
    nameEn: branch.name.en,
    nameAr: branch.name.ar ?? '',
    addressEn: branch.address?.en ?? '',
    addressAr: branch.address?.ar ?? '',
    city: branch.city ?? '',
    phone: branch.phone ?? '',
    email: branch.email ?? '',
  });

  const handleSave = useCallback(async () => {
    try {
      await onSave.mutateAsync({
        name: { en: form.nameEn, ar: form.nameAr || undefined },
        address: { en: form.addressEn, ar: form.addressAr || undefined },
        city: form.city || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      toast.success(t('branches.detail.toast.infoSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('branches.toast.updateFailed'));
    }
  }, [form, onSave, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('branches.detail.info.title')}</CardTitle>
        <CardDescription>{t('branches.detail.info.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('branches.detail.info.nameEn')}</Label>
            <Input
              value={form.nameEn}
              onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
            />
          </div>
          {isMultiLang && (
            <div className="space-y-2">
              <Label>{t('branches.detail.info.nameAr')}</Label>
              <Input
                value={form.nameAr}
                onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                dir="rtl"
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('branches.detail.info.addressEn')}</Label>
            <Input
              value={form.addressEn}
              onChange={(e) => setForm((p) => ({ ...p, addressEn: e.target.value }))}
            />
          </div>
          {isMultiLang && (
            <div className="space-y-2">
              <Label>{t('branches.detail.info.addressAr')}</Label>
              <Input
                value={form.addressAr}
                onChange={(e) => setForm((p) => ({ ...p, addressAr: e.target.value }))}
                dir="rtl"
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('branches.detail.info.city')}</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('branches.detail.info.phone')}</Label>
            <PhoneInput
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
              defaultCountry={tenantCountry}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('branches.detail.info.email')}</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={onSave.isPending || !form.nameEn}>
            {onSave.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {t('branches.detail.info.saveBtn')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
   Chairs Tab
   ════════════════════════════════════════════════════════════ */

function ChairsTab({ branch, onSave }: TabProps) {
  const { t } = useTranslation();
  const [chairs, setChairs] = useState<Chair[]>(branch.chairs ?? []);

  const addChair = useCallback(() => {
    const maxNum = chairs.reduce((m, c) => Math.max(m, c.number), 0);
    setChairs((prev) => [
      ...prev,
      { number: maxNum + 1, name: '', isActive: true, equipmentType: 'standard' },
    ]);
  }, [chairs]);

  const removeChair = useCallback((idx: number) => {
    setChairs((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateChair = useCallback((idx: number, updates: Partial<Chair>) => {
    setChairs((prev) => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await onSave.mutateAsync({ chairs });
      toast.success(t('branches.detail.toast.chairsSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('branches.toast.updateFailed'));
    }
  }, [chairs, onSave, t]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Chairs</CardTitle>
            <CardDescription>
              {t('branches.detail.chairs.desc', {
                active: chairs.filter((c) => c.isActive).length,
                total: chairs.length,
              })}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addChair}>
            <Plus className="me-2 h-4 w-4" /> {t('branches.detail.chairs.addBtn')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {chairs.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {t('branches.detail.chairs.empty')}
          </p>
        ) : (
          <div className="space-y-3">
            {chairs.map((chair, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex min-w-[60px] items-center gap-2">
                  <Armchair className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">#{chair.number}</span>
                </div>
                <Input
                  placeholder={t('branches.detail.chairs.namePlaceholder')}
                  value={chair.name ?? ''}
                  onChange={(e) => updateChair(idx, { name: e.target.value })}
                  className="max-w-[200px]"
                />
                <Select
                  value={chair.equipmentType ?? 'standard'}
                  onValueChange={(v) =>
                    updateChair(idx, {
                      equipmentType: v as 'standard' | 'surgical' | 'pediatric',
                    })
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">{t('branches.detail.chairs.standard')}</SelectItem>
                    <SelectItem value="surgical">{t('branches.detail.chairs.surgical')}</SelectItem>
                    <SelectItem value="pediatric">
                      {t('branches.detail.chairs.pediatric')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={chair.isActive}
                    onCheckedChange={(v) => updateChair(idx, { isActive: v })}
                  />
                  <span className="text-xs">
                    {chair.isActive
                      ? t('branches.detail.chairs.active')
                      : t('branches.detail.chairs.inactive')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChair(idx)}
                  className="ms-auto text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={onSave.isPending}>
            {onSave.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {t('branches.detail.chairs.saveBtn')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
   Working Hours Tab (shared for regular + Ramadan)
   ════════════════════════════════════════════════════════════ */

interface WorkingHoursTabProps extends TabProps {
  field: 'workingHours' | 'ramadanHours';
  title: string;
  description: string;
}

function WorkingHoursTab({ branch, field, title, description, onSave }: WorkingHoursTabProps) {
  const { t } = useTranslation();
  const existing = branch[field];
  const [hours, setHours] = useState<WorkingHours[]>(
    existing?.length ? existing : defaultWorkingHours(),
  );

  const updateDay = useCallback((dayOfWeek: number, updates: Partial<WorkingHours>) => {
    setHours((prev) => prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...updates } : h)));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const res = await onSave.mutateAsync({ [field]: hours });
      toast.success(
        field === 'workingHours'
          ? t('branches.detail.toast.hoursSaved')
          : t('branches.detail.toast.ramadanSaved'),
      );
      // Show appointment conflict warnings if any
      const warnings = (res as { data?: { warnings?: string[] } })?.data?.warnings;
      if (warnings?.length) {
        for (const w of warnings) {
          toast.warning(w);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('branches.toast.updateFailed'));
    }
  }, [hours, field, onSave, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {hours
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((day) => (
              <div
                key={day.dayOfWeek}
                className={`flex items-center gap-4 rounded-lg border p-3 ${
                  day.isClosed ? 'bg-muted/50 opacity-60' : ''
                }`}
              >
                <div className="w-28 text-sm font-medium">{DAY_NAMES[day.dayOfWeek]}</div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!day.isClosed}
                    onCheckedChange={(open) => updateDay(day.dayOfWeek, { isClosed: !open })}
                  />
                  <span className="text-xs">
                    {day.isClosed
                      ? t('branches.detail.hours.closed')
                      : t('branches.detail.hours.open')}
                  </span>
                </div>
                {!day.isClosed && (
                  <>
                    <Input
                      type="time"
                      value={day.openTime}
                      onChange={(e) => updateDay(day.dayOfWeek, { openTime: e.target.value })}
                      className="w-[130px]"
                    />
                    <span className="text-muted-foreground text-sm">
                      {t('branches.detail.hours.to')}
                    </span>
                    <Input
                      type="time"
                      value={day.closeTime}
                      onChange={(e) => updateDay(day.dayOfWeek, { closeTime: e.target.value })}
                      className="w-[130px]"
                    />
                  </>
                )}
              </div>
            ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={onSave.isPending}>
            {onSave.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {field === 'workingHours'
              ? t('branches.detail.hours.saveBtn')
              : t('branches.detail.ramadan.saveBtn')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
   Holidays Tab
   ════════════════════════════════════════════════════════════ */

function HolidaysTab({ branch, onSave }: TabProps) {
  const { t } = useTranslation();
  const { isMultiLang } = useSupportedLanguages();
  const [holidays, setHolidays] = useState(branch.holidays ?? []);

  const addHoliday = useCallback(() => {
    setHolidays((prev) => [...prev, { date: '', name: { en: '' } }]);
  }, []);

  const removeHoliday = useCallback((idx: number) => {
    setHolidays((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateHoliday = useCallback(
    (idx: number, updates: Partial<{ date: string; nameEn: string; nameAr: string }>) => {
      setHolidays((prev) =>
        prev.map((h, i) => {
          if (i !== idx) return h;
          return {
            date: updates.date ?? h.date,
            name: {
              en: updates.nameEn ?? h.name.en,
              ar: updates.nameAr ?? h.name.ar,
            },
          };
        }),
      );
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const valid = holidays.filter((h) => h.date && h.name.en);
    try {
      const res = await onSave.mutateAsync({ holidays: valid });
      toast.success(t('branches.detail.toast.holidaysSaved'));
      const warnings = (res as { data?: { warnings?: string[] } })?.data?.warnings;
      if (warnings?.length) {
        for (const w of warnings) {
          toast.warning(w);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('branches.toast.updateFailed'));
    }
  }, [holidays, onSave, t]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Holidays</CardTitle>
            <CardDescription>
              {t('branches.detail.holidays.desc', { count: holidays.length })}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addHoliday}>
            <Plus className="me-2 h-4 w-4" /> {t('branches.detail.holidays.addBtn')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {holidays.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {t('branches.detail.holidays.empty')}
          </p>
        ) : (
          <div className="space-y-3">
            {holidays.map((holiday, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border p-3">
                <Input
                  type="date"
                  value={holiday.date}
                  onChange={(e) => updateHoliday(idx, { date: e.target.value })}
                  className="w-[180px]"
                />
                <Input
                  placeholder={t('branches.detail.holidays.namePlaceholder')}
                  value={holiday.name.en}
                  onChange={(e) => updateHoliday(idx, { nameEn: e.target.value })}
                  className="flex-1"
                />
                {isMultiLang && (
                  <Input
                    placeholder={t('branches.detail.holidays.nameArPlaceholder')}
                    value={holiday.name.ar ?? ''}
                    onChange={(e) => updateHoliday(idx, { nameAr: e.target.value })}
                    className="flex-1"
                    dir="rtl"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeHoliday(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={onSave.isPending}>
            {onSave.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {t('branches.detail.holidays.saveBtn')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════
   Slot Config Tab
   ════════════════════════════════════════════════════════════ */

function SlotConfigTab({ branch, onSave }: TabProps) {
  const { t } = useTranslation();
  const defaults: SlotConfig = branch.slotConfig ?? {
    defaultDuration: 30,
    minDuration: 15,
    maxDuration: 120,
    bufferBetween: 0,
    bookingLeadTime: 1,
    bookingWindowDays: 30,
  };
  const [config, setConfig] = useState<SlotConfig>(defaults);

  const handleSave = useCallback(async () => {
    try {
      await onSave.mutateAsync({ slotConfig: config } as Partial<Branch>);
      toast.success(t('branches.detail.toast.slotConfigSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('branches.toast.updateFailed'));
    }
  }, [config, onSave, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('branches.detail.slotConfig.title')}</CardTitle>
        <CardDescription>{t('branches.detail.slotConfig.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('branches.detail.slotConfig.defaultDuration')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={240}
                value={config.defaultDuration}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, defaultDuration: Number(e.target.value) }))
                }
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                {t('branches.detail.slotConfig.minutes')}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('branches.detail.slotConfig.minDuration')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={120}
                value={config.minDuration}
                onChange={(e) => setConfig((p) => ({ ...p, minDuration: Number(e.target.value) }))}
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                {t('branches.detail.slotConfig.minutes')}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('branches.detail.slotConfig.maxDuration')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={15}
                max={480}
                value={config.maxDuration}
                onChange={(e) => setConfig((p) => ({ ...p, maxDuration: Number(e.target.value) }))}
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                {t('branches.detail.slotConfig.minutes')}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('branches.detail.slotConfig.buffer')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={60}
                value={config.bufferBetween}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, bufferBetween: Number(e.target.value) }))
                }
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                {t('branches.detail.slotConfig.minutes')}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('branches.detail.slotConfig.leadTime')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={168}
                value={config.bookingLeadTime}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, bookingLeadTime: Number(e.target.value) }))
                }
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                {t('branches.detail.slotConfig.hours')}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('branches.detail.slotConfig.windowDays')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={config.bookingWindowDays}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, bookingWindowDays: Number(e.target.value) }))
                }
                className="w-24"
              />
              <span className="text-muted-foreground text-sm">
                {t('branches.detail.slotConfig.days')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={onSave.isPending}>
            {onSave.isPending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="me-2 h-4 w-4" />
            )}
            {t('branches.detail.slotConfig.saveBtn')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
