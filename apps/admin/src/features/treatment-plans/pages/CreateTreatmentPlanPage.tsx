/**
 * Full-page Treatment Plan Creator — with dental chart tooth selection per item.
 * Each treatment item: select teeth on odontogram + pick service.
 * Cost = service price × number of teeth for that item.
 */

import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Odontogram, type ToothDetail, type ToothConditionGroup } from 'react-odontogram';
import 'react-odontogram/style.css';
import { useThemeStore } from '@/stores/theme.store.js';
import { usePatientList } from '@/features/patients/hooks/usePatients.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useServiceList, type Service } from '@/features/services/hooks/useServices.js';
import { useCreateTreatmentPlan } from '../hooks/useTreatmentPlans.js';
import { useTenantCurrency, formatCurrency, useTenantTaxRate } from '@/lib/currency.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Textarea,
  SearchCombobox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
  toast,
} from '@dento/ui';
import { ArrowLeft, ClipboardList, Loader2, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Entry Color Palette ─────────────────────────────────────

const ENTRY_COLORS = [
  { fill: '#3b82f6', outline: '#2563eb', bg: 'bg-blue-500', text: 'text-white' },
  { fill: '#10b981', outline: '#059669', bg: 'bg-emerald-500', text: 'text-white' },
  { fill: '#f59e0b', outline: '#d97706', bg: 'bg-amber-500', text: 'text-white' },
  { fill: '#ef4444', outline: '#dc2626', bg: 'bg-red-500', text: 'text-white' },
  { fill: '#8b5cf6', outline: '#7c3aed', bg: 'bg-violet-500', text: 'text-white' },
  { fill: '#ec4899', outline: '#db2777', bg: 'bg-pink-500', text: 'text-white' },
  { fill: '#06b6d4', outline: '#0891b2', bg: 'bg-cyan-500', text: 'text-white' },
  { fill: '#f97316', outline: '#ea580c', bg: 'bg-orange-500', text: 'text-white' },
];

// ── Types ───────────────────────────────────────────────────

interface TreatmentEntry {
  id: string;
  teeth: string[];
  serviceId: string;
  serviceName: string;
  unitPrice: number;
}

// ── Component ───────────────────────────────────────────────

export default function CreateTreatmentPlanPage() {
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.isDark);
  const createMutation = useCreateTreatmentPlan();
  const currency = useTenantCurrency();
  const taxRate = useTenantTaxRate();
  const { t } = useTranslation();

  // ── Form state ──────────────────────────────────────────
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'none'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [validUntil, setValidUntil] = useState('');

  // ── Chart state ─────────────────────────────────────────
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [entries, setEntries] = useState<TreatmentEntry[]>([]);
  const [chartKey, setChartKey] = useState(0);

  // ── Data Fetching ───────────────────────────────────────
  const { data: patientData } = usePatientList({
    page: 1,
    limit: 100,
    sortBy: 'firstName.en',
    sortOrder: 'asc',
  });
  const { data: doctorData } = useDoctorList({ page: 1, limit: 100, isActive: true });
  const { data: serviceData } = useServiceList({ page: 1, limit: 100, isActive: true });

  // ── Options ─────────────────────────────────────────────
  const patientOptions = useMemo(
    () =>
      (patientData?.patients ?? []).map((p) => ({
        value: p._id,
        label: `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode,
        description: p.phone || p.email || p.patientCode,
      })),
    [patientData],
  );

  const doctorOptions = useMemo(
    () =>
      (doctorData?.items ?? []).map((d) => ({
        value: d._id,
        label: `${d.firstName} ${d.lastName}`.trim(),
        description: d.specialization,
      })),
    [doctorData],
  );

  const services = useMemo(() => (serviceData?.items ?? []) as Service[], [serviceData]);

  const serviceOptions = useMemo(
    () =>
      services.map((s) => ({
        value: s._id,
        label: s.name.en,
        description: s.code
          ? `${s.code} — ${formatCurrency(s.defaultPrice, currency)}`
          : formatCurrency(s.defaultPrice, currency),
      })),
    [services, currency],
  );

  // ── Per-entry tooth conditions (colored groups on chart) ──
  const teethConditions: ToothConditionGroup[] = useMemo(
    () =>
      entries.map((entry, idx) => {
        const color = ENTRY_COLORS[idx % ENTRY_COLORS.length];
        return {
          label: entry.serviceName || `Item ${idx + 1}`,
          teeth: entry.teeth.map((t) => `teeth-${t}`),
          fillColor: color.fill,
          outlineColor: color.outline,
        };
      }),
    [entries],
  );

  // ── Cost calculation ────────────────────────────────────
  const totalCost = useMemo(
    () => entries.reduce((sum, e) => sum + e.unitPrice * e.teeth.length, 0),
    [entries],
  );

  const discountAmount = useMemo(() => {
    if (discountType === 'none' || discountValue <= 0) return 0;
    if (discountType === 'percentage') return (totalCost * discountValue) / 100;
    return Math.min(discountValue, totalCost);
  }, [totalCost, discountType, discountValue]);

  const finalCost = totalCost - discountAmount;
  const estimatedTax = taxRate > 0 ? finalCost * (taxRate / 100) : 0;
  const estimatedTotal = finalCost + estimatedTax;

  // ── Chart handler ───────────────────────────────────────
  const handleToothChange = useCallback((selected: ToothDetail[]) => {
    queueMicrotask(() => {
      setSelectedTeeth(selected.map((t) => t.notations.fdi));
    });
  }, []);

  // ── Entry CRUD ──────────────────────────────────────────
  const addEntry = () => {
    if (selectedTeeth.length === 0) {
      toast.error(t('treatmentPlans.validation.selectTeeth'));
      return;
    }
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        teeth: [...selectedTeeth],
        serviceId: '',
        serviceName: '',
        unitPrice: 0,
      },
    ]);
    setSelectedTeeth([]);
    setChartKey((k) => k + 1);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntryService = (id: string, serviceId: string) => {
    const svc = services.find((s) => s._id === serviceId);
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              serviceId,
              serviceName: svc?.name.en ?? '',
              unitPrice: svc?.defaultPrice ?? 0,
            }
          : e,
      ),
    );
  };

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!patientId) {
      toast.error(t('treatmentPlans.validation.selectPatient'));
      return;
    }
    if (!doctorId) {
      toast.error(t('treatmentPlans.validation.selectDoctor'));
      return;
    }
    if (!title.trim()) {
      toast.error(t('treatmentPlans.validation.enterTitle'));
      return;
    }
    if (entries.length === 0) {
      toast.error(t('treatmentPlans.validation.addTreatmentItem'));
      return;
    }
    // Check all entries have a service selected
    const missing = entries.find((e) => !e.serviceId);
    if (missing) {
      toast.error(t('treatmentPlans.validation.serviceRequired'));
      return;
    }

    // Expand entries: one item per tooth
    let seq = 0;
    const items = entries.flatMap((entry) =>
      entry.teeth.map((tooth) => ({
        serviceId: entry.serviceId,
        procedureName: entry.serviceName,
        toothNumber: tooth,
        cost: entry.unitPrice,
        sequenceOrder: seq++,
        status: 'pending' as const,
        linkedXrays: [] as string[],
        linkedCbcts: [] as string[],
        requiredImaging: [] as never[],
        materials: [] as never[],
      })),
    );

    const payload = {
      patientId,
      doctorId,
      title: title.trim(),
      description: description.trim() || undefined,
      status: 'draft' as const,
      items,
      linkedXrays: [] as string[],
      linkedCbcts: [] as string[],
      totalCost,
      discountType: discountType !== 'none' ? discountType : undefined,
      discountValue,
      finalCost: Math.max(0, finalCost),
      validUntil: validUntil || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await createMutation.mutateAsync(payload as Record<string, unknown>);
      toast.success(t('treatmentPlans.toast.created'));
      navigate('/treatment-plans');
    } catch {
      toast.error(t('treatmentPlans.toast.createFailed'));
    }
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('treatmentPlans.create.title')}
        description={t('treatmentPlans.create.description')}
      >
        <Button variant="outline" size="sm" onClick={() => navigate('/treatment-plans')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('treatmentPlans.create.back')}
        </Button>
      </PageHeader>

      {/* ── Patient & Doctor ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('treatmentPlans.create.patientDoctor')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label={t('treatmentPlans.create.patient')} required>
              <SearchCombobox
                options={patientOptions}
                value={patientId}
                onValueChange={setPatientId}
                placeholder="Select patient…"
                searchPlaceholder="Search patients…"
                emptyMessage="No patients found."
              />
            </FormField>
            <FormField label={t('treatmentPlans.create.doctor')} required>
              <SearchCombobox
                options={doctorOptions}
                value={doctorId}
                onValueChange={setDoctorId}
                placeholder="Select doctor…"
                searchPlaceholder="Search doctors…"
                emptyMessage="No doctors found."
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* ── Title & Description ──────────────────────────── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <FormField label={t('treatmentPlans.create.titleField')} required>
            <Input
              placeholder="e.g. Full mouth rehabilitation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <FormField label={t('treatmentPlans.create.descriptionField')}>
            <Textarea
              placeholder="Plan description…"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* ── Chart + Items ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        {/* LEFT: Treatment Items */}
        <div className="space-y-4 min-w-0 order-2 xl:order-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t('treatmentPlans.create.treatmentItems')} ({entries.length})
          </h3>

          {entries.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardList className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p className="font-medium">{t('treatmentPlans.create.noItemsYet')}</p>
                <p className="text-sm mt-1">{t('treatmentPlans.create.selectTeethHint')}</p>
              </CardContent>
            </Card>
          )}

          {entries.map((entry, idx) => {
            const entryColor = ENTRY_COLORS[idx % ENTRY_COLORS.length];
            const itemTotal = entry.unitPrice * entry.teeth.length;
            return (
              <Card
                key={entry.id}
                style={{ borderLeftWidth: '4px', borderLeftColor: entryColor.fill }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <span
                        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${entryColor.bg} ${entryColor.text}`}
                      >
                        {idx + 1}
                      </span>
                      {t('treatmentPlans.create.teethLabel')}{' '}
                      {entry.teeth.map((t) => `#${t}`).join(', ')}
                      <Badge variant="outline" className="ms-2 text-xs">
                        {entry.teeth.length}{' '}
                        {entry.teeth.length === 1
                          ? t('treatmentPlans.create.toothSingular')
                          : t('treatmentPlans.create.toothPlural')}
                      </Badge>
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEntry(entry.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Service selection */}
                  <FormField label={t('treatmentPlans.create.serviceRequired')} required>
                    <SearchCombobox
                      options={serviceOptions}
                      value={entry.serviceId}
                      onValueChange={(val) => updateEntryService(entry.id, val)}
                      placeholder="Select service…"
                      searchPlaceholder="Search services…"
                      emptyMessage="No services found."
                    />
                  </FormField>

                  {/* Cost breakdown */}
                  {entry.serviceId && (
                    <div className="flex items-center gap-4 text-sm bg-muted/40 rounded-md p-3">
                      <div>
                        <span className="text-muted-foreground">
                          {t('treatmentPlans.create.unitPrice')}
                        </span>{' '}
                        <span className="font-medium">
                          {formatCurrency(entry.unitPrice, currency)}
                        </span>
                      </div>
                      <span className="text-muted-foreground">×</span>
                      <div>
                        <span className="text-muted-foreground">Teeth:</span>{' '}
                        <span className="font-medium">{entry.teeth.length}</span>
                      </div>
                      <span className="text-muted-foreground">=</span>
                      <div>
                        <span className="font-semibold text-base">
                          {formatCurrency(itemTotal, currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* RIGHT: Dental Chart */}
        <div className="order-1 xl:order-2 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('treatmentPlans.create.dentalChart')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <Odontogram
                key={chartKey}
                notation="FDI"
                theme={isDark ? 'dark' : 'light'}
                teethConditions={teethConditions}
                showLabels
                onChange={handleToothChange}
                styles={{ maxWidth: '260px', width: '100%' }}
              />

              {selectedTeeth.length > 0 && (
                <div className="text-center space-y-2 w-full">
                  <p className="text-sm text-muted-foreground">
                    {t('treatmentPlans.create.selected')}{' '}
                    {selectedTeeth.map((t) => `#${t}`).join(', ')}
                  </p>
                  <Button type="button" size="sm" className="w-full" onClick={addEntry}>
                    <Plus className="me-1.5 h-3.5 w-3.5" />
                    {t('treatmentPlans.create.addTreatmentItem')}
                  </Button>
                </div>
              )}

              {selectedTeeth.length === 0 && entries.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('treatmentPlans.create.clickTeethHint')}
                </p>
              )}

              {/* Legend */}
              {entries.length > 0 && (
                <div className="flex flex-wrap gap-1 w-full">
                  {entries.map((entry, idx) => {
                    const color = ENTRY_COLORS[idx % ENTRY_COLORS.length];
                    return (
                      <Badge
                        key={entry.id}
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: color.fill, color: color.fill }}
                      >
                        {entry.serviceName || `Item ${idx + 1}`} ({entry.teeth.length})
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Financial Summary ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('treatmentPlans.detail.financialSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField label={t('treatmentPlans.form.discountType')}>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed' | 'none')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No discount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('treatmentPlans.create.noDiscount')}</SelectItem>
                  <SelectItem value="percentage">
                    {t('treatmentPlans.create.percentageLabel')}
                  </SelectItem>
                  <SelectItem value="fixed">{t('treatmentPlans.create.fixedAmount')}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            {discountType !== 'none' && (
              <FormField
                label={
                  discountType === 'percentage'
                    ? t('treatmentPlans.create.discountPercent')
                    : t('treatmentPlans.create.discountAmount')
                }
              >
                <Input
                  type="number"
                  min={0}
                  max={discountType === 'percentage' ? 100 : undefined}
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                />
              </FormField>
            )}
            <FormField label={t('treatmentPlans.form.validUntil')}>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </FormField>
          </div>

          <Separator />

          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex items-center gap-8">
              <span className="text-muted-foreground">{t('treatmentPlans.create.subtotal')}</span>
              <span className="font-medium w-28 text-end">
                {formatCurrency(totalCost, currency)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center gap-8">
                <span className="text-muted-foreground">
                  {t('treatmentPlans.detail.discount')}
                  {discountType === 'percentage' ? ` (${discountValue}%)` : ''}
                </span>
                <span className="font-medium w-28 text-end text-green-600">
                  -{formatCurrency(discountAmount, currency)}
                </span>
              </div>
            )}
            {estimatedTax > 0 && (
              <div className="flex items-center gap-8">
                <span className="text-muted-foreground">
                  {t('treatmentPlans.detail.tax')} ({taxRate}%)
                </span>
                <span className="font-medium w-28 text-end">
                  {formatCurrency(estimatedTax, currency)}
                </span>
              </div>
            )}
            <Separator className="w-48" />
            <div className="flex items-center gap-8">
              <span className="font-semibold">{t('treatmentPlans.detail.estimatedTotal')}</span>
              <span className="font-bold text-lg w-28 text-end">
                {formatCurrency(Math.max(0, estimatedTotal), currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Notes ────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <FormField label={t('treatmentPlans.form.notes')}>
            <Textarea
              placeholder="Additional notes…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/treatment-plans')}>
          {t('treatmentPlans.create.cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          <ClipboardList className="me-2 h-4 w-4" />
          {t('treatmentPlans.create.createButton')}
        </Button>
      </div>
    </div>
  );
}
