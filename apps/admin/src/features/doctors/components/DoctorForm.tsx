import { useState, useEffect } from 'react';
import type { Doctor } from '../hooks/useDoctors.js';
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Separator,
  Badge,
  toast,
} from '@dento/ui';
import { Save, X } from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';

interface DoctorFormProps {
  doctor: Doctor;
  onSave: (data: Partial<Doctor>) => Promise<void>;
  isPending: boolean;
}

const SPECIALIZATIONS = [
  'General Dentist',
  'Orthodontist',
  'Periodontist',
  'Endodontist',
  'Prosthodontist',
  'Oral Surgeon',
  'Pediatric Dentist',
  'Cosmetic Dentist',
  'Implantologist',
];

const TITLES = ['Dr.', 'Prof.', 'Assoc. Prof.'];

const COLOR_OPTIONS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
  '#14b8a6',
];

export default function DoctorForm({ doctor, onSave, isPending }: DoctorFormProps) {
  const { data: branches } = useActiveBranches();
  const { t } = useTranslation();

  const [title, setTitle] = useState(doctor.title ?? '');
  const [specialization, setSpecialization] = useState(doctor.specialization);
  const [licenseNumber, setLicenseNumber] = useState(doctor.licenseNumber ?? '');
  const [bio, setBio] = useState(doctor.bio ?? '');
  const [selectedBranches, setSelectedBranches] = useState<string[]>(doctor.branches ?? []);
  const [primaryBranchId, setPrimaryBranchId] = useState(doctor.primaryBranchId ?? '');
  const [defaultSlotDuration, setDefaultSlotDuration] = useState(doctor.defaultSlotDuration);
  const [bufferBetweenSlots, setBufferBetweenSlots] = useState(doctor.bufferBetweenSlots);
  const [isAcceptingNewPatients, setIsAcceptingNewPatients] = useState(
    doctor.isAcceptingNewPatients,
  );
  const [isOnlineBookingEnabled, setIsOnlineBookingEnabled] = useState(
    doctor.isOnlineBookingEnabled,
  );
  const [maxDailyPatients, setMaxDailyPatients] = useState(doctor.maxDailyPatients ?? 0);
  const [color, setColor] = useState(doctor.color ?? '');
  const [displayOrder, setDisplayOrder] = useState(doctor.displayOrder);
  const [customSpecialization, setCustomSpecialization] = useState('');

  useEffect(() => {
    if (!SPECIALIZATIONS.includes(doctor.specialization)) {
      setCustomSpecialization(doctor.specialization);
      setSpecialization('__custom__');
    }
  }, [doctor.specialization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSpec = specialization === '__custom__' ? customSpecialization : specialization;
    if (!finalSpec) {
      toast.error(t('doctors.form.specializationRequired'));
      return;
    }
    await onSave({
      title: title || undefined,
      specialization: finalSpec,
      licenseNumber: licenseNumber || undefined,
      bio: bio || undefined,
      branches: selectedBranches,
      primaryBranchId: primaryBranchId || undefined,
      defaultSlotDuration,
      bufferBetweenSlots,
      isAcceptingNewPatients,
      isOnlineBookingEnabled,
      maxDailyPatients: maxDailyPatients || undefined,
      color: color || undefined,
      displayOrder,
    });
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((b) => b !== branchId) : [...prev, branchId],
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Professional Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('doctors.form.professionalInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">{t('doctors.form.title')}</Label>
              <Select value={title} onValueChange={setTitle}>
                <SelectTrigger>
                  <SelectValue placeholder={t('doctors.form.selectTitle')} />
                </SelectTrigger>
                <SelectContent>
                  {TITLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">{t('doctors.form.specialization')} *</Label>
              <Select value={specialization} onValueChange={(v) => setSpecialization(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('doctors.form.selectSpecialization')} />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALIZATIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">{t('doctors.form.otherCustom')}</SelectItem>
                </SelectContent>
              </Select>
              {specialization === '__custom__' && (
                <Input
                  placeholder="Enter specialization"
                  value={customSpecialization}
                  onChange={(e) => setCustomSpecialization(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">{t('doctors.form.licenseNumber')}</Label>
              <Input
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. LIC-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayOrder">{t('doctors.form.displayOrder')}</Label>
              <Input
                id="displayOrder"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t('doctors.form.bio')}</Label>
            <textarea
              id="bio"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief professional bio..."
              maxLength={2000}
            />
          </div>
        </CardContent>
      </Card>

      {/* Branches */}
      <Card>
        <CardHeader>
          <CardTitle>{t('doctors.form.branchAssignment')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {branches && branches.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {branches.map((b) => (
                  <Badge
                    key={b._id}
                    variant={selectedBranches.includes(b._id) ? 'default' : 'outline'}
                    className="cursor-pointer px-3 py-1.5 text-sm"
                    onClick={() => toggleBranch(b._id)}
                  >
                    {typeof b.name === 'object' ? b.name.en : b.name}
                    {selectedBranches.includes(b._id) && <X className="ms-1 h-3 w-3" />}
                  </Badge>
                ))}
              </div>

              {selectedBranches.length > 1 && (
                <div className="space-y-2">
                  <Label>{t('doctors.form.primaryBranch')}</Label>
                  <Select value={primaryBranchId} onValueChange={setPrimaryBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('doctors.form.selectPrimaryBranch')} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedBranches.map((id) => {
                        const branch = branches.find((b) => b._id === id);
                        return (
                          <SelectItem key={id} value={id}>
                            {branch
                              ? typeof branch.name === 'object'
                                ? branch.name.en
                                : branch.name
                              : id}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t('doctors.form.noBranches')}</p>
          )}
        </CardContent>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle>{t('doctors.form.schedulingSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('doctors.form.defaultSlotDuration')}</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={defaultSlotDuration}
                onChange={(e) => setDefaultSlotDuration(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('doctors.form.bufferBetweenSlots')}</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={bufferBetweenSlots}
                onChange={(e) => setBufferBetweenSlots(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('doctors.form.maxDailyPatients')}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={maxDailyPatients}
                onChange={(e) => setMaxDailyPatients(Number(e.target.value))}
                placeholder="No limit"
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('doctors.form.acceptingNewPatients')}</Label>
                <p className="text-muted-foreground text-xs">
                  {t('doctors.form.acceptingNewPatientsDesc')}
                </p>
              </div>
              <Switch
                checked={isAcceptingNewPatients}
                onCheckedChange={setIsAcceptingNewPatients}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('doctors.form.onlineBookingEnabled')}</Label>
                <p className="text-muted-foreground text-xs">
                  {t('doctors.form.onlineBookingEnabledDesc')}
                </p>
              </div>
              <Switch
                checked={isOnlineBookingEnabled}
                onCheckedChange={setIsOnlineBookingEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>{t('doctors.form.appearance')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('doctors.form.calendarColor')}</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    color === c
                      ? 'scale-110 border-white ring-2 ring-offset-2'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              {color && (
                <button
                  type="button"
                  className="text-muted-foreground flex h-8 items-center px-2 text-xs hover:underline"
                  onClick={() => setColor('')}
                >
                  {t('doctors.form.clear')}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          <Save className="me-2 h-4 w-4" />
          {isPending ? t('doctors.form.saving') : t('doctors.form.saveChanges')}
        </Button>
      </div>
    </form>
  );
}
