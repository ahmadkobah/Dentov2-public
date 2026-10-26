/**
 * Dental Chart Page — Interactive tooth-by-tooth charting.
 * Per DENTO_V2_MASTER_PLAN.md §10 — Dental Chart Module
 * Per IMPLEMENTATION_ROADMAP Week 10 — Full dental chart feature set.
 * Per BUILD_RULES §8.1, §15.2 — Phase 3 Week 10.
 *
 * Features:
 * - react-odontogram SVG wrapper with FDI notation
 * - Adult / Child dentition toggle
 * - Tooth detail panel with 5-Surface SVG + severity + notes
 * - Condition legend grid
 * - Chart history snapshots + side-by-side compare
 * - Snapshot manual + auto triggers
 * - Printable chart view
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Odontogram, type ToothConditionGroup, type ToothDetail } from 'react-odontogram';
import 'react-odontogram/style.css';
import {
  useDentalChart,
  useUpsertChartEntry,
  useCreateChartSnapshot,
  useChartHistory,
  type ChartHistorySnapshot,
  type SnapshotTrigger,
} from '../hooks/useDentalCharts.js';

import { ToothSurfaceSvg } from '../components/ToothSurfaceSvg.js';
import { DentalChartPrint } from '../components/DentalChartPrint.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { formatDateTime } from '@/lib/date.js';
import { useTranslation } from '@/stores/locale.store.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
  toast,
} from '@dento/ui';
import {
  Save,
  History,
  Camera,
  Printer,
  Baby,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ── Constants ───────────────────────────────────────────────

const TOOTH_CONDITIONS = [
  'healthy',
  'cavity',
  'crown',
  'bridge',
  'implant',
  'missing',
  'rct',
  'filling',
  'extraction_needed',
  'periodontal',
  'veneer',
  'temporary',
  'pontic',
] as const;

const SEVERITY_OPTIONS = ['none', 'mild', 'moderate', 'severe'] as const;

const CONDITION_BADGE_COLORS: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cavity: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  crown: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  bridge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  implant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  missing: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  rct: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  filling: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  extraction_needed: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  periodontal: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  veneer: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  temporary: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  pontic: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

/** react-odontogram condition colors for SVG fill/outline */
const CONDITION_FILL: Record<string, string> = {
  cavity: '#ef4444',
  crown: '#eab308',
  bridge: '#f97316',
  implant: '#3b82f6',
  missing: '#9ca3af',
  rct: '#a855f7',
  filling: '#06b6d4',
  extraction_needed: '#f43f5e',
  periodontal: '#d97706',
  veneer: '#6366f1',
  temporary: '#64748b',
  pontic: '#14b8a6',
};

const CONDITION_OUTLINE: Record<string, string> = {
  cavity: '#b91c1c',
  crown: '#a16207',
  bridge: '#c2410c',
  implant: '#1d4ed8',
  missing: '#6b7280',
  rct: '#7e22ce',
  filling: '#0891b2',
  extraction_needed: '#be123c',
  periodontal: '#92400e',
  veneer: '#4338ca',
  temporary: '#475569',
  pontic: '#0d9488',
};

function condKey(c: string): string {
  return `dentalCharts.condition.${c.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase())}`;
}

const TRIGGER_BADGE: Record<SnapshotTrigger, { label: string; className: string }> = {
  manual: {
    label: 'dentalCharts.trigger.manual',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  tooth_update: {
    label: 'dentalCharts.trigger.toothUpdate',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  procedure_note: {
    label: 'dentalCharts.trigger.procedureNote',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  treatment_plan: {
    label: 'dentalCharts.trigger.treatmentPlan',
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  },
};

/** Colors for procedure note entry groups in history odontograms */
const PN_ENTRY_COLORS = [
  {
    fill: '#3b82f6',
    outline: '#2563eb',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  {
    fill: '#10b981',
    outline: '#059669',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  {
    fill: '#f59e0b',
    outline: '#d97706',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  {
    fill: '#ef4444',
    outline: '#dc2626',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  {
    fill: '#8b5cf6',
    outline: '#7c3aed',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  },
  {
    fill: '#ec4899',
    outline: '#db2777',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  },
  {
    fill: '#06b6d4',
    outline: '#0891b2',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  },
  {
    fill: '#f97316',
    outline: '#ea580c',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
];

type DentitionType = 'adult' | 'child';

// ── Component ───────────────────────────────────────────────

export interface DentalChartPageProps {
  patientId?: string;
}

export default function DentalChartPage({ patientId: propPatientId }: DentalChartPageProps = {}) {
  const [searchParams] = useSearchParams();
  const patientId = propPatientId || searchParams.get('patientId') || '';
  const isDark = useThemeStore((s) => s.isDark);
  const printRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // ── State ──────────────────────────────────────────────────
  const [dentition, setDentition] = useState<DentitionType>('adult');
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [condition, setCondition] = useState<string>('healthy');
  const [severity, setSeverity] = useState<string>('none');
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [chartKey, setChartKey] = useState(0);
  const [sessionEntries, setSessionEntries] = useState<
    { toothNumber: number; condition: string; surfaces: string[]; notes?: string }[]
  >([]);

  // Compare mode
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // ── Queries ────────────────────────────────────────────────
  const { data: chartData, isLoading, isError, error } = useDentalChart(patientId || undefined);
  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
  } = useChartHistory(patientId || undefined, historyPage);
  // ── Mutations ──────────────────────────────────────────────
  const upsertMutation = useUpsertChartEntry();
  const snapshotMutation = useCreateChartSnapshot();

  // ── Derived ────────────────────────────────────────────────
  const entries = useMemo(() => chartData?.entries ?? [], [chartData?.entries]);

  const sessionToothMap = useMemo(() => {
    const map = new Map<
      number,
      { toothNumber: number; condition: string; surfaces: string[]; notes?: string }
    >();
    for (const entry of sessionEntries) {
      map.set(entry.toothNumber, entry);
    }
    return map;
  }, [sessionEntries]);

  /** Build react-odontogram condition groups from current session entries */
  const teethConditions: ToothConditionGroup[] = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const entry of sessionEntries) {
      if (entry.condition === 'healthy') continue;
      const teeth = grouped.get(entry.condition) ?? [];
      teeth.push(`teeth-${entry.toothNumber}`);
      grouped.set(entry.condition, teeth);
    }
    const groups: ToothConditionGroup[] = [];
    for (const [cond, teeth] of grouped) {
      groups.push({
        label: cond.replace(/_/g, ' '),
        teeth,
        fillColor: CONDITION_FILL[cond] ?? '#9ca3af',
        outlineColor: CONDITION_OUTLINE[cond] ?? '#6b7280',
      });
    }
    return groups;
  }, [sessionEntries]);

  // ── Handlers ───────────────────────────────────────────────

  const handleToothChange = useCallback(
    (selected: ToothDetail[]) => {
      queueMicrotask(() => {
        if (selected.length === 0) {
          setShowDetailPanel(false);
          setSelectedTeeth([]);
          return;
        }
        const teeth = selected.map((t) => t.notations.fdi);
        setSelectedTeeth(teeth);

        // Load existing data from the last selected tooth
        const lastTooth = selected[selected.length - 1];
        const fdiNum = Number(lastTooth.notations.fdi);
        const existing = sessionToothMap.get(fdiNum);
        setCondition(existing?.condition ?? 'healthy');
        setSurfaces(existing?.surfaces ?? []);
        setNotes(existing?.notes ?? '');
        setSeverity('none');
        setShowDetailPanel(true);
      });
    },
    [sessionToothMap],
  );

  const handleSave = async () => {
    if (!patientId || selectedTeeth.length === 0) return;
    try {
      // Save the same condition/surfaces/notes for all selected teeth
      await Promise.all(
        selectedTeeth.map((toothId) =>
          upsertMutation.mutateAsync({
            patientId,
            toothNumber: Number(toothId),
            condition,
            surfaces,
            notes: notes || undefined,
          }),
        ),
      );
      toast.success(t('dentalCharts.toast.saved'));

      // Update session entries + clear selection + remount chart in one batch.
      // Remount (chartKey) is required because the Odontogram stores its own
      // internal selection in useState — clearing our selectedTeeth state alone
      // does NOT deselect teeth inside the library.  React 18 batches all these
      // setState calls so the single re-render sees updated teethConditions AND
      // a fresh Odontogram mount with no stale selection.
      setSessionEntries((prev) => {
        const map = new Map(prev.map((e) => [e.toothNumber, e]));
        for (const toothId of selectedTeeth) {
          map.set(Number(toothId), {
            toothNumber: Number(toothId),
            condition,
            surfaces,
            notes: notes || undefined,
          });
        }
        return [...map.values()];
      });
      setSelectedTeeth([]);
      setShowDetailPanel(false);
      setChartKey((k) => k + 1);
    } catch {
      toast.error('Failed to save tooth entries');
    }
  };

  const handleSnapshot = async () => {
    if (!patientId) return;
    try {
      await snapshotMutation.mutateAsync({
        patientId,
        notes: snapshotNotes || undefined,
      });
      setShowSnapshotDialog(false);
      setSnapshotNotes('');

      // Reset chart — clear session and start fresh
      setSessionEntries([]);
      setSelectedTeeth([]);
      setShowDetailPanel(false);
      setChartKey((k) => k + 1);

      toast.success(t('dentalCharts.toast.snapshotSaved'));
    } catch {
      toast.error(t('dentalCharts.toast.snapshotFailed'));
    }
  };

  const toggleSurface = (surface: string) => {
    setSurfaces((prev) =>
      prev.includes(surface) ? prev.filter((s) => s !== surface) : [...prev, surface],
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const snapshots = historyData?.snapshots ?? [];
  const historyPagination = historyData?.pagination;

  // ── No patient ─────────────────────────────────────────────

  if (!patientId) {
    return (
      <div className="p-6">
        <PageHeader title={t('dentalCharts.title')} description={t('dentalCharts.selectPatient')} />
        <p className="mt-4 text-muted-foreground">{t('dentalCharts.navigateHint')}</p>
      </div>
    );
  }

  if (isLoading) return <TableSkeleton />;
  if (isError) return <ErrorState message={(error as Error)?.message ?? 'Failed to load chart'} />;

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('dentalCharts.title')}
        description={
          sessionEntries.length > 0
            ? t('dentalCharts.sessionCount', { count: sessionEntries.length })
            : t('dentalCharts.selectTeeth')
        }
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="me-2 h-4 w-4" />
            {t('dentalCharts.printBtn')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSnapshotDialog(true)}>
            <Camera className="me-2 h-4 w-4" />
            {t('dentalCharts.snapshotBtn')}
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">{t('dentalCharts.tab.chart')}</TabsTrigger>
          <TabsTrigger value="history">
            {t('dentalCharts.tab.history')} ({historyPagination?.total ?? snapshots.length})
          </TabsTrigger>
          <TabsTrigger value="compare">{t('dentalCharts.tab.compare')}</TabsTrigger>
        </TabsList>

        {/* ── Chart Tab ── */}
        <TabsContent value="chart" className="space-y-4">
          {/* Toolbar: Dentition Toggle + Legend */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              {/* Adult / Child Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{t('dentalCharts.dentition')}</span>
                <Button
                  variant={dentition === 'adult' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDentition('adult')}
                >
                  <User className="me-1.5 h-3.5 w-3.5" />
                  {t('dentalCharts.dentition.adult')}
                </Button>
                <Button
                  variant={dentition === 'child' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDentition('child')}
                >
                  <Baby className="me-1.5 h-3.5 w-3.5" />
                  {t('dentalCharts.dentition.child')}
                </Button>
              </div>

              {/* Legend — only show conditions present in the chart */}
              <div className="flex flex-wrap gap-2">
                {sessionEntries.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    {t('dentalCharts.noConditions')}
                  </span>
                )}
                {Array.from(new Set(sessionEntries.map((e) => e.condition)))
                  .filter((c) => c !== 'healthy')
                  .map((c) => (
                    <Badge key={c} className={CONDITION_BADGE_COLORS[c] ?? ''} variant="outline">
                      {t(condKey(c))} ({sessionEntries.filter((e) => e.condition === c).length})
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* react-odontogram SVG + Detail Panel side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Odontogram */}
            <Card className={showDetailPanel ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <CardContent className="flex justify-center pt-4 overflow-x-auto">
                <Odontogram
                  key={chartKey}
                  notation="FDI"
                  theme={isDark ? 'dark' : 'light'}
                  teethConditions={teethConditions}
                  maxTeeth={dentition === 'child' ? 5 : undefined}
                  showLabels
                  onChange={handleToothChange}
                  defaultSelected={selectedTeeth.length > 0 ? selectedTeeth : undefined}
                  styles={{ maxWidth: '280px', width: '100%' }}
                />
              </CardContent>
            </Card>

            {/* Detail Panel */}
            {showDetailPanel && selectedTeeth.length > 0 && (
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm">
                    {selectedTeeth.length === 1 ? (
                      <>
                        {t('dentalCharts.detail.toothNumber', { number: selectedTeeth[0] })}
                        {sessionToothMap.get(Number(selectedTeeth[0]))?.condition && (
                          <Badge
                            className={`ms-2 ${CONDITION_BADGE_COLORS[sessionToothMap.get(Number(selectedTeeth[0]))?.condition ?? ''] ?? ''}`}
                            variant="outline"
                          >
                            {t(
                              condKey(
                                sessionToothMap.get(Number(selectedTeeth[0]))?.condition ??
                                  'healthy',
                              ),
                            )}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <>
                        {t('dentalCharts.detail.teethSelected', { count: selectedTeeth.length })}{' '}
                        {selectedTeeth.map((tooth) => `#${tooth}`).join(', ')}
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 5-Surface SVG */}
                  <div>
                    <Label className="text-xs">{t('dentalCharts.detail.surfaces')}</Label>
                    <div className="flex justify-center mt-1">
                      <ToothSurfaceSvg selected={surfaces} onToggle={toggleSurface} />
                    </div>
                    {surfaces.length > 0 && (
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        {surfaces.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Condition */}
                  <div>
                    <Label>{t('dentalCharts.detail.condition')}</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white dark:bg-gray-900">
                        {TOOTH_CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {t(condKey(c))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Severity (NEW per roadmap) */}
                  <div>
                    <Label>{t('dentalCharts.detail.severity')}</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white dark:bg-gray-900">
                        {SEVERITY_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`dentalCharts.severity.${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="tooth-notes">{t('dentalCharts.detail.notes')}</Label>
                    <Textarea
                      id="tooth-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('dentalCharts.detail.notesPlaceholder')}
                      rows={3}
                    />
                  </div>

                  {/* Save */}
                  <Button
                    onClick={handleSave}
                    disabled={upsertMutation.isPending}
                    className="w-full"
                  >
                    <Save className="me-2 h-4 w-4" />
                    {t('dentalCharts.detail.saveBtn')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="space-y-4">
          {historyLoading && <TableSkeleton columns={2} rows={3} />}
          {historyError && (
            <p className="text-destructive text-sm">{t('dentalCharts.history.loadFailed')}</p>
          )}
          {!historyLoading && !historyError && snapshots.length === 0 && (
            <p className="text-muted-foreground text-sm">{t('dentalCharts.history.noSnapshots')}</p>
          )}
          {snapshots.map((snap: ChartHistorySnapshot) => {
            const snapEntries = snap.chartData?.entries ?? [];
            const pnTeeth = snap.chartData?.procedureNoteTeeth ?? [];

            // Group procedure note teeth by entry/service
            const pnEntryGroups: {
              label: string;
              teeth: string[];
              teethNumbers: number[];
              colorIdx: number;
            }[] = [];
            if (pnTeeth.length > 0) {
              const pnGrouped = new Map<
                string,
                { label: string; teeth: string[]; teethNumbers: number[] }
              >();
              for (const pnt of pnTeeth) {
                const key = String(pnt.entryIndex ?? pnt.procedureName ?? 'procedure');
                if (!pnGrouped.has(key)) {
                  pnGrouped.set(key, {
                    label: pnt.procedureName ?? `Entry ${pnGrouped.size + 1}`,
                    teeth: [],
                    teethNumbers: [],
                  });
                }
                const g = pnGrouped.get(key)!;
                g.teeth.push(`teeth-${pnt.toothNumber}`);
                g.teethNumbers.push(pnt.toothNumber);
              }
              let idx = 0;
              for (const [, g] of pnGrouped) {
                pnEntryGroups.push({ ...g, colorIdx: idx });
                idx++;
              }
            }

            // Build condition groups for the mini odontogram
            const snapConditionGroups: ToothConditionGroup[] = (() => {
              const grouped = new Map<string, string[]>();
              for (const entry of snapEntries) {
                const cond = entry.condition ?? 'healthy';
                if (cond === 'healthy') continue;
                const teeth = grouped.get(cond) ?? [];
                teeth.push(`teeth-${entry.toothNumber}`);
                grouped.set(cond, teeth);
              }
              const groups: ToothConditionGroup[] = [];
              for (const [cond, teeth] of grouped) {
                groups.push({
                  label: cond.replace(/_/g, ' '),
                  teeth,
                  fillColor: CONDITION_FILL[cond] ?? '#9ca3af',
                  outlineColor: CONDITION_OUTLINE[cond] ?? '#6b7280',
                });
              }
              for (const g of pnEntryGroups) {
                const color = PN_ENTRY_COLORS[g.colorIdx % PN_ENTRY_COLORS.length];
                groups.push({
                  label: g.label,
                  teeth: g.teeth,
                  fillColor: color.fill,
                  outlineColor: color.outline,
                });
              }
              return groups;
            })();

            return (
              <Card key={snap._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    {formatDateTime(snap.recordedAt)}
                    {snap.trigger && TRIGGER_BADGE[snap.trigger] && (
                      <Badge className={TRIGGER_BADGE[snap.trigger].className} variant="outline">
                        {t(TRIGGER_BADGE[snap.trigger].label)}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {snap.notes && <p className="text-sm text-muted-foreground">{snap.notes}</p>}

                  {/* Mini Odontogram */}
                  {(snapEntries.length > 0 || pnTeeth.length > 0) && (
                    <div className="flex justify-center py-2 bg-muted/30 rounded-md">
                      <Odontogram
                        notation="FDI"
                        theme={isDark ? 'dark' : 'light'}
                        teethConditions={snapConditionGroups}
                        readOnly
                        showLabels
                        styles={{ maxWidth: '220px', width: '100%' }}
                      />
                    </div>
                  )}

                  {/* Condition badges for this snapshot */}
                  {(snapEntries.filter((e) => e.condition && e.condition !== 'healthy').length >
                    0 ||
                    pnEntryGroups.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {Array.from(
                        new Set(
                          snapEntries
                            .filter((e) => e.condition && e.condition !== 'healthy')
                            .map((e) => e.condition!),
                        ),
                      ).map((cond) => (
                        <Badge
                          key={cond}
                          className={CONDITION_BADGE_COLORS[cond] ?? ''}
                          variant="outline"
                        >
                          {t(condKey(cond))} (
                          {snapEntries.filter((e) => e.condition === cond).length})
                        </Badge>
                      ))}
                      {pnEntryGroups.map((g) => {
                        const color = PN_ENTRY_COLORS[g.colorIdx % PN_ENTRY_COLORS.length];
                        return (
                          <Badge key={`pn-${g.colorIdx}`} className={color.badge} variant="outline">
                            {g.label} ({g.teethNumbers.join(', ')})
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {pnEntryGroups.length > 0 && (
                    <div className="space-y-0.5">
                      {pnEntryGroups.map((g) => (
                        <p key={`pn-text-${g.colorIdx}`} className="text-xs text-muted-foreground">
                          {g.label}: teeth {g.teethNumbers.join(', ')}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t(
                      snapEntries.length === 1
                        ? 'dentalCharts.history.chartedTooth'
                        : 'dentalCharts.history.chartedTeeth',
                      { count: snapEntries.length },
                    )}
                    {pnTeeth.length > 0 && (
                      <>
                        {' · '}
                        {t(
                          pnTeeth.length === 1
                            ? 'dentalCharts.history.procedureNoteTooth'
                            : 'dentalCharts.history.procedureNoteTeeth',
                          { count: pnTeeth.length },
                        )}{' '}
                        ({pnTeeth.map((pnt) => pnt.toothNumber).join(', ')})
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {historyPagination && historyPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {t('dentalCharts.history.page', {
                  current: historyPagination.page,
                  total: historyPagination.totalPages,
                  count: historyPagination.total,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('dentalCharts.history.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage >= historyPagination.totalPages}
                  onClick={() => setHistoryPage((p) => p + 1)}
                >
                  {t('dentalCharts.history.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Compare Tab ── */}
        <TabsContent value="compare" className="space-y-4">
          {snapshots.length < 2 ? (
            <p className="text-muted-foreground text-sm">
              {t('dentalCharts.compare.minSnapshots')}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>{t('dentalCharts.compare.snapshotA')}</Label>
                  <Select value={compareA ?? ''} onValueChange={setCompareA}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('dentalCharts.compare.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {snapshots.map((s: ChartHistorySnapshot) => (
                        <SelectItem key={s._id} value={s._id}>
                          {formatDateTime(s.recordedAt)}
                          {s.notes ? ` — ${s.notes}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>{t('dentalCharts.compare.snapshotB')}</Label>
                  <Select value={compareB ?? ''} onValueChange={setCompareB}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('dentalCharts.compare.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {snapshots.map((s: ChartHistorySnapshot) => (
                        <SelectItem key={s._id} value={s._id}>
                          {formatDateTime(s.recordedAt)}
                          {s.notes ? ` — ${s.notes}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="mt-5"
                  disabled={!compareA || !compareB || compareA === compareB}
                  onClick={() => setShowCompare(true)}
                >
                  {t('dentalCharts.compare.compareBtn')}
                </Button>
              </div>

              {showCompare && compareA && compareB && (
                <CompareView snapshots={snapshots} idA={compareA} idB={compareB} />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Snapshot Dialog ── */}
      <Dialog open={showSnapshotDialog} onOpenChange={setShowSnapshotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dentalCharts.snapshot.title')}</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="snapshot-notes">{t('dentalCharts.snapshot.notesLabel')}</Label>
            <Input
              id="snapshot-notes"
              value={snapshotNotes}
              onChange={(e) => setSnapshotNotes(e.target.value)}
              placeholder={t('dentalCharts.snapshot.notesPlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSnapshotDialog(false)}>
              {t('dentalCharts.snapshot.cancelBtn')}
            </Button>
            <Button onClick={handleSnapshot} disabled={snapshotMutation.isPending}>
              <Camera className="me-2 h-4 w-4" />
              {t('dentalCharts.snapshot.saveBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Print View (hidden on screen, visible in print) ── */}
      <div className="hidden print:block">
        <DentalChartPrint ref={printRef} entries={entries} lastSnapshot={snapshots[0] ?? null} />
      </div>
    </div>
  );
}

// ── Compare View Sub-Component ───────────────────────────────

function CompareView({
  snapshots,
  idA,
  idB,
}: {
  snapshots: ChartHistorySnapshot[];
  idA: string;
  idB: string;
}) {
  const isDark = useThemeStore((s) => s.isDark);
  const { t } = useTranslation();
  const snapA = snapshots.find((s) => s._id === idA);
  const snapB = snapshots.find((s) => s._id === idB);

  if (!snapA || !snapB) return null;

  type SnapEntry = { toothNumber: number; condition?: string; surfaces?: string[] };

  const entriesA: SnapEntry[] = (snapA.chartData as { entries?: SnapEntry[] })?.entries ?? [];
  const entriesB: SnapEntry[] = (snapB.chartData as { entries?: SnapEntry[] })?.entries ?? [];

  // Build condition groups for side-by-side Odontograms
  const buildGroups = (entries: SnapEntry[]): ToothConditionGroup[] => {
    const grouped = new Map<string, string[]>();
    for (const entry of entries) {
      const cond = entry.condition ?? 'healthy';
      if (cond === 'healthy') continue;
      const teeth = grouped.get(cond) ?? [];
      teeth.push(`teeth-${entry.toothNumber}`);
      grouped.set(cond, teeth);
    }
    const groups: ToothConditionGroup[] = [];
    for (const [cond, teeth] of grouped) {
      groups.push({
        label: cond.replace(/_/g, ' '),
        teeth,
        fillColor: CONDITION_FILL[cond] ?? '#9ca3af',
        outlineColor: CONDITION_OUTLINE[cond] ?? '#6b7280',
      });
    }
    return groups;
  };

  const groupsA = buildGroups(entriesA);
  const groupsB = buildGroups(entriesB);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            A: {formatDateTime(snapA.recordedAt)}
            {snapA.notes ? ` — ${snapA.notes}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center overflow-x-auto">
          <Odontogram
            notation="FDI"
            theme={isDark ? 'dark' : 'light'}
            teethConditions={groupsA}
            readOnly
            showLabels
            styles={{ maxWidth: '240px', width: '100%' }}
          />
        </CardContent>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {t(
              entriesA.length === 1
                ? 'dentalCharts.compare.toothCharted'
                : 'dentalCharts.compare.teethCharted',
              { count: entriesA.length },
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            B: {formatDateTime(snapB.recordedAt)}
            {snapB.notes ? ` — ${snapB.notes}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center overflow-x-auto">
          <Odontogram
            notation="FDI"
            theme={isDark ? 'dark' : 'light'}
            teethConditions={groupsB}
            readOnly
            showLabels
            styles={{ maxWidth: '240px', width: '100%' }}
          />
        </CardContent>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {t(
              entriesB.length === 1
                ? 'dentalCharts.compare.toothCharted'
                : 'dentalCharts.compare.teethCharted',
              { count: entriesB.length },
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
