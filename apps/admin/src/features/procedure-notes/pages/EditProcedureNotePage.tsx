/**
 * Full-page Procedure Note Editor — mirrors CreateProcedureNotePage but loads existing data.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  toast,
  PageHeader,
} from '@dento/ui';
import { ArrowLeft, FileText, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { Odontogram, type ToothDetail, type ToothConditionGroup } from 'react-odontogram';
import 'react-odontogram/style.css';
import { useThemeStore } from '@/stores/theme.store.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { usePatientList } from '@/features/patients/hooks/usePatients.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useServiceList, type Service } from '@/features/services/hooks/useServices.js';
import { useInventoryItemList } from '@/features/inventory/hooks/useInventoryItems.js';
import { useProcedureNoteDetail, useUpdateProcedureNote } from '../hooks/useProcedureNotes.js';

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

export default function EditProcedureNotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.isDark);
  const { t } = useTranslation();
  const updateMutation = useUpdateProcedureNote();

  const { data: note, isLoading: noteLoading } = useProcedureNoteDetail(id);

  // ── Chart state ─────────────────────────────────────────
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [entries, setEntries] = useState<ProcedureEntry[]>([]);
  const [materialSearch, setMaterialSearch] = useState<Record<string, string>>({});
  const [chartKey, setChartKey] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // ── Form ────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
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
      procedureName: '',
      teethInvolved: '',
      materialsUsed: '',
      anesthesiaUsed: '',
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

  // ── Initialize form + entries from loaded note ──────────
  useEffect(() => {
    if (!note || initialized) return;

    reset({
      patientId: note.patientId,
      doctorId: note.doctorId,
      status:
        ((note as unknown as Record<string, unknown>).status as 'draft' | 'completed') ?? 'draft',
      followUpRequired: note.followUpRequired,
      followUpDate: note.followUpDate,
      complications: note.complications,
      postOpInstructions: note.postOpInstructions,
      notes: note.notes,
      procedureName: note.procedureName,
      teethInvolved: note.teethInvolved,
      materialsUsed: note.materialsUsed,
      anesthesiaUsed: note.anesthesiaUsed,
      linkedXrays: note.linkedXrays ?? [],
      linkedCbcts: note.linkedCbcts ?? [],
      preOpXrays: note.preOpXrays ?? [],
      postOpXrays: note.postOpXrays ?? [],
      attachments: note.attachments ?? [],
    });

    // Restore entries from teethDetails if available, otherwise create a single entry
    const teethDetails = note.teethDetails as {
      entries?: {
        teeth: string[];
        serviceId?: string;
        serviceName?: string;
        materials: string[];
        anesthesiaUsed: boolean;
        procedurePerformed?: string;
      }[];
    } | null;

    if (teethDetails?.entries?.length) {
      setEntries(
        teethDetails.entries.map((e) => ({
          id: crypto.randomUUID(),
          teeth: e.teeth ?? [],
          serviceIds: e.serviceId ? [e.serviceId] : [],
          serviceNames: e.serviceName ? [e.serviceName] : [],
          materials: e.materials ?? [],
          anesthesiaUsed: e.anesthesiaUsed ?? false,
          procedurePerformed: e.procedurePerformed ?? '',
        })),
      );
    } else if (note.teethInvolved) {
      // Fallback: create a single entry from the flat fields
      const teeth = note.teethInvolved
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      setEntries([
        {
          id: crypto.randomUUID(),
          teeth,
          serviceIds: [],
          serviceNames: note.procedureName ? [note.procedureName] : [],
          materials: note.materialsUsed
            ? note.materialsUsed
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          anesthesiaUsed: note.anesthesiaUsed === 'Yes',
          procedurePerformed: note.procedurePerformed ?? '',
        },
      ]);
    }

    setInitialized(true);
    setChartKey((k) => k + 1);
  }, [note, initialized, reset]);

  // ── Keep form fields synced with entries so Zod validation passes ──
  useEffect(() => {
    if (!initialized) return;
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
  }, [entries, setValue, initialized]);

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

  const chartHighlightTeeth = useMemo(() => [...selectedTeeth], [selectedTeeth]);

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
    setSelectedTeeth([]);
    setChartKey((k) => k + 1);
  };

  const removeEntry = (entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  const updateEntry = (entryId: string, updates: Partial<ProcedureEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...updates } : e)));
  };

  const toggleMaterialInEntry = (entryId: string, material: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
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
    if (!id) return;
    if (entries.length === 0) {
      toast.error(t('procedureNotes.toast.addEntry'));
      return;
    }

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { patientId, doctorId, ...updateFields } = formData;
    const payload = {
      ...updateFields,
      procedureName: allServices.join(', ') || 'Multiple procedures',
      serviceId: entries[0]?.serviceIds[0] || undefined,
      teethInvolved: allTeeth.join(', '),
      materialsUsed: allMaterials.join(', ') || undefined,
      anesthesiaUsed: anyAnesthesia ? 'Yes' : 'No',
      procedurePerformed: allProcedureDetails || formData.procedurePerformed || undefined,
      teethDetails: {
        entries: entries.map((e) => ({
          teeth: e.teeth,
          serviceId: e.serviceIds[0],
          serviceName: e.serviceNames.join(', '),
          materials: e.materials,
          anesthesiaUsed: e.anesthesiaUsed,
          procedurePerformed: e.procedurePerformed,
        })),
      },
    };

    try {
      await updateMutation.mutateAsync({ id, data: payload as Record<string, unknown> });
      toast.success(t('procedureNotes.toast.noteUpdated'));
      navigate('/procedure-notes');
    } catch {
      toast.error(t('procedureNotes.toast.noteUpdateFailed'));
    }
  };

  // ── Loading state ───────────────────────────────────────
  if (noteLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title={t('procedureNotes.edit.notFound')} />
        <Button variant="outline" onClick={() => navigate('/procedure-notes')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('procedureNotes.edit.backToNotes')}
        </Button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('procedureNotes.edit.title')}
        description={t('procedureNotes.edit.subtitle')}
      >
        <Button variant="outline" size="sm" onClick={() => navigate('/procedure-notes')}>
          <ArrowLeft className="me-2 h-4 w-4" />
          {t('procedureNotes.back')}
        </Button>
      </PageHeader>

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

        {/* ── Chart + Procedure Entries ── */}
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
                    <FormField label={t('procedureNotes.form.serviceProcedure')} required>
                      <MultiSelectCombobox
                        options={serviceOptions}
                        values={entry.serviceIds}
                        onValuesChange={(vals) => {
                          const names = vals.map((svcId) => {
                            const svc = ((serviceData?.items ?? []) as Service[]).find(
                              (s) => s._id === svcId,
                            );
                            return svc?.name.en ?? svcId;
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
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── RIGHT: Dental Chart ──── */}
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

        {/* ── Additional Details ────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Complications" error={errors.complications?.message}>
              <Textarea
                placeholder="Any complications during the procedure…"
                rows={2}
                {...register('complications')}
              />
            </FormField>

            <FormField label="Post-Op Instructions" error={errors.postOpInstructions?.message}>
              <Textarea
                placeholder="Instructions for the patient…"
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
                <Label htmlFor="followUp">Follow-up Required</Label>
              </div>
              {followUpRequired && (
                <FormField label="Follow-up Date" error={errors.followUpDate?.message}>
                  <Input type="date" {...register('followUpDate')} />
                </FormField>
              )}
            </div>

            <FormField label="Notes" error={errors.notes?.message}>
              <Textarea placeholder="Additional notes…" rows={2} {...register('notes')} />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Submit ───────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/procedure-notes')}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Update Procedure Note
          </Button>
        </div>
      </form>
    </div>
  );
}
