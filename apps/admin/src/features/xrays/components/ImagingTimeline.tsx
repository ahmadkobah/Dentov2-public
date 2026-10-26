/**
 * ImagingTimeline — Chronological timeline of all imaging (X-Rays + CBCT)
 * for a patient. Used in Patient Detail → Imaging tab.
 *
 * Per DENTO_V2_MASTER_PLAN.md §17 — Imaging Timeline:
 * "Full chronological imaging history per patient, showing X-Rays
 *  and CBCT scans in a unified timeline with thumbnails, types,
 *  cross-link badges, and comparison capability."
 */

import { useMemo } from 'react';
import { useTranslation } from '@/stores/locale.store.js';
import { usePatientXrayTimeline, type Xray } from '@/features/xrays/hooks/useXrays.js';
import { usePatientCbctTimeline, type CbctOrder } from '@/features/cbct/hooks/useCbct.js';
import { Badge, Card, CardContent, CardHeader, CardTitle, ScrollArea } from '@dento/ui';
import { Image, Box, Link2, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/date.js';

export interface ImagingTimelineProps {
  patientId: string;
  className?: string;
}

interface TimelineItem {
  id: string;
  type: 'xray' | 'cbct';
  title: string;
  subtype: string;
  date: string;
  thumbnailUrl?: string;
  isLinked: boolean;
  toothNumbers?: string[];
  status?: string;
  raw: Xray | CbctOrder;
}

export function ImagingTimeline({ patientId, className }: ImagingTimelineProps) {
  const { data: xrays = [], isLoading: loadingXrays } = usePatientXrayTimeline(patientId);
  const { data: cbcts = [], isLoading: loadingCbcts } = usePatientCbctTimeline(patientId);
  const { t } = useTranslation();

  const isLoading = loadingXrays || loadingCbcts;

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    for (const xray of xrays) {
      items.push({
        id: xray._id,
        type: 'xray',
        title: xray.title,
        subtype: xray.xrayType,
        date: xray.capturedAt || xray.createdAt,
        thumbnailUrl: xray.thumbnailUrl,
        isLinked: !!xray.treatmentPlanId || !!xray.procedureNoteId || !!xray.dentalChartEntryId,
        toothNumbers: xray.toothNumbers,
        raw: xray,
      });
    }

    for (const cbct of cbcts) {
      items.push({
        id: cbct._id,
        type: 'cbct',
        title: cbct.indication,
        subtype: cbct.clinicalPurpose || 'cbct',
        date: cbct.scan?.scanDate || cbct.createdAt,
        isLinked: !!cbct.treatmentPlanId || !!cbct.procedureNoteId,
        status: cbct.status,
        raw: cbct,
      });
    }

    // Sort descending by date
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  }, [xrays, cbcts]);

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};
    for (const item of timeline) {
      const key = new Date(item.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [timeline]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          {t('xrays.timeline.title')}
          <Badge variant="secondary" className="ms-auto">
            {timeline.length} {t('xrays.timeline.total')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {t('xrays.timeline.loading')}
          </div>
        ) : timeline.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            <Image className="mx-auto mb-2 h-8 w-8 opacity-50" />
            {t('xrays.timeline.empty')}
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-6">
              {Object.entries(grouped).map(([month, items]) => (
                <div key={month}>
                  <h4 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
                    {month}
                  </h4>
                  <div className="relative space-y-3 border-s-2 ps-4">
                    {items.map((item) => (
                      <div key={item.id} className="relative">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -start-[21px] top-2 h-2.5 w-2.5 rounded-full border-2 border-background ${
                            item.type === 'xray' ? 'bg-blue-500' : 'bg-purple-500'
                          }`}
                        />

                        <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30">
                          {/* Thumbnail */}
                          <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                className="h-full w-full rounded object-cover"
                              />
                            ) : item.type === 'xray' ? (
                              <Image className="text-muted-foreground h-5 w-5" />
                            ) : (
                              <Box className="text-muted-foreground h-5 w-5" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">{item.title}</span>
                              <Badge
                                variant={item.type === 'xray' ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {item.type === 'xray'
                                  ? t('xrays.timeline.badgeXray')
                                  : t('xrays.timeline.badgeCbct')}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              <span className="capitalize">{item.subtype}</span>
                              {item.toothNumbers?.length ? (
                                <span>
                                  • {t('xrays.timeline.teethPrefix')} {item.toothNumbers.join(', ')}
                                </span>
                              ) : null}
                              {item.status && (
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {item.status}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Cross-link indicator */}
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-muted-foreground text-xs">
                              {formatDate(item.date)}
                            </span>
                            {item.isLinked && (
                              <Badge variant="outline" className="text-[10px]">
                                <Link2 className="me-1 h-3 w-3" />
                                {t('xrays.timeline.linked')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
