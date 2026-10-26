/**
 * PatientInfoTab — Inline-editable patient info with family links section.
 */

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { updatePatientSchema, type UpdatePatientInput } from '@dento/shared';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Badge,
  toast,
  PhoneInput,
} from '@dento/ui';
import { useTenantCountry } from '@/hooks/useTenantCountry.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Loader2,
  Users,
  ExternalLink,
} from 'lucide-react';
import {
  useUpdatePatient,
  type PatientDetail,
  type PopulatedFamilyMember,
} from '../hooks/usePatients.js';
import { PatientCombobox } from '@/components/entity-selectors/PatientCombobox.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

// ── Helpers ─────────────────────────────────────────────────

function toDateInput(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

function getFamilyMember(link: PatientDetail['familyLinks'][number]) {
  if (typeof link.relatedPatientId === 'object' && link.relatedPatientId !== null) {
    return link.relatedPatientId as PopulatedFamilyMember;
  }
  return null;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: 'Spouse',
  parent: 'Parent',
  child: 'Child',
  sibling: 'Sibling',
};

// ── Component ───────────────────────────────────────────────

interface PatientInfoTabProps {
  patient: PatientDetail;
}

export function PatientInfoTab({ patient }: PatientInfoTabProps) {
  const navigate = useNavigate();
  const tenantCountry = useTenantCountry();
  const { isMultiLang } = useSupportedLanguages();
  const updateMutation = useUpdatePatient(patient._id);
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useTranslation();

  // Family link add state
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [newFamilyPatientId, setNewFamilyPatientId] = useState('');
  const [newFamilyRelationship, setNewFamilyRelationship] = useState<string>('spouse');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<UpdatePatientInput>({
    resolver: zodFormResolver(updatePatientSchema),
    defaultValues: patientToFormValues(patient),
  });

  // Reset form when patient data changes
  useEffect(() => {
    reset(patientToFormValues(patient));
  }, [patient, reset]);

  const gender = watch('gender');
  const source = watch('source');
  const preferredLanguage = watch('preferredLanguage');

  const handleCancel = () => {
    reset(patientToFormValues(patient));
    setIsEditing(false);
  };

  const onSubmit = async (data: UpdatePatientInput) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success(t('patients.toast.updated'));
      setIsEditing(false);
    } catch {
      toast.error(t('patients.toast.updateFailed'));
    }
  };

  const handleAddFamilyLink = async () => {
    if (!newFamilyPatientId || !newFamilyRelationship) return;
    if (newFamilyPatientId === patient._id) {
      toast.error(t('patients.family.cannotLinkSelf'));
      return;
    }
    // Check if already linked
    const existingIds = (patient.familyLinks ?? []).map((fl) => {
      const member = getFamilyMember(fl);
      return member ? member._id : String(fl.relatedPatientId);
    });
    if (existingIds.includes(newFamilyPatientId)) {
      toast.error(t('patients.family.alreadyLinked'));
      return;
    }

    const newLinks = [
      ...(patient.familyLinks ?? []).map((fl) => ({
        relatedPatientId:
          typeof fl.relatedPatientId === 'object' ? fl.relatedPatientId._id : fl.relatedPatientId,
        relationship: fl.relationship as 'spouse' | 'parent' | 'child' | 'sibling',
        isPrimaryContact: fl.isPrimaryContact,
        isEmergencyContact: fl.isEmergencyContact,
        isFinancialResponsible: fl.isFinancialResponsible,
      })),
      {
        relatedPatientId: newFamilyPatientId,
        relationship: newFamilyRelationship as 'spouse' | 'parent' | 'child' | 'sibling',
        isPrimaryContact: false,
        isEmergencyContact: false,
        isFinancialResponsible: false,
      },
    ];

    try {
      await updateMutation.mutateAsync({ familyLinks: newLinks });
      toast.success(t('patients.family.linked'));
      setNewFamilyPatientId('');
      setNewFamilyRelationship('spouse');
      setShowAddFamily(false);
    } catch {
      toast.error('Failed to add family link');
    }
  };

  const handleRemoveFamilyLink = async (linkId: string) => {
    const filtered = (patient.familyLinks ?? [])
      .filter((fl) => fl._id !== linkId)
      .map((fl) => ({
        relatedPatientId:
          typeof fl.relatedPatientId === 'object' ? fl.relatedPatientId._id : fl.relatedPatientId,
        relationship: fl.relationship as 'spouse' | 'parent' | 'child' | 'sibling',
        isPrimaryContact: fl.isPrimaryContact,
        isEmergencyContact: fl.isEmergencyContact,
        isFinancialResponsible: fl.isFinancialResponsible,
      }));

    try {
      await updateMutation.mutateAsync({ familyLinks: filtered });
      toast.success(t('patients.family.removed'));
    } catch {
      toast.error('Failed to remove family link');
    }
  };

  return (
    <div className="space-y-6">
      {/* Edit / Save Controls */}
      <div className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button variant="outline" size="sm" onClick={handleCancel} className="gap-1.5">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={updateMutation.isPending || !isDirty}
              onClick={handleSubmit(onSubmit)}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t('patients.form.save')}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-1.5"
          >
            <Edit className="h-4 w-4" />
            {t('patients.info.editProfile')}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* ── Personal Information ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName.en" className="text-xs">
                        First Name (EN) *
                      </Label>
                      <Input id="firstName.en" {...register('firstName.en')} />
                      {errors.firstName?.en && (
                        <p className="mt-1 text-xs text-red-500">{errors.firstName.en.message}</p>
                      )}
                    </div>
                    {isMultiLang && (
                      <div>
                        <Label htmlFor="firstName.ar" className="text-xs">
                          First Name (AR)
                        </Label>
                        <Input id="firstName.ar" dir="rtl" {...register('firstName.ar')} />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="lastName.en" className="text-xs">
                        Last Name (EN) *
                      </Label>
                      <Input id="lastName.en" {...register('lastName.en')} />
                      {errors.lastName?.en && (
                        <p className="mt-1 text-xs text-red-500">{errors.lastName.en.message}</p>
                      )}
                    </div>
                    {isMultiLang && (
                      <div>
                        <Label htmlFor="lastName.ar" className="text-xs">
                          Last Name (AR)
                        </Label>
                        <Input id="lastName.ar" dir="rtl" {...register('lastName.ar')} />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="dateOfBirth" className="text-xs">
                        Date of Birth *
                      </Label>
                      <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                      {errors.dateOfBirth && (
                        <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="gender" className="text-xs">
                        Gender *
                      </Label>
                      <Select
                        value={gender}
                        onValueChange={(v) =>
                          setValue('gender', v as UpdatePatientInput['gender'], {
                            shouldDirty: true,
                          })
                        }
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="nationalId" className="text-xs">
                      National ID
                    </Label>
                    <Input id="nationalId" {...register('nationalId')} />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow
                    icon={<User className="h-4 w-4" />}
                    label="Full Name"
                    value={`${patient.firstName.en} ${patient.lastName.en}`}
                  />
                  {isMultiLang && patient.firstName.ar && (
                    <InfoRow
                      label="Name (Arabic)"
                      value={`${patient.firstName.ar} ${patient.lastName.ar || ''}`}
                    />
                  )}
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Date of Birth"
                    value={formatDate(patient.dateOfBirth)}
                  />
                  <InfoRow label="Gender" value={patient.gender} />
                  {patient.nationalId && <InfoRow label="National ID" value={patient.nationalId} />}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Contact Information ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <>
                  <div>
                    <Label htmlFor="phone" className="text-xs">
                      Phone *
                    </Label>
                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          defaultCountry={tenantCountry}
                        />
                      )}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs">
                      Email
                    </Label>
                    <Input id="email" type="email" {...register('email')} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="address" className="text-xs">
                        Address
                      </Label>
                      <Input id="address" {...register('address')} />
                    </div>
                    <div>
                      <Label htmlFor="city" className="text-xs">
                        City
                      </Label>
                      <Input id="city" {...register('city')} />
                    </div>
                    <div>
                      <Label htmlFor="country" className="text-xs">
                        Country
                      </Label>
                      <Input id="country" {...register('country')} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={patient.phone}
                  />
                  <InfoRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={patient.email || '—'}
                  />
                  <InfoRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Address"
                    value={
                      [patient.address, patient.city, patient.country].filter(Boolean).join(', ') ||
                      '—'
                    }
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Emergency Contact ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="emergencyContactName" className="text-xs">
                      Name
                    </Label>
                    <Input id="emergencyContactName" {...register('emergencyContactName')} />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContactPhone" className="text-xs">
                      Phone
                    </Label>
                    <Controller
                      name="emergencyContactPhone"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          defaultCountry={tenantCountry}
                        />
                      )}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <InfoRow
                    icon={<User className="h-4 w-4" />}
                    label="Name"
                    value={patient.emergencyContactName || '—'}
                  />
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={patient.emergencyContactPhone || '—'}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Record Info ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <>
                  <InfoRow label="Patient Code" value={patient.patientCode} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="source" className="text-xs">
                        Source
                      </Label>
                      <Select
                        value={source}
                        onValueChange={(v) =>
                          setValue('source', v as UpdatePatientInput['source'], {
                            shouldDirty: true,
                          })
                        }
                      >
                        <SelectTrigger id="source">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="walk_in">Walk-In</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="preferredLanguage" className="text-xs">
                        Preferred Language
                      </Label>
                      <Select
                        value={preferredLanguage}
                        onValueChange={(v) =>
                          setValue('preferredLanguage', v as 'en' | 'ar', { shouldDirty: true })
                        }
                      >
                        <SelectTrigger id="preferredLanguage">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-xs">
                      Notes
                    </Label>
                    <Textarea id="notes" rows={3} {...register('notes')} />
                  </div>
                </>
              ) : (
                <>
                  <InfoRow label="Patient Code" value={patient.patientCode} />
                  <InfoRow label="Source" value={(patient.source ?? '').replace('_', ' ')} />
                  <InfoRow
                    label="Preferred Language"
                    value={patient.preferredLanguage === 'ar' ? 'Arabic' : 'English'}
                  />
                  <InfoRow label="Status" value={patient.isActive ? 'Active' : 'Inactive'} />
                  <InfoRow label="Registered" value={formatDate(patient.createdAt)} />
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Notes (view-only card, shown when not editing and has notes) ── */}
          {!isEditing && patient.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                  {patient.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </form>

      {/* ── Family Links Section ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Family Members
            {(patient.familyLinks?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ms-1">
                {patient.familyLinks.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowAddFamily(!showAddFamily)}
          >
            {showAddFamily ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddFamily ? 'Cancel' : 'Add Family Member'}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Add family member form */}
          {showAddFamily && (
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-gray-50 p-3 dark:bg-gray-800/50">
              <div className="min-w-[220px] flex-1">
                <Label className="mb-1 text-xs">Patient</Label>
                <PatientCombobox value={newFamilyPatientId} onValueChange={setNewFamilyPatientId} />
              </div>
              <div className="w-[140px]">
                <Label className="mb-1 text-xs">Relationship</Label>
                <Select value={newFamilyRelationship} onValueChange={setNewFamilyRelationship}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleAddFamilyLink}
                disabled={!newFamilyPatientId || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Link
              </Button>
            </div>
          )}

          {/* Family members list */}
          {(patient.familyLinks?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No family members linked yet.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {patient.familyLinks.map((link) => {
                const member = getFamilyMember(link);
                return (
                  <div
                    key={link._id}
                    className="flex items-center justify-between p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        {member ? (
                          <>
                            <p className="text-sm font-medium">
                              {member.firstName.en} {member.lastName.en}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {member.patientCode} · {member.phone}
                            </p>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {String(link.relatedPatientId)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {RELATIONSHIP_LABELS[link.relationship] || link.relationship}
                      </Badge>
                      {link.isEmergencyContact && (
                        <Badge variant="destructive" className="text-[10px]">
                          Emergency
                        </Badge>
                      )}
                      {member && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="View patient"
                          onClick={() => navigate(`/patients/${member._id}`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-7 w-7"
                        title="Remove link"
                        onClick={() => handleRemoveFamilyLink(link._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Info Row (view mode) ────────────────────────────────────

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <span className="mt-0.5 text-gray-400 dark:text-gray-500">{icon}</span>}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm capitalize text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

// ── Form value converter ────────────────────────────────────

function patientToFormValues(p: PatientDetail): UpdatePatientInput {
  return {
    firstName: { en: p.firstName.en, ar: p.firstName.ar || '' },
    lastName: { en: p.lastName.en, ar: p.lastName.ar || '' },
    dateOfBirth: toDateInput(p.dateOfBirth),
    gender: p.gender,
    phone: p.phone,
    email: p.email || '',
    nationalId: p.nationalId || '',
    address: p.address || '',
    city: p.city || '',
    country: p.country || '',
    emergencyContactName: p.emergencyContactName || '',
    emergencyContactPhone: p.emergencyContactPhone || '',
    source: p.source as UpdatePatientInput['source'],
    preferredLanguage: p.preferredLanguage,
    notes: p.notes || '',
  };
}
