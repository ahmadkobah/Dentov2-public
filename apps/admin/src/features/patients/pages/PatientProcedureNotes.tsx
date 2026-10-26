import { useProcedureNoteList } from '@/features/procedure-notes/hooks/useProcedureNotes.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';
import { Badge, Card, CardContent } from '@dento/ui';
import { ClipboardList } from 'lucide-react';

export default function PatientProcedureNotes({ patientId }: { patientId: string }) {
  const { t } = useTranslation();
  const { data } = useProcedureNoteList({ patientId });
  const notes = data?.notes ?? [];

  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('patients.procedureNotes.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <Card key={note._id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                {note.procedureName}
              </div>
              {note.teethInvolved && (
                <div className="text-sm text-muted-foreground">Teeth: {note.teethInvolved}</div>
              )}
              <div className="text-xs text-muted-foreground">
                {formatDate(note.createdAt)}
                {note.followUpRequired && note.followUpDate && (
                  <span className="ms-2">· Follow-up: {formatDate(note.followUpDate)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {note.followUpRequired && (
                <Badge variant="outline">{t('patients.procedureNotes.followUp')}</Badge>
              )}
              {note.materialsUsed && (
                <Badge variant="secondary" className="text-xs">
                  {note.materialsUsed.split(',').length} materials
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
