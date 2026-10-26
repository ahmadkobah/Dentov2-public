import { useState, useEffect, useCallback } from 'react';
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
  Switch,
} from '@dento/ui';
import { useCreateDentalLab, useUpdateDentalLab } from '../hooks/useDentalLabs.js';
import type { DentalLab } from '../hooks/useDentalLabs.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { Star } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: DentalLab | null;
}

export default function DentalLabDialog({ open, onOpenChange, editItem }: Props) {
  const { t } = useTranslation();
  const createMutation = useCreateDentalLab();
  const updateMutation = useUpdateDentalLab();

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [defaultTurnaroundDays, setDefaultTurnaroundDays] = useState(7);
  const [pricingNotes, setPricingNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setName(editItem.name ?? '');
        setContactPerson(editItem.contactPerson ?? '');
        setPhone(editItem.phone ?? '');
        setEmail(editItem.email ?? '');
        setAddress(editItem.address ?? '');
        setCity(editItem.city ?? '');
        setSpecialtiesInput(editItem.specialties?.join(', ') ?? '');
        setRating(editItem.rating ?? 0);
        setDefaultTurnaroundDays(editItem.defaultTurnaroundDays ?? 7);
        setPricingNotes(editItem.pricingNotes ?? '');
        setIsActive(editItem.isActive ?? true);
      } else {
        setName('');
        setContactPerson('');
        setPhone('');
        setEmail('');
        setAddress('');
        setCity('');
        setSpecialtiesInput('');
        setRating(0);
        setDefaultTurnaroundDays(7);
        setPricingNotes('');
        setIsActive(true);
      }
    }
  }, [open, editItem]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;

    const specialties = specialtiesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      specialties,
      rating: rating > 0 ? rating : undefined,
      defaultTurnaroundDays,
      pricingNotes: pricingNotes.trim() || undefined,
      isActive,
    };

    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem._id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // toast handled by hooks
    }
  }, [
    name,
    contactPerson,
    phone,
    email,
    address,
    city,
    specialtiesInput,
    rating,
    defaultTurnaroundDays,
    pricingNotes,
    isActive,
    editItem,
    createMutation,
    updateMutation,
    onOpenChange,
  ]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editItem ? t('dentalLabs.dialog.editTitle') : t('dentalLabs.dialog.addTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label>{t('dentalLabs.form.name')} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('dentalLabs.form.namePlaceholder')}
            />
          </div>

          {/* Contact Person + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('dentalLabs.form.contactPerson')}</Label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder={t('dentalLabs.form.contactPersonPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('dentalLabs.form.phone')}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 5xxxxxxxx"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>{t('dentalLabs.form.email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lab@example.com"
            />
          </div>

          {/* Address + City */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('dentalLabs.form.address')}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('dentalLabs.form.addressPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('dentalLabs.form.city')}</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('dentalLabs.form.cityPlaceholder')}
              />
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-2">
            <Label>{t('dentalLabs.form.specialties')}</Label>
            <Input
              value={specialtiesInput}
              onChange={(e) => setSpecialtiesInput(e.target.value)}
              placeholder={t('dentalLabs.form.specialtiesPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('dentalLabs.form.specialtiesHint')}</p>
          </div>

          {/* Rating + Turnaround */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('dentalLabs.form.rating')}</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? 0 : star)}
                    className="p-0.5"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('dentalLabs.form.turnaroundDays')}</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={defaultTurnaroundDays}
                onChange={(e) => setDefaultTurnaroundDays(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Pricing Notes */}
          <div className="space-y-2">
            <Label>{t('dentalLabs.form.pricingNotes')}</Label>
            <Textarea
              value={pricingNotes}
              onChange={(e) => setPricingNotes(e.target.value)}
              placeholder={t('dentalLabs.form.pricingNotesPlaceholder')}
              rows={3}
            />
          </div>

          {/* Active toggle */}
          {editItem && (
            <div className="flex items-center justify-between">
              <Label>{t('dentalLabs.form.isActive')}</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending
              ? t('common.actions.saving')
              : editItem
                ? t('common.actions.update')
                : t('common.actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
