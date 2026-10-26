import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  SearchCombobox,
  type SearchComboboxOption,
} from '@dento/ui';
import { useCreateLabOrder } from '../hooks/useLabOrders.js';
import type { LabOrder } from '../hooks/useLabOrders.js';
import { PatientCombobox, BranchCombobox } from '@/components/entity-selectors/index.js';
import { DoctorCombobox } from '@/components/entity-selectors/DoctorCombobox.js';
import { useDentalLabs } from '@/features/dental-labs/hooks/useDentalLabs.js';
import { useLabOrderTypes } from '@/features/lab-order-types/hooks/useLabOrderTypes.js';
import { usePatientScans } from '@/features/scans/hooks/useScan.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── VITA Classical + 3D-Master shade guide ──────────────────
const SHADE_OPTIONS: SearchComboboxOption[] = [
  // VITA Classical A (reddish-brownish)
  { value: 'A1', label: 'A1', description: 'VITA Classical' },
  { value: 'A2', label: 'A2', description: 'VITA Classical' },
  { value: 'A3', label: 'A3', description: 'VITA Classical' },
  { value: 'A3.5', label: 'A3.5', description: 'VITA Classical' },
  { value: 'A4', label: 'A4', description: 'VITA Classical' },
  // VITA Classical B (reddish-yellowish)
  { value: 'B1', label: 'B1', description: 'VITA Classical' },
  { value: 'B2', label: 'B2', description: 'VITA Classical' },
  { value: 'B3', label: 'B3', description: 'VITA Classical' },
  { value: 'B4', label: 'B4', description: 'VITA Classical' },
  // VITA Classical C (greyish)
  { value: 'C1', label: 'C1', description: 'VITA Classical' },
  { value: 'C2', label: 'C2', description: 'VITA Classical' },
  { value: 'C3', label: 'C3', description: 'VITA Classical' },
  { value: 'C4', label: 'C4', description: 'VITA Classical' },
  // VITA Classical D (reddish-greyish)
  { value: 'D2', label: 'D2', description: 'VITA Classical' },
  { value: 'D3', label: 'D3', description: 'VITA Classical' },
  { value: 'D4', label: 'D4', description: 'VITA Classical' },
  // Bleach shades
  { value: 'BL1', label: 'BL1', description: 'Bleach' },
  { value: 'BL2', label: 'BL2', description: 'Bleach' },
  { value: 'BL3', label: 'BL3', description: 'Bleach' },
  { value: 'BL4', label: 'BL4', description: 'Bleach' },
  // VITA 3D-Master common
  { value: '0M1', label: '0M1', description: '3D-Master' },
  { value: '1M1', label: '1M1', description: '3D-Master' },
  { value: '1M2', label: '1M2', description: '3D-Master' },
  { value: '2L1.5', label: '2L1.5', description: '3D-Master' },
  { value: '2L2.5', label: '2L2.5', description: '3D-Master' },
  { value: '2M1', label: '2M1', description: '3D-Master' },
  { value: '2M2', label: '2M2', description: '3D-Master' },
  { value: '2M3', label: '2M3', description: '3D-Master' },
  { value: '2R1.5', label: '2R1.5', description: '3D-Master' },
  { value: '2R2.5', label: '2R2.5', description: '3D-Master' },
  { value: '3L1.5', label: '3L1.5', description: '3D-Master' },
  { value: '3L2.5', label: '3L2.5', description: '3D-Master' },
  { value: '3M1', label: '3M1', description: '3D-Master' },
  { value: '3M2', label: '3M2', description: '3D-Master' },
  { value: '3M3', label: '3M3', description: '3D-Master' },
  { value: '3R1.5', label: '3R1.5', description: '3D-Master' },
  { value: '3R2.5', label: '3R2.5', description: '3D-Master' },
  { value: '4L1.5', label: '4L1.5', description: '3D-Master' },
  { value: '4L2.5', label: '4L2.5', description: '3D-Master' },
  { value: '4M1', label: '4M1', description: '3D-Master' },
  { value: '4M2', label: '4M2', description: '3D-Master' },
  { value: '4M3', label: '4M3', description: '3D-Master' },
  { value: '4R1.5', label: '4R1.5', description: '3D-Master' },
  { value: '4R2.5', label: '4R2.5', description: '3D-Master' },
  { value: '5M1', label: '5M1', description: '3D-Master' },
  { value: '5M2', label: '5M2', description: '3D-Master' },
  { value: '5M3', label: '5M3', description: '3D-Master' },
];

// ── Common dental restoration materials ──────────────────────
const MATERIAL_OPTIONS: SearchComboboxOption[] = [
  { value: 'Zirconia', label: 'Zirconia', description: 'Full-contour or layered' },
  { value: 'E-max', label: 'E-max', description: 'Lithium disilicate' },
  { value: 'PFM', label: 'PFM', description: 'Porcelain-fused-to-metal' },
  { value: 'Porcelain', label: 'Porcelain', description: 'Feldspathic porcelain' },
  { value: 'Composite', label: 'Composite', description: 'Resin composite' },
  { value: 'Gold', label: 'Gold', description: 'Cast gold alloy' },
  { value: 'Titanium', label: 'Titanium', description: 'Implant-grade titanium' },
  { value: 'Acrylic', label: 'Acrylic', description: 'PMMA acrylic resin' },
  { value: 'Chrome Cobalt', label: 'Chrome Cobalt', description: 'Metal framework' },
  { value: 'PEEK', label: 'PEEK', description: 'Polyether ether ketone' },
  { value: 'Wax', label: 'Wax', description: 'Diagnostic wax-up' },
  { value: 'Ceramic', label: 'Ceramic', description: 'Glass-ceramic' },
  { value: 'Hybrid Ceramic', label: 'Hybrid Ceramic', description: 'Resin-nano ceramic' },
];

/** Map legacy display-name categories to new slug keys */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'Crown & Bridge': 'crown_bridge',
  Veneers: 'veneers',
  Removable: 'removable',
  Appliances: 'appliances',
  Orthodontics: 'orthodontics',
  Implants: 'implants',
  Diagnostics: 'diagnostics',
};
function normCategory(raw: string): string {
  return LEGACY_CATEGORY_MAP[raw] ?? raw;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill patient when creating from patient context */
  defaultPatientId?: string;
}

export default function LabOrderCreateDialog({ open, onOpenChange, defaultPatientId }: Props) {
  const { t } = useTranslation();
  const createMutation = useCreateLabOrder();

  // Selectors
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [dentalLabId, setDentalLabId] = useState('');
  const [labOrderTypeId, setLabOrderTypeId] = useState('');

  // Fields
  const [toothNumbers, setToothNumbers] = useState('');
  const [shade, setShade] = useState('');
  const [material, setMaterial] = useState('');
  const [description, setDescription] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [cost, setCost] = useState('');
  const [scanId, setScanId] = useState('');

  // Lookup data
  const { data: labsData } = useDentalLabs({ isActive: true, limit: 100 });
  const { data: typesData } = useLabOrderTypes({ isActive: true, limit: 100 });
  const { data: patientScans } = usePatientScans(patientId);

  const labOptions: SearchComboboxOption[] = useMemo(() => {
    const items = labsData?.items;
    if (!items || !Array.isArray(items)) return [];
    return items.map((l) => ({
      value: l._id,
      label: l.name,
      description: l.city || undefined,
    }));
  }, [labsData?.items]);

  const typeOptions: SearchComboboxOption[] = useMemo(() => {
    const items = typesData?.items;
    if (!items || !Array.isArray(items)) return [];
    return items.map((item) => {
      const name = item.name;
      const label = typeof name === 'string' ? name : (name?.en ?? '');
      const catSlug = normCategory(item.category);
      return {
        value: item._id,
        label,
        description: t(`labOrderTypes.category.${catSlug}`),
      };
    });
  }, [typesData?.items, t]);

  const scanOptions: SearchComboboxOption[] = useMemo(() => {
    if (!patientScans || !Array.isArray(patientScans)) return [];
    return patientScans.map((s) => ({
      value: s._id,
      label: s.scanNumber,
      description: [s.scanType?.replace(/_/g, ' '), s.scannerModel].filter(Boolean).join(' · '),
    }));
  }, [patientScans]);

  useEffect(() => {
    if (open) {
      setPatientId(defaultPatientId ?? '');
      setDoctorId('');
      setBranchId('');
      setDentalLabId('');
      setLabOrderTypeId('');
      setToothNumbers('');
      setShade('');
      setMaterial('');
      setDescription('');
      setSpecialInstructions('');
      setExpectedDeliveryDate('');
      setCost('');
      setScanId('');
    }
  }, [open, defaultPatientId]);

  const handleSubmit = useCallback(async () => {
    if (!patientId || !doctorId || !branchId || !dentalLabId || !labOrderTypeId) return;

    const teeth = toothNumbers
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Partial<LabOrder> & Record<string, unknown> = {
      patientId,
      doctorId,
      branchId,
      dentalLabId,
      labOrderTypeId,
      scanId: scanId || undefined,
      toothNumbers: teeth as unknown as number[],
      shade: shade.trim() || undefined,
      material: material.trim() || undefined,
      description: description.trim() || undefined,
      specialInstructions: specialInstructions.trim() || undefined,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      cost: cost ? Number(cost) : 0,
    };

    try {
      await createMutation.mutateAsync(payload);
      onOpenChange(false);
    } catch {
      // toast handled by mutation
    }
  }, [
    patientId,
    doctorId,
    branchId,
    dentalLabId,
    labOrderTypeId,
    scanId,
    toothNumbers,
    shade,
    material,
    description,
    specialInstructions,
    expectedDeliveryDate,
    cost,
    createMutation,
    onOpenChange,
  ]);

  const isPending = createMutation.isPending;
  const isValid = patientId && doctorId && branchId && dentalLabId && labOrderTypeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('labOrders.form.createTitle')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Row 1: Patient + Doctor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labOrders.form.patient')} *</Label>
              <PatientCombobox
                value={patientId}
                onValueChange={setPatientId}
                disabled={!!defaultPatientId}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('labOrders.form.doctor')} *</Label>
              <DoctorCombobox value={doctorId} onValueChange={setDoctorId} />
            </div>
          </div>

          {/* Row 2: Branch + Dental Lab */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labOrders.form.branch')} *</Label>
              <BranchCombobox value={branchId} onValueChange={setBranchId} />
            </div>
            <div className="space-y-2">
              <Label>{t('labOrders.form.dentalLab')} *</Label>
              <SearchCombobox
                options={labOptions}
                value={dentalLabId}
                onValueChange={setDentalLabId}
                placeholder={t('labOrders.form.selectLab')}
                searchPlaceholder={t('labOrders.form.searchLab')}
                emptyMessage={t('labOrders.form.noLabsFound')}
              />
            </div>
          </div>

          {/* Row 3: Order Type */}
          <div className="space-y-2">
            <Label>{t('labOrders.form.orderType')} *</Label>
            <SearchCombobox
              options={typeOptions}
              value={labOrderTypeId}
              onValueChange={setLabOrderTypeId}
              placeholder={t('labOrders.form.selectType')}
              searchPlaceholder={t('labOrders.form.searchType')}
              emptyMessage={t('labOrders.form.noTypesFound')}
            />
          </div>

          {/* Row 4: Tooth Numbers */}
          <div className="space-y-2">
            <Label>{t('labOrders.form.toothNumbers')}</Label>
            <Input
              value={toothNumbers}
              onChange={(e) => setToothNumbers(e.target.value)}
              placeholder="11, 12, 21"
            />
            <p className="text-xs text-muted-foreground">{t('labOrders.form.toothNumbersHint')}</p>
          </div>

          {/* Row 5: Shade + Material */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labOrders.form.shade')}</Label>
              <SearchCombobox
                options={SHADE_OPTIONS}
                value={shade}
                onValueChange={setShade}
                placeholder={t('labOrders.form.selectShade')}
                searchPlaceholder={t('labOrders.form.searchShade')}
                emptyMessage={t('labOrders.form.noShadesFound')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('labOrders.form.material')}</Label>
              <SearchCombobox
                options={MATERIAL_OPTIONS}
                value={material}
                onValueChange={setMaterial}
                placeholder={t('labOrders.form.selectMaterial')}
                searchPlaceholder={t('labOrders.form.searchMaterial')}
                emptyMessage={t('labOrders.form.noMaterialsFound')}
              />
            </div>
          </div>

          {/* Row 6: 3D Scan (filtered by patient) */}
          {patientId && (
            <div className="space-y-2">
              <Label>{t('labOrders.form.scan')}</Label>
              <SearchCombobox
                options={scanOptions}
                value={scanId}
                onValueChange={setScanId}
                placeholder={t('labOrders.form.selectScan')}
                searchPlaceholder={t('labOrders.form.searchScan')}
                emptyMessage={t('labOrders.form.noScansFound')}
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>{t('labOrders.form.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('labOrders.form.descriptionPlaceholder')}
              rows={2}
            />
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label>{t('labOrders.form.specialInstructions')}</Label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder={t('labOrders.form.specialInstructionsPlaceholder')}
              rows={2}
            />
          </div>

          {/* Expected Delivery + Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labOrders.form.expectedDelivery')}</Label>
              <Input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('labOrders.form.cost')}</Label>
              <Input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !isValid}>
            {isPending ? t('common.actions.saving') : t('common.actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
