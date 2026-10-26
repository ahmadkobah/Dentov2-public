import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useDoctorDetail, useUpdateDoctor, useDeleteDoctor } from '../hooks/useDoctors.js';
import DoctorForm from '../components/DoctorForm.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  ConfirmDialog,
  toast,
} from '@dento/ui';
import { ArrowLeft, Trash2, Mail, Phone } from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: doctor, isLoading, isError, error, refetch } = useDoctorDetail(id!);
  const updateMutation = useUpdateDoctor(id!);
  const deleteMutation = useDeleteDoctor();

  const handleSave = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        await updateMutation.mutateAsync(data);
        toast.success(t('doctors.toast.profileUpdated'));
      } catch {
        toast.error(t('doctors.toast.profileUpdateFailed'));
      }
    },
    [updateMutation],
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync(id!);
      toast.success(t('doctors.toast.removed'));
      navigate('/doctors');
    } catch {
      toast.error(t('doctors.toast.removeFailed'));
    } finally {
      setShowDeleteConfirm(false);
    }
  }, [deleteMutation, id, navigate]);

  if (isLoading) return <TableSkeleton columns={1} rows={6} />;
  if (isError)
    return (
      <ErrorState
        title={t('doctors.error.loadFailed')}
        message={error?.message}
        onRetry={refetch}
      />
    );
  if (!doctor) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/doctors')}>
            <ArrowLeft className="me-1 h-4 w-4" />
            {t('doctors.common.back')}
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {doctor.avatarUrl && <AvatarImage src={doctor.avatarUrl} alt={doctor.firstName} />}
              <AvatarFallback
                className="text-sm font-medium"
                style={doctor.color ? { backgroundColor: doctor.color, color: '#fff' } : {}}
              >
                {doctor.firstName[0]}
                {doctor.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">
                {doctor.title && `${doctor.title} `}
                {doctor.firstName} {doctor.lastName}
              </h1>
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {doctor.email}
                </span>
                {doctor.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {doctor.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Badge variant={doctor.isActive ? 'default' : 'destructive'}>
            {doctor.isActive ? t('doctors.status.active') : t('doctors.status.inactive')}
          </Badge>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 className="me-1 h-4 w-4" />
          {t('doctors.actions.removeDoctor')}
        </Button>
      </div>

      {/* Edit Form */}
      <DoctorForm doctor={doctor} onSave={handleSave} isPending={updateMutation.isPending} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('doctors.confirmations.removeTitle')}
        description={`${t('doctors.confirmations.removeDescriptionPermanent')} ${doctor.title ?? ''} ${doctor.firstName} ${doctor.lastName}.`}
        confirmLabel={t('doctors.actions.remove')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
