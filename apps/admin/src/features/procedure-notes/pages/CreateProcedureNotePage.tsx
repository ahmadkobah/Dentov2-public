/**
 * Full-page Procedure Note Creator — with dental chart, multi-tooth multi-service entries.
 * Replaces the small dialog for creating new procedure notes.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { createProcedureNoteSchema, type CreateProcedureNoteInput } from '@dento/shared';
import {
  Button,
  Checkbox,
  FormField,
  Input,
  Textarea,
  Switch,
  Label,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SearchCombobox,
  MultiSelectCombobox,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  toast,
  PageHeader,
} from '@dento/ui';
import { ArrowLeft, FileText, Loader2, Plus, Search, Trash2, X, Check } from 'lucide-react';
import { Odontogram, type ToothDetail, type ToothConditionGroup } from 'react-odontogram';
import 'react-odontogram/style.css';
import { useThemeStore } from '@/stores/theme.store.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { usePatientList } from '@/features/patients/hooks/usePatients.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useServiceList, type Service } from '@/features/services/hooks/useServices.js';
import { useInventoryItemList } from '@/features/inventory/hooks/useInventoryItems.js';
import { useCreateProcedureNote } from '../hooks/useProcedureNotes.js';
import { useCreateInvoice, type Invoice } from '../../invoices/hooks/useInvoices.js';
import { useActiveBranches } from '../../branches/hooks/useBranches.js';
import { useTenantCurrency, formatCurrency, getDefaultTaxRate } from '@/lib/currency.js';
import { useUpsertChartEntry } from '@/features/dental-charts/hooks/useDentalCharts.js';
import { formatDate } from '@/lib/date.js';

// ── Entry Color Palette ─────────────────────────────────────

const ENTRY_COLORS = [
  { fill: '#3b82f6', outline: '#2563eb', bg: 'bg-blue-500', text: 'text-white' }, // blue
  { fill: '#10b981', outline: '#059669', bg: 'bg-emerald-500', text: 'text-white' }, // green
  { fill: '#f59e0b', outline: '#d97706', bg: 'bg-amber-500', text: 'text-white' }, // amber
  { fill: '#ef4444', outline: '#dc2626', bg: 'bg-red-500', text: 'text-white' }, // red
  { fill: '#8b5cf6', outline: '#7c3aed', bg: 'bg-violet-500', text: 'text-white' }, // violet
  { fill: '#ec4899', outline: '#db2777', bg: 'bg-pink-500', text: 'text-white' }, // pink
  { fill: '#06b6d4', outline: '#0891b2', bg: 'bg-cyan-500', text: 'text-white' }, // cyan
  { fill: '#f97316', outline: '#ea580c', bg: 'bg-orange-500', text: 'text-white' }, // orange
];

// ── Types ───────────────────────────────────────────────────

interface ProcedureEntry {
  id: string;
  teeth: string[];
  serviceIds: string[];
  serviceNames: string[];
  materials: string[];
  anesthesiaUsed: boolean;
  procedurePerformed: string;
}

// ── Component ───────────────────────────────────────────────

export default function CreateProcedureNotePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark = useThemeStore((s) => s.isDark);
  const { t } = useTranslation();
  const createMutation = useCreateProcedureNote();
  const createInvoiceMutation = useCreateInvoice();
  const upsertChartMutation = useUpsertChartEntry();

  const { data: activeBranches } = useActiveBranches();
  const currency = useTenantCurrency();

  // ── Prefill from URL query params (e.g. opened from a Treatment Plan item) ──
  const prefill = useMemo(
    () => ({
      patientId: searchParams.get('patientId') ?? undefined,
      doctorId: searchParams.get('doctorId') ?? undefined,
      treatmentPlanId: searchParams.get('treatmentPlanId') ?? undefined,
      treatmentPlanItemId: searchParams.get('treatmentPlanItemId') ?? undefined,
      serviceId: searchParams.get('serviceId') ?? undefined,
      toothNumber: searchParams.get('toothNumber') ?? undefined,
      procedureName: searchParams.get('procedureName') ?? undefined,
      plannedCost: searchParams.get('plannedCost')
        ? Number(searchParams.get('plannedCost'))
        : undefined,
    }),
    [searchParams],
  );

  // ── Chart state ─────────────────────────────────────────
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [entries, setEntries] = useState<ProcedureEntry[]>([]);
  const [materialSearch, setMaterialSearch] = useState<Record<string, string>>({});
  const [chartKey, setChartKey] = useState(0);

  // ── Chart condition update confirmation ────────────────
  interface ChartUpdateProposal {
    toothNumber: number;
    condition: string;
    serviceName: string;
  }
  const [chartUpdateProposals, setChartUpdateProposals] = useState<ChartUpdateProposal[]>([]);
  const [showChartUpdateDialog, setShowChartUpdateDialog] = useState(false);
  const [chartUpdatePatientId, setChartUpdatePatientId] = useState<string>('');
  const [chartUpdateChecked, setChartUpdateChecked] = useState<Record<number, boolean>>({});

  // ── Form (for patient, doctor, general fields) ──────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProcedureNoteInput>({
    resolver: zodFormResolver(createProcedureNoteSchema),
    defaultValues: {
      status: 'draft',
      followUpRequired: false,
      linkedXrays: [],
      linkedCbcts: [],
      preOpXrays: [],
      postOpXrays: [],
      attachments: [],
      procedureName: prefill.procedureName ?? '',
      teethInvolved: prefill.toothNumber ?? '',
      materialsUsed: '',
      anesthesiaUsed: '',
      patientId: prefill.patientId,
      doctorId: prefill.doctorId,
      treatmentPlanId: prefill.treatmentPlanId,
      treatmentPlanItemId: prefill.treatmentPlanItemId,
      serviceId: prefill.serviceId,
    },
  });

  // ── Data Fetching ───────────────────────────────────────
  const { data: patientData } = usePatientList({
    page: 1,
    limit: 100,
    sortBy: 'firstName.en',
    sortOrder: 'asc',
  });
  const { data: doctorData } = useDoctorList({ page: 1, limit: 100, isActive: true });
  const { data: serviceData } = useServiceList({ page: 1, limit: 100, isActive: true });
  const { data: inventoryData } = useInventoryItemList({ page: 1, limit: 100, isActive: 'true' });

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

  const serviceOptions = useMemo(
    () =>
      ((serviceData?.items ?? []) as Service[]).map((s) => ({
        value: s._id,
        label: s.name.en,
        description: s.code ? `${s.code} — ${s.defaultDuration}min` : `${s.defaultDuration}min`,
      })),
    [serviceData],
  );

  const inventoryOptions = useMemo(
    () =>
      (inventoryData?.items ?? []).map((item) => ({
        value: item.name.en,
        label: item.name.en,
        description: `${item.sku} — ${item.unitOfMeasure}`,
      })),
    [inventoryData],
  );

  const followUpRequired = watch('followUpRequired');

  // ── Keep form fields synced with entries so Zod validation passes ──
  useEffect(() => {
    const allServices = [...new Set(entries.flatMap((e) => e.serviceNames))].filter(Boolean);
    const allTeeth = [...new Set(entries.flatMap((e) => e.teeth))];
    const allMaterials = [...new Set(entries.flatMap((e) => e.materials))];
    const anyAnesthesia = entries.some((e) => e.anesthesiaUsed);

    setValue('procedureName', allServices.join(', ') || 'Procedure', { shouldValidate: false });
    setValue('teethInvolved', allTeeth.join(', '), { shouldValidate: false });
    setValue('materialsUsed', allMaterials.join(', ') || undefined, { shouldValidate: false });
    setValue('anesthesiaUsed', anyAnesthesia ? 'Yes' : 'No', { shouldValidate: false });
    if (entries[0]?.serviceIds[0]) {
      setValue('serviceId', entries[0].serviceIds[0], { shouldValidate: false });
    }
  }, [entries, setValue]);

  // ── Auto-seed first entry when opened from a treatment plan item ──
  const [seededFromPrefill, setSeededFromPrefill] = useState(false);
  useEffect(() => {
    if (
      seededFromPrefill ||
      !prefill.treatmentPlanItemId ||
      !prefill.serviceId ||
      !prefill.toothNumber ||
      !serviceData
    ) {
      return;
    }
    const svc = ((serviceData?.items ?? []) as Service[]).find((s) => s._id === prefill.serviceId);
    if (!svc) return;
    setEntries([
      {
        id: crypto.randomUUID(),
        teeth: [prefill.toothNumber],
        serviceIds: [svc._id],
        serviceNames: [svc.name.en],
        materials: [],
        anesthesiaUsed: false,
        procedurePerformed: '',
      },
    ]);
    setSeededFromPrefill(true);
  }, [prefill, serviceData, seededFromPrefill]);

  // ── Cost calculation ────────────────────────────────────
  const services = useMemo(() => (serviceData?.items ?? []) as Service[], [serviceData]);

  const entryCosts = useMemo(
    () =>
      entries.map((entry) => {
        let entryTotal = 0;
        for (const svcId of entry.serviceIds) {
          const svc = services.find((s) => s._id === svcId);
          if (svc?.defaultPrice) {
            entryTotal += svc.defaultPrice * entry.teeth.length;
          }
        }
        return entryTotal;
      }),
    [entries, services],
  );

  const totalCost = useMemo(() => entryCosts.reduce((sum, c) => sum + c, 0), [entryCosts]);

  // ── Per-entry tooth conditions (colored groups on chart) ──
  const teethConditions: ToothConditionGroup[] = useMemo(
    () =>
      entries.map((entry, idx) => {
        const color = ENTRY_COLORS[idx % ENTRY_COLORS.length];
        return {
          label: `Entry ${idx + 1}`,
          teeth: entry.teeth.map((t) => `teeth-${t}`),
          fillColor: color.fill,
          outlineColor: color.outline,
        };
      }),
    [entries],
  );

  const chartHighlightTeeth = useMemo(() => {
    // Only pass currently-selected teeth (not entry teeth — those are shown via teethConditions)
    return [...selectedTeeth];
  }, [selectedTeeth]);

  // ── Chart handler ───────────────────────────────────────
  const handleToothChange = useCallback((selected: ToothDetail[]) => {
    queueMicrotask(() => {
      setSelectedTeeth(selected.map((t) => t.notations.fdi));
    });
  }, []);

  // ── Entry CRUD ──────────────────────────────────────────
  const addEntry = () => {
    if (selectedTeeth.length === 0) {
      toast.error(t('procedureNotes.toast.selectTooth'));
      return;
    }
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        teeth: [...selectedTeeth],
        serviceIds: [],
        serviceNames: [],
        materials: [],
        anesthesiaUsed: false,
        procedurePerformed: '',
      },
    ]);
    // Reset selected teeth and force chart remount so toggled teeth clear
    setSelectedTeeth([]);
    setChartKey((k) => k + 1);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, updates: Partial<ProcedureEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const toggleMaterialInEntry = (id: string, material: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const has = e.materials.includes(material);
        return {
          ...e,
          materials: has ? e.materials.filter((m) => m !== material) : [...e.materials, material],
        };
      }),
    );
  };

  // ── Submit ──────────────────────────────────────────────
  const onSubmit = async (formData: CreateProcedureNoteInput) => {
    if (entries.length === 0) {
      toast.error(t('procedureNotes.toast.addEntry'));
      return;
    }

    // Aggregate entries into the flat schema fields
    const allTeeth = [...new Set(entries.flatMap((e) => e.teeth))];
    const allServices = [...new Set(entries.flatMap((e) => e.serviceNames))].filter(Boolean);
    const allMaterials = [...new Set(entries.flatMap((e) => e.materials))];
    const anyAnesthesia = entries.some((e) => e.anesthesiaUsed);
    const allProcedureDetails = entries
      .map((e) => {
        const teethStr = e.teeth.map((t) => `#${t}`).join(', ');
        const lines = [`[${teethStr}] ${e.serviceNames.join(', ')}`];
        if (e.procedurePerformed) lines.push(e.procedurePerformed);
        return lines.join(': ');
      })
      .join('\n');

    const payload: CreateProcedureNoteInput = {
      ...formData,
      procedureName: allServices.join(', ') || 'Multiple procedures',
      serviceId: entries[0]?.serviceIds[0] || undefined,
      teethInvolved: allTeeth.join(', '),
      materialsUsed: allMaterials.join(', ') || undefined,
      anesthesiaUsed: anyAnesthesia ? 'Yes' : 'No',
      procedurePerformed: allProcedureDetails || formData.procedurePerformed || undefined,
      // Store detailed entry data for future use
      teethDetails: {
        entries: entries.map((e) => {
          let unitPrice = 0;
          for (const svcId of e.serviceIds) {
            const svc = (serviceData?.items ?? ([] as Service[])).find(
              (s: Service) => s._id === svcId,
            );
            if (svc?.defaultPrice) unitPrice += svc.defaultPrice;
          }
          return {
            teeth: e.teeth,
            serviceId: e.serviceIds[0],
            serviceName: e.serviceNames.join(', '),
            materials: e.materials,
            anesthesiaUsed: e.anesthesiaUsed,
            procedurePerformed: e.procedurePerformed,
            unitPrice,
          };
        }),
      },
    };

    try {
      await createMutation.mutateAsync(payload as Record<string, unknown>);
      toast.success(t('procedureNotes.toast.noteCreated'));

      // Auto-create invoice if there's a cost
      if (totalCost > 0) {
        const branchId = activeBranches?.[0]?._id;
        if (branchId) {
          try {
            const invoiceItems = entries.flatMap((entry) => {
              const svcList = (serviceData?.items ?? []) as Service[];
              return entry.serviceIds.map((svcId) => {
                const svc = svcList.find((s) => s._id === svcId);
                return {
                  description: `${svc?.name.en ?? entry.serviceNames[0] ?? 'Procedure'} — teeth: ${entry.teeth.map((t) => `#${t}`).join(', ')}`,
                  serviceId: svcId,
                  quantity: entry.teeth.length,
                  unitPrice: svc?.defaultPrice ?? 0,
                  discount: 0,
                  total: (svc?.defaultPrice ?? 0) * entry.teeth.length,
                };
              });
            });

            const taxPct = getDefaultTaxRate();
            const taxAmt = totalCost * (taxPct / 100);
            const totalWithTax = totalCost + taxAmt;

            await createInvoiceMutation.mutateAsync({
              patientId: formData.patientId,
              branchId,
              currency,
              items: invoiceItems,
              subtotal: totalCost,
              discountAmount: 0,
              discountPercentage: 0,
              taxAmount: taxAmt,
              taxPercentage: taxPct,
              totalAmount: totalWithTax,
              insuredAmount: 0,
              patientResponsibility: totalWithTax,
              notes: `Auto-created from procedure note: ${allServices.join(', ')}`,
            } as Partial<Invoice>);
            toast.success(t('procedureNotes.toast.invoiceCreated'));
          } catch {
            toast.error(t('procedureNotes.toast.invoiceFailed'));
          }
        }
      }

      if (formData.followUpRequired && formData.followUpDate) {
        const patient = patientData?.patients?.find((p) => p._id === formData.patientId);
        const name = patient
          ? `${patient.firstName?.en ?? ''} ${patient.lastName?.en ?? ''}`.trim()
          : 'the patient';
        const dateStr = formatDate(formData.followUpDate);
        toast.info(
          t('procedureNotes.followUpReminder')
            .replace('{{date}}', dateStr)
            .replace('{{name}}', name),
          {
            duration: 10000,
          },
        );
      }

      // Check if any services have chartCondition mappings
      const services = (serviceData?.items ?? []) as Service[];
      const proposals: ChartUpdateProposal[] = [];
      for (const entry of entries) {
        for (const serviceId of entry.serviceIds) {
          const svc = services.find((s) => s._id === serviceId);
          if (svc?.chartCondition) {
            for (const tooth of entry.teeth) {
              const toothNum = parseInt(tooth, 10);
              if (!isNaN(toothNum)) {
                // Avoid duplicate proposals for the same tooth
                if (!proposals.some((p) => p.toothNumber === toothNum)) {
                  proposals.push({
                    toothNumber: toothNum,
                    condition: svc.chartCondition,
                    serviceName: svc.name.en,
                  });
                }
              }
            }
          }
        }
      }

      if (proposals.length > 0) {
        // Show confirmation dialog instead of navigating
        setChartUpdateProposals(proposals);
        setChartUpdatePatientId(formData.patientId);
        setChartUpdateChecked(Object.fromEntries(proposals.map((p) => [p.toothNumber, true])));
        setShowChartUpdateDialog(true);
      } else {
        navigate('/procedure-notes');
      }
    } catch {
      toast.error(t('procedureNotes.toast.noteCreateFailed'));
    }
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('procedureNotes.create.title')}
        description={t('procedureNotes.create.subtitle')}
      >
        <Button variant="outline" size="sm" onClick={() => navigate('/procedure-notes')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('procedureNotes.back')}
        </Button>
      </PageHeader>

      {prefill.treatmentPlanItemId && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-medium">{t('procedureNotes.create.fromPlan')}</span>
              {prefill.procedureName && <Badge variant="outline">{prefill.procedureName}</Badge>}
              {prefill.toothNumber && <Badge variant="outline">#{prefill.toothNumber}</Badge>}
            </div>
            {typeof prefill.plannedCost === 'number' && (
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {t('procedureNotes.create.plannedCost')}:
                </span>{' '}
                <span className="font-semibold">
                  {formatCurrency(prefill.plannedCost, currency)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Top Row: Patient & Doctor ─────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('procedureNotes.form.patientDoctor')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label={t('procedureNotes.form.patient')}
                error={errors.patientId?.message}
                required
              >
                <Controller
                  control={control}
                  name="patientId"
                  render={({ field }) => (
                    <SearchCombobox
                      options={patientOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('procedureNotes.form.selectPatient')}
                      searchPlaceholder={t('procedureNotes.form.searchPatients')}
                      emptyMessage={t('procedureNotes.form.noPatients')}
                    />
                  )}
                />
              </FormField>
              <FormField
                label={t('procedureNotes.form.doctor')}
                error={errors.doctorId?.message}
                required
              >
                <Controller
                  control={control}
                  name="doctorId"
                  render={({ field }) => (
                    <SearchCombobox
                      options={doctorOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('procedureNotes.form.selectDoctor')}
                      searchPlaceholder={t('procedureNotes.form.searchDoctors')}
                      emptyMessage={t('procedureNotes.form.noDoctors')}
                    />
                  )}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* ── Chart (right) + Procedure Entries (left) ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
          {/* ── LEFT: Procedure Entries ─────────────────── */}
          <div className="space-y-4 min-w-0 order-2 xl:order-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('procedureNotes.create.procedureEntries').replace(
                '{{count}}',
                String(entries.length),
              )}
            </h3>

            {entries.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="mx-auto h-10 w-10 mb-3 opacity-40" />
                  <p className="font-medium">{t('procedureNotes.create.noEntries')}</p>
                  <p className="text-sm mt-1">{t('procedureNotes.create.noEntriesDesc')}</p>
                </CardContent>
              </Card>
            )}

            {entries.map((entry, idx) => {
              const entryColor = ENTRY_COLORS[idx % ENTRY_COLORS.length];
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
                        Teeth: {entry.teeth.map((t) => `#${t}`).join(', ')}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry(entry.id)}
                        aria-label={t('procedureNotes.create.removeEntry')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Service selection — multi-select with checkboxes */}
                    <FormField label={t('procedureNotes.form.serviceProcedure')} required>
                      <MultiSelectCombobox
                        options={serviceOptions}
                        values={entry.serviceIds}
                        onValuesChange={(vals) => {
                          const names = vals.map((id) => {
                            const svc = ((serviceData?.items ?? []) as Service[]).find(
                              (s) => s._id === id,
                            );
                            return svc?.name.en ?? id;
                          });
                          updateEntry(entry.id, {
                            serviceIds: vals,
                            serviceNames: names,
                          });
                        }}
                        placeholder={t('procedureNotes.form.selectServices')}
                        searchPlaceholder={t('procedureNotes.form.searchServices')}
                        emptyMessage={t('procedureNotes.form.noServices')}
                      />
                    </FormField>

                    {/* Materials — searchable checkbox list */}
                    <FormField label={t('procedureNotes.form.materialsUsed')}>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute start-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder={t('procedureNotes.form.searchMaterials')}
                            className="ps-7 h-8 text-xs"
                            value={materialSearch[entry.id] ?? ''}
                            onChange={(e) =>
                              setMaterialSearch((prev) => ({ ...prev, [entry.id]: e.target.value }))
                            }
                          />
                        </div>
                        <div className="max-h-32 overflow-y-auto border rounded-md divide-y">
                          {inventoryOptions
                            .filter((o) =>
                              !materialSearch[entry.id]
                                ? true
                                : o.label
                                    .toLowerCase()
                                    .includes(materialSearch[entry.id].toLowerCase()),
                            )
                            .map((o) => (
                              <label
                                key={o.value}
                                className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={entry.materials.includes(o.value)}
                                  onCheckedChange={() => toggleMaterialInEntry(entry.id, o.value)}
                                />
                                <span className="truncate">{o.label}</span>
                              </label>
                            ))}
                        </div>
                        {entry.materials.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {entry.materials.map((m) => (
                              <Badge key={m} variant="secondary" className="gap-1 text-xs">
                                {m}
                                <button
                                  type="button"
                                  onClick={() => toggleMaterialInEntry(entry.id, m)}
                                  className="ms-1 rounded-full hover:bg-muted"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormField>

                    {/* Anesthesia Used — simple checkbox */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`anesthesia-${entry.id}`}
                        checked={entry.anesthesiaUsed}
                        onCheckedChange={(checked) =>
                          updateEntry(entry.id, { anesthesiaUsed: !!checked })
                        }
                      />
                      <Label htmlFor={`anesthesia-${entry.id}`} className="text-sm cursor-pointer">
                        {t('procedureNotes.entry.anesthesiaUsed')}
                      </Label>
                    </div>

                    {/* Procedure details for this entry */}
                    <FormField label={t('procedureNotes.entry.details')}>
                      <Textarea
                        placeholder={t('procedureNotes.form.procedureDetailsPlaceholder')}
                        rows={2}
                        value={entry.procedurePerformed}
                        onChange={(e) =>
                          updateEntry(entry.id, { procedurePerformed: e.target.value })
                        }
                      />
                    </FormField>

                    {/* Cost breakdown */}
                    {entry.serviceIds.length > 0 && entryCosts[idx] > 0 && (
                      <div className="flex items-center gap-4 text-sm bg-muted/40 rounded-md p-3">
                        <div>
                          <span className="text-muted-foreground">Services cost:</span>{' '}
                          <span className="font-medium">
                            {formatCurrency(
                              entry.serviceIds.reduce((sum, svcId) => {
                                const svc = services.find((s) => s._id === svcId);
                                return sum + (svc?.defaultPrice ?? 0);
                              }, 0),
                              currency,
                            )}
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
                            {formatCurrency(entryCosts[idx], currency)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── RIGHT: Dental Chart (sticky, compact) ──── */}
          <div className="self-start w-full order-1 xl:order-2 xl:sticky xl:top-6 xl:w-[300px]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('procedureNotes.create.selectTeeth')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-x-auto flex justify-center">
                  <Odontogram
                    key={chartKey}
                    notation="FDI"
                    theme={isDark ? 'dark' : 'light'}
                    showLabels
                    onChange={handleToothChange}
                    defaultSelected={chartHighlightTeeth}
                    teethConditions={teethConditions}
                    styles={{ maxWidth: '280px', width: '100%' }}
                  />
                </div>

                {selectedTeeth.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('procedureNotes.create.selected')}
                    </span>
                    {selectedTeeth.map((t) => (
                      <Badge key={t} variant="default" className="text-xs px-1.5 py-0">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Color legend */}
                {entries.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('procedureNotes.create.legend')}
                    </span>
                    {entries.map((entry, idx) => {
                      const color = ENTRY_COLORS[idx % ENTRY_COLORS.length];
                      return (
                        <div key={entry.id} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color.fill }}
                          />
                          <span className="text-muted-foreground truncate">
                            Entry {idx + 1}{' '}
                            <span className="opacity-70">
                              ({entry.teeth.map((t) => `#${t}`).join(', ')})
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEntry}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t('procedureNotes.create.addProcedure')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* ── Cost Summary ─────────────────────────────── */}
        {totalCost > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('procedureNotes.create.costSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-end gap-1 text-sm">
                {entries.map((entry, idx) =>
                  entryCosts[idx] > 0 ? (
                    <div key={entry.id} className="flex items-center gap-8">
                      <span className="text-muted-foreground">
                        {entry.serviceNames.join(', ') || `Entry ${idx + 1}`} ({entry.teeth.length}{' '}
                        {entry.teeth.length === 1 ? 'tooth' : 'teeth'})
                      </span>
                      <span className="font-medium w-28 text-end">
                        {formatCurrency(entryCosts[idx], currency)}
                      </span>
                    </div>
                  ) : null,
                )}
                <Separator className="w-48" />
                <div className="flex items-center gap-8">
                  <span className="font-semibold">{t('procedureNotes.create.total')}</span>
                  <span className="font-bold text-lg w-28 text-end">
                    {formatCurrency(totalCost, currency)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('procedureNotes.create.invoiceNote')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Additional Details ────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('procedureNotes.create.additionalDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label={t('procedureNotes.form.complications')}
              error={errors.complications?.message}
            >
              <Textarea
                placeholder={t('procedureNotes.form.complicationsPlaceholder')}
                rows={2}
                {...register('complications')}
              />
            </FormField>

            <FormField
              label={t('procedureNotes.form.postOpInstructions')}
              error={errors.postOpInstructions?.message}
            >
              <Textarea
                placeholder={t('procedureNotes.form.postOpPlaceholder')}
                rows={2}
                {...register('postOpInstructions')}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="followUpRequired"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} id="followUp" />
                  )}
                />
                <Label htmlFor="followUp">{t('procedureNotes.form.followUpRequired')}</Label>
              </div>
              {followUpRequired && (
                <FormField
                  label={t('procedureNotes.form.followUpDate')}
                  error={errors.followUpDate?.message}
                >
                  <Input type="date" {...register('followUpDate')} />
                </FormField>
              )}
            </div>

            <FormField label={t('procedureNotes.form.notes')} error={errors.notes?.message}>
              <Textarea
                placeholder={t('procedureNotes.form.notesPlaceholder')}
                rows={2}
                {...register('notes')}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Submit ───────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/procedure-notes')}>
            {t('procedureNotes.create.cancel')}
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('procedureNotes.create.submit')}
          </Button>
        </div>
      </form>

      {/* ── Chart Condition Update Confirmation Dialog ── */}
      <Dialog open={showChartUpdateDialog} onOpenChange={setShowChartUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('procedureNotes.chartUpdate.title')}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('procedureNotes.chartUpdate.description')}
          </p>
          <div className="space-y-2 py-2">
            {chartUpdateProposals.map((proposal) => (
              <label
                key={proposal.toothNumber}
                className="flex items-center gap-3 p-2 rounded-md border cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={chartUpdateChecked[proposal.toothNumber] ?? true}
                  onCheckedChange={(checked) =>
                    setChartUpdateChecked((prev) => ({
                      ...prev,
                      [proposal.toothNumber]: !!checked,
                    }))
                  }
                />
                <div className="flex-1">
                  <span className="font-medium">Tooth #{proposal.toothNumber}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <Badge variant="outline" className="capitalize">
                    {proposal.condition.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{proposal.serviceName}</span>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowChartUpdateDialog(false);
                navigate('/procedure-notes');
              }}
            >
              {t('procedureNotes.chartUpdate.skip')}
            </Button>
            <Button
              onClick={async () => {
                const selected = chartUpdateProposals.filter(
                  (p) => chartUpdateChecked[p.toothNumber],
                );
                if (selected.length > 0) {
                  try {
                    await Promise.all(
                      selected.map((p) =>
                        upsertChartMutation.mutateAsync({
                          patientId: chartUpdatePatientId,
                          toothNumber: p.toothNumber,
                          condition: p.condition,
                        }),
                      ),
                    );
                    // Backend ProcedureNoteService.create() already fires an
                    // auto-snapshot (trigger: 'procedure_note'). No need to
                    // create a second one from the frontend.
                    toast.success(
                      t('procedureNotes.chartUpdate.updated').replace(
                        '{{count}}',
                        String(selected.length),
                      ),
                    );
                  } catch {
                    toast.error(t('procedureNotes.chartUpdate.failed'));
                  }
                }
                setShowChartUpdateDialog(false);
                navigate('/procedure-notes');
              }}
              disabled={upsertChartMutation.isPending}
            >
              {upsertChartMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              <Check className="me-2 h-4 w-4" />
              {t('procedureNotes.chartUpdate.applySelected')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
