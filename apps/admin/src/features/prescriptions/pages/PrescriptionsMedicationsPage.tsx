/**
 * Prescriptions & Medications — merged page with card-based tab switching.
 * Per DENTO_V2_MASTER_PLAN.md §10 (Module #10).
 */

import { FileText, Pill } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent, PageHeader } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';
import PrescriptionListPage from './PrescriptionListPage.js';
import MedicationListPage from '../../medications/pages/MedicationListPage.js';

export default function PrescriptionsMedicationsPage() {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="prescriptions">
      <div className="space-y-4 px-6 pt-6">
        <PageHeader title={t('prescriptions.title')} description={t('prescriptions.subtitle')} />
        <TabsList>
          <TabsTrigger value="prescriptions" className="gap-1">
            <FileText className="h-4 w-4" />
            {t('prescriptions.tab.prescriptions')}
          </TabsTrigger>
          <TabsTrigger value="medications" className="gap-1">
            <Pill className="h-4 w-4" />
            {t('prescriptions.tab.medications')}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="prescriptions" className="mt-0">
        <PrescriptionListPage />
      </TabsContent>
      <TabsContent value="medications" className="mt-0">
        <MedicationListPage />
      </TabsContent>
    </Tabs>
  );
}
