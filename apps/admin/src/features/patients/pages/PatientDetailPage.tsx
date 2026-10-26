/**
 * Patient Detail Page — TabBased detail with Info, Allergies, Medical History.
 * Per BUILD_RULES §8.1 (one component per route).
 *
 * Tabs: Info | Allergies | Medical History | (future: Charts, X-Rays, Billing)
 */

import { useParams, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '../../../stores/locale.store.js';
import { usePatientDetail, useMergePatients, usePatientList } from '../hooks/usePatients.js';
import { PatientInfoTab } from '../components/PatientInfoTab.js';
import { AllergyList } from '../components/AllergyList.js';
import { MedicalHistoryForm } from '../components/MedicalHistoryForm.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';

const DentalChartPage = lazy(() => import('@/features/dental-charts/pages/DentalChartPage.js'));
const TreatmentPlansPage = lazy(
  () => import('@/features/treatment-plans/pages/TreatmentPlansPage.js'),
);
const InvoiceListPage = lazy(() => import('@/features/invoices/pages/InvoiceListPage.js'));
const PatientAppointments = lazy(() => import('./PatientAppointments.js'));
const ProcedureNotesPage = lazy(
  () => import('@/features/procedure-notes/pages/ProcedureNotesPage.js'),
);
const XrayListPage = lazy(() => import('@/features/xrays/pages/XrayListPage.js'));
const CbctListPage = lazy(() => import('@/features/cbct/pages/CbctListPage.js'));
const ScanListPage = lazy(() => import('@/features/scans/pages/ScanListPage.js'));
const ConsentPage = lazy(() => import('@/features/consent/pages/ConsentPage.js'));
const PrescriptionListPage = lazy(
  () => import('@/features/prescriptions/pages/PrescriptionListPage.js'),
);
const LabOrderListPage = lazy(() => import('@/features/lab-orders/pages/LabOrderListPage.js'));
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
} from '@dento/ui';
import {
  ArrowLeft,
  User,
  AlertTriangle,
  Smile,
  Image,
  FileText,
  CreditCard,
  CalendarDays,
  ScanLine,
  Box,
  ClipboardList,
  ShieldCheck,
  Pill,
  FlaskConical,
  GitMerge,
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────

function displayName(name: { en: string; ar?: string }, lang: 'en' | 'ar' = 'en') {
  return lang === 'ar' ? name.ar || name.en : name.en;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Component ───────────────────────────────────────────────

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const locale = useThemeStore((s) => s.locale);
  const { t } = useTranslation();

  const { data: patient, isLoading, isError, error, refetch } = usePatientDetail(id || '');

  // Phase 4.3 — merge dialog state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeDuplicateId, setMergeDuplicateId] = useState('');
  const [mergeDuplicateLabel, setMergeDuplicateLabel] = useState('');
  const [mergeSearch, setMergeSearch] = useState('');
  const [mergeSearchDebounced, setMergeSearchDebounced] = useState('');
  const [mergeError, setMergeError] = useState<string | null>(null);
  const mergeMutation = useMergePatients();

  // Debounce the search input so we don't hit the API on every keystroke
  useEffect(() => {
    const handle = setTimeout(() => setMergeSearchDebounced(mergeSearch.trim()), 250);
    return () => clearTimeout(handle);
  }, [mergeSearch]);

  const mergeSearchQuery = useMemo(
    () => ({
      page: 1,
      limit: 20,
      search: mergeSearchDebounced || undefined,
      sortBy: 'firstName.en' as const,
      sortOrder: 'asc' as const,
    }),
    [mergeSearchDebounced],
  );
  const { data: mergeSearchResults, isFetching: mergeSearchLoading } =
    usePatientList(mergeSearchQuery);
  const candidatePatients = useMemo(
    () => (mergeSearchResults?.patients ?? []).filter((p) => p._id !== id),
    [mergeSearchResults, id],
  );

  async function submitMerge() {
    if (!id || !mergeDuplicateId.trim()) {
      setMergeError('Duplicate patient ID is required');
      return;
    }
    if (mergeDuplicateId.trim() === id) {
      setMergeError('Cannot merge a patient into itself');
      return;
    }
    setMergeError(null);
    try {
      const res = await mergeMutation.mutateAsync({
        keepId: id,
        duplicateId: mergeDuplicateId.trim(),
      });
      const total = Object.values(res.data?.moved ?? {}).reduce(
        (a, b) => a + Math.max(0, Number(b) || 0),
        0,
      );
      toast.success(`Merged. ${total} record(s) re-pointed.`);
      setMergeOpen(false);
      setMergeDuplicateId('');
      setMergeDuplicateLabel('');
      setMergeSearch('');
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Merge failed');
    }
  }

  if (isLoading) return <TableSkeleton columns={2} rows={8} />;
  if (isError)
    return (
      <ErrorState
        title={t('patients.detail.loadFailed')}
        message={error?.message}
        onRetry={refetch}
      />
    );
  if (!patient) return <ErrorState title={t('patients.detail.notFound')} />;

  const fullName = `${displayName(patient.firstName, locale as 'ar' | 'en')} ${displayName(patient.lastName, locale as 'ar' | 'en')}`;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('patients.detail.backToPatients')}
            onClick={() => navigate('/patients')}
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fullName}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{patient.patientCode}</span>
              <Badge variant="outline" className="capitalize">
                {patient.gender}
              </Badge>
              <span>{calculateAge(patient.dateOfBirth)} years</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMergeError(null);
              setMergeDuplicateId('');
              setMergeDuplicateLabel('');
              setMergeSearch('');
              setMergeOpen(true);
            }}
          >
            <GitMerge className="me-2 h-4 w-4" />
            Merge duplicate
          </Button>
        </div>
      </div>

      {/* Merge dialog (Phase 4.3) */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge duplicate patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              All appointments, invoices, payments, charts, x-rays, scans, prescriptions, lab orders
              and consents from the duplicate will be re-pointed to <strong>{fullName}</strong>. The
              duplicate record will be deactivated. This action cannot be undone.
            </p>
            <div>
              <Label htmlFor="merge-dup-search">Find duplicate patient</Label>
              <Input
                id="merge-dup-search"
                value={mergeSearch}
                onChange={(e) => {
                  setMergeSearch(e.target.value);
                  // Clear current selection when user starts a new search
                  if (mergeDuplicateId) {
                    setMergeDuplicateId('');
                    setMergeDuplicateLabel('');
                  }
                }}
                placeholder="Search by name, phone, code or email…"
                autoComplete="off"
              />
              {mergeDuplicateId && mergeDuplicateLabel && (
                <div className="mt-2 flex items-center justify-between rounded border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                  <span>
                    Selected: <strong>{mergeDuplicateLabel}</strong>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMergeDuplicateId('');
                      setMergeDuplicateLabel('');
                    }}
                  >
                    Change
                  </Button>
                </div>
              )}
              {!mergeDuplicateId && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded border bg-background">
                  {mergeSearchLoading && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                  )}
                  {!mergeSearchLoading && candidatePatients.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {mergeSearchDebounced
                        ? 'No matching patients found.'
                        : 'Start typing to search, or browse the list of patients in the clinic.'}
                    </div>
                  )}
                  {!mergeSearchLoading &&
                    candidatePatients.map((p) => {
                      const name = `${displayName(p.firstName, locale as 'ar' | 'en')} ${displayName(
                        p.lastName,
                        locale as 'ar' | 'en',
                      )}`;
                      return (
                        <button
                          key={p._id}
                          type="button"
                          className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-start text-sm last:border-b-0 hover:bg-muted focus:bg-muted focus:outline-none"
                          onClick={() => {
                            setMergeDuplicateId(p._id);
                            setMergeDuplicateLabel(`${name} · ${p.patientCode}`);
                            setMergeError(null);
                          }}
                        >
                          <span className="font-medium">{name}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.patientCode} · {p.phone}
                            {p.email ? ` · ${p.email}` : ''}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
            {mergeError && (
              <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {mergeError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitMerge}
              disabled={mergeMutation.isPending || !mergeDuplicateId}
            >
              {mergeMutation.isPending ? 'Merging…' : 'Merge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <div className="w-full overflow-x-auto">
          <TabsList className="h-auto w-max flex-nowrap whitespace-nowrap">
            <TabsTrigger value="info" className="gap-1">
              <User className="h-4 w-4" />
              {t('patients.tab.info')}
            </TabsTrigger>
            <TabsTrigger value="allergies-medical" className="gap-1">
              <AlertTriangle className="h-4 w-4" />
              {t('patients.tab.allergies')}
              {(patient.allergies?.length ?? 0) > 0 && (
                <Badge variant="destructive" className="ms-1 px-1.5">
                  {patient.allergies?.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-1">
              <CalendarDays className="h-4 w-4" />
              {t('patients.tab.appointments')}
            </TabsTrigger>
            <TabsTrigger value="dental-chart" className="gap-1">
              <Smile className="h-4 w-4" />
              {t('patients.tab.dentalChart')}
            </TabsTrigger>
            <TabsTrigger value="treatment-plans" className="gap-1">
              <FileText className="h-4 w-4" />
              {t('patients.tab.treatmentPlans')}
            </TabsTrigger>
            <TabsTrigger value="procedure-notes" className="gap-1">
              <ClipboardList className="h-4 w-4" />
              {t('patients.tab.procedureNotes')}
            </TabsTrigger>
            <TabsTrigger value="xrays" className="gap-1">
              <Image className="h-4 w-4" />
              {t('patients.tab.xrays')}
            </TabsTrigger>
            <TabsTrigger value="cbct" className="gap-1">
              <ScanLine className="h-4 w-4" />
              {t('patients.tab.cbct')}
            </TabsTrigger>
            <TabsTrigger value="scans" className="gap-1">
              <Box className="h-4 w-4" />
              {t('patients.tab.scans')}
            </TabsTrigger>
            <TabsTrigger value="consent-forms" className="gap-1">
              <ShieldCheck className="h-4 w-4" />
              {t('patients.tab.consentForms')}
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-1">
              <Pill className="h-4 w-4" />
              {t('patients.tab.prescriptions')}
            </TabsTrigger>
            <TabsTrigger value="lab-orders" className="gap-1">
              <FlaskConical className="h-4 w-4" />
              {t('patients.tab.labOrders')}
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1">
              <CreditCard className="h-4 w-4" />
              {t('patients.tab.billing')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Info Tab ── */}
        <TabsContent value="info" className="mt-4">
          <PatientInfoTab patient={patient} />
        </TabsContent>

        {/* ── Allergies & Medical History Tab ── */}
        <TabsContent value="allergies-medical" className="mt-4 space-y-6">
          <AllergyList patientId={patient._id} allergies={patient.allergies ?? []} />
          <MedicalHistoryForm patientId={patient._id} defaultValues={patient.medicalHistory} />
        </TabsContent>

        {/* ── Appointments Tab ── */}
        <TabsContent value="appointments" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={4} rows={6} />}>
            <PatientAppointments patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── Dental Chart Tab ── */}
        <TabsContent value="dental-chart" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={2} rows={6} />}>
            <DentalChartPage patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── Treatment Plans Tab ── */}
        <TabsContent value="treatment-plans" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={4} rows={6} />}>
            <TreatmentPlansPage patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── Procedure Notes Tab ── */}
        <TabsContent value="procedure-notes" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={4} rows={6} />}>
            <ProcedureNotesPage patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── X-Rays Tab ── */}
        <TabsContent value="xrays" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={4} rows={6} />}>
            <XrayListPage patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── CBCT Tab ── */}
        <TabsContent value="cbct" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={4} rows={6} />}>
            <CbctListPage patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── 3D Scans Tab ── */}
        <TabsContent value="scans" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={4} rows={6} />}>
            <ScanListPage patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── Consent Forms Tab ── */}
        <TabsContent value="consent-forms" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={3} rows={6} />}>
            <ConsentPage patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── Prescriptions Tab ── */}
        <TabsContent value="prescriptions" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={4} rows={6} />}>
            <PrescriptionListPage patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── Lab Orders Tab ── */}
        <TabsContent value="lab-orders" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={4} rows={6} />}>
            <LabOrderListPage patientId={patient._id} />
          </Suspense>
        </TabsContent>

        {/* ── Billing Tab ── */}
        <TabsContent value="billing" className="mt-4">
          <Suspense fallback={<TableSkeleton columns={4} rows={6} />}>
            <InvoiceListPage patientId={patient._id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
