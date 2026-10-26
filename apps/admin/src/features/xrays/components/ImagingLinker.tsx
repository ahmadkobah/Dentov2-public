/**
 * ImagingLinker — Reusable component for linking X-Rays / CBCTs
 * to Treatment Plans, Procedure Notes, Dental Chart entries.
 *
 * Per DENTO_V2_MASTER_PLAN.md §17 — Clinical Cross-Linking:
 * "ImagingLinker: reusable React component that lets clinicians
 *  browse unlinked images, preview thumbnails, and attach them
 *  to the current treatment plan / procedure note / chart entry."
 *
 * Usage:
 *   <ImagingLinker
 *     patientId="..."
 *     targetType="treatmentPlan" | "procedureNote" | "dentalChart"
 *     targetId="..."
 *     onLink={(xrayIds, cbctIds) => ...}
 *   />
 */

import { useState, useCallback } from 'react';
import { useTranslation } from '@/stores/locale.store.js';
import { useUnlinkedXrays, type Xray } from '@/features/xrays/hooks/useXrays.js';
import { useUnlinkedCbcts, type CbctOrder } from '@/features/cbct/hooks/useCbct.js';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  toast,
} from '@dento/ui';
import { Link2, Image, CheckCircle, ScanLine } from 'lucide-react';
import { formatDate } from '@/lib/date.js';

export interface ImagingLinkerProps {
  patientId: string;
  targetType: 'treatmentPlan' | 'procedureNote' | 'dentalChart';
  targetId: string;
  targetItemId?: string; // e.g. treatmentPlanItemId
  onLink: (xrayIds: string[], cbctIds: string[]) => Promise<void>;
  className?: string;
}

export function ImagingLinker({ patientId, targetType, onLink, className }: ImagingLinkerProps) {
  const { data: unlinkedXrays = [], isLoading: xraysLoading } = useUnlinkedXrays(patientId);
  const { data: unlinkedCbcts = [], isLoading: cbctsLoading } = useUnlinkedCbcts(patientId);
  const { t } = useTranslation();
  const [selectedXrays, setSelectedXrays] = useState<Set<string>>(new Set());
  const [selectedCbcts, setSelectedCbcts] = useState<Set<string>>(new Set());
  const [linking, setLinking] = useState(false);

  const toggleXray = useCallback((id: string) => {
    setSelectedXrays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCbct = useCallback((id: string) => {
    setSelectedCbcts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalSelected = selectedXrays.size + selectedCbcts.size;

  const handleLink = useCallback(async () => {
    if (totalSelected === 0) return;
    setLinking(true);
    try {
      await onLink(Array.from(selectedXrays), Array.from(selectedCbcts));
      setSelectedXrays(new Set());
      setSelectedCbcts(new Set());
      toast.success(`${totalSelected} ${t('xrays.linkerToast.linkedSuccess')}`);
    } catch {
      toast.error(t('xrays.linkerToast.linkFailed'));
    } finally {
      setLinking(false);
    }
  }, [selectedXrays, selectedCbcts, totalSelected, onLink]);

  const targetLabel =
    targetType === 'treatmentPlan'
      ? t('xrays.linker.targetLabels.treatmentPlan')
      : targetType === 'procedureNote'
        ? t('xrays.linker.targetLabels.procedureNote')
        : t('xrays.linker.targetLabels.dentalChart');

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          {t('xrays.linker.titlePrefix')} {targetLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="xrays">
          <TabsList className="mb-3 w-full">
            <TabsTrigger value="xrays" className="flex-1">
              {t('xrays.linker.tabs.xrays')}
              {unlinkedXrays.length > 0 && (
                <Badge variant="secondary" className="ms-1.5 text-[10px]">
                  {unlinkedXrays.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cbct" className="flex-1">
              {t('xrays.linker.tabs.cbct')}
              {unlinkedCbcts.length > 0 && (
                <Badge variant="secondary" className="ms-1.5 text-[10px]">
                  {unlinkedCbcts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── X-Rays Tab ──────────────────────────────── */}
          <TabsContent value="xrays">
            {xraysLoading ? (
              <div className="text-muted-foreground py-4 text-center text-sm">
                {t('xrays.linker.loadingXrays')}
              </div>
            ) : unlinkedXrays.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center text-sm">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {t('xrays.linker.allXraysLinked')}
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {unlinkedXrays.map((xray: Xray) => (
                    <div
                      key={xray._id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors ${
                        selectedXrays.has(xray._id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleXray(xray._id)}
                    >
                      <Checkbox
                        checked={selectedXrays.has(xray._id)}
                        onCheckedChange={() => toggleXray(xray._id)}
                      />

                      {/* Thumbnail */}
                      <div className="bg-muted flex h-12 w-12 flex-shrink-0 items-center justify-center rounded">
                        {xray.thumbnailUrl ? (
                          <img
                            src={xray.thumbnailUrl}
                            alt={xray.title}
                            className="h-full w-full rounded object-cover"
                          />
                        ) : (
                          <Image className="text-muted-foreground h-6 w-6" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{xray.title}</div>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {xray.xrayType}
                          </Badge>
                          {xray.toothNumbers?.length > 0 && (
                            <span>
                              {t('xrays.linker.teethPrefix')} {xray.toothNumbers.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-muted-foreground text-xs">
                        {formatDate(xray.capturedAt || xray.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ── CBCT Tab ────────────────────────────────── */}
          <TabsContent value="cbct">
            {cbctsLoading ? (
              <div className="text-muted-foreground py-4 text-center text-sm">
                {t('xrays.linker.loadingCbct')}
              </div>
            ) : unlinkedCbcts.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center text-sm">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {t('xrays.linker.allCbctLinked')}
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {unlinkedCbcts.map((order: CbctOrder) => (
                    <div
                      key={order._id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors ${
                        selectedCbcts.has(order._id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleCbct(order._id)}
                    >
                      <Checkbox
                        checked={selectedCbcts.has(order._id)}
                        onCheckedChange={() => toggleCbct(order._id)}
                      />

                      {/* Icon */}
                      <div className="bg-muted flex h-12 w-12 flex-shrink-0 items-center justify-center rounded">
                        <ScanLine className="text-muted-foreground h-6 w-6" />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          CBCT #{order.orderNumber}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {order.status}
                          </Badge>
                          {order.clinicalPurpose && (
                            <span className="capitalize">{order.clinicalPurpose}</span>
                          )}
                        </div>
                        {order.indication && (
                          <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
                            {order.indication}
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div className="text-muted-foreground text-xs">
                        {formatDate(order.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Link Action Bar ──────────────────────────── */}
        {(unlinkedXrays.length > 0 || unlinkedCbcts.length > 0) && (
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="text-muted-foreground text-sm">
              {totalSelected} {t('xrays.linker.selectedCount')}
              {selectedXrays.size > 0 && ` (${selectedXrays.size} ${t('xrays.linker.xrayCount')})`}
              {selectedCbcts.size > 0 && ` (${selectedCbcts.size} ${t('xrays.linker.cbctCount')})`}
            </span>
            <Button size="sm" onClick={handleLink} disabled={totalSelected === 0 || linking}>
              <Link2 className="me-2 h-4 w-4" />
              {linking
                ? t('xrays.linker.linking')
                : `${t('xrays.linker.linkButton')} ${totalSelected} ${t('xrays.linker.imagesSuffix')}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
