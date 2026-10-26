/**
 * DentalChartPrint — Printable HTML with legend + summary + notes.
 * Per IMPLEMENTATION_ROADMAP Week 10 — "Druckbares HTML mit Legend + Summary + Notes".
 *
 * Rendered inside a hidden wrapper and triggered via window.print().
 */

import { forwardRef } from 'react';
import { DentalChartMini } from './DentalChartMini.js';
import { useTranslation } from '@/stores/locale.store.js';
import type { DentalChartEntry, ChartHistorySnapshot } from '../hooks/useDentalCharts.js';
import { formatDate, formatDateTime } from '@/lib/date.js';

// ── Condition Legend ──────────────────────────────────────────

const CONDITION_LEGEND: Record<string, string> = {
  healthy: '#22c55e',
  cavity: '#ef4444',
  crown: '#eab308',
  bridge: '#f97316',
  implant: '#3b82f6',
  missing: '#9ca3af',
  rct: '#a855f7',
  filling: '#06b6d4',
  extraction_needed: '#f43f5e',
  periodontal: '#d97706',
  veneer: '#6366f1',
  temporary: '#64748b',
  pontic: '#14b8a6',
};

// ── Props ────────────────────────────────────────────────────

interface DentalChartPrintProps {
  entries: DentalChartEntry[];
  patientName?: string;
  lastSnapshot?: ChartHistorySnapshot | null;
}

// ── Component ────────────────────────────────────────────────

export const DentalChartPrint = forwardRef<HTMLDivElement, DentalChartPrintProps>(
  function DentalChartPrint({ entries, patientName, lastSnapshot }, ref) {
    const { t } = useTranslation();
    const condKey = (c: string) =>
      `dentalCharts.condition.${c.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase())}`;
    const conditionSummary = new Map<string, number>();
    for (const entry of entries) {
      conditionSummary.set(entry.condition, (conditionSummary.get(entry.condition) ?? 0) + 1);
    }

    return (
      <div ref={ref} className="print-only p-8 space-y-6 bg-white text-black">
        {/* Header */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold">{t('dentalCharts.print.title')}</h1>
          {patientName && <p className="text-lg mt-1">{patientName}</p>}
          <p className="text-sm text-gray-500">
            {t('dentalCharts.print.generated')} {formatDate(new Date().toISOString())}{' '}
            {t('dentalCharts.print.at')} {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Chart */}
        <div className="flex justify-center">
          <DentalChartMini entries={entries} className="w-full max-w-2xl" />
        </div>

        {/* Legend */}
        <div>
          <h2 className="text-lg font-semibold mb-2">{t('dentalCharts.print.legend')}</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(CONDITION_LEGEND).map(([cond, color]) => (
              <div key={cond} className="flex items-center gap-1.5 text-sm">
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-gray-300"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize">{t(condKey(cond))}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h2 className="text-lg font-semibold mb-2">{t('dentalCharts.print.summary')}</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-start py-1 font-medium">
                  {t('dentalCharts.print.summaryColCondition')}
                </th>
                <th className="text-start py-1 font-medium">
                  {t('dentalCharts.print.summaryColCount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...conditionSummary.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([cond, count]) => (
                  <tr key={cond} className="border-b border-gray-100">
                    <td className="py-1 capitalize">{t(condKey(cond))}</td>
                    <td className="py-1">{count}</td>
                  </tr>
                ))}
              <tr className="font-medium border-t">
                <td className="py-1">{t('dentalCharts.print.totalTeethCharted')}</td>
                <td className="py-1">{entries.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tooth Details */}
        <div>
          <h2 className="text-lg font-semibold mb-2">{t('dentalCharts.print.toothDetails')}</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-start py-1 font-medium">
                  {t('dentalCharts.print.colToothNumber')}
                </th>
                <th className="text-start py-1 font-medium">
                  {t('dentalCharts.print.colCondition')}
                </th>
                <th className="text-start py-1 font-medium">
                  {t('dentalCharts.print.colSurfaces')}
                </th>
                <th className="text-start py-1 font-medium">{t('dentalCharts.print.colNotes')}</th>
              </tr>
            </thead>
            <tbody>
              {entries
                .sort((a, b) => a.toothNumber - b.toothNumber)
                .map((entry) => (
                  <tr key={entry._id} className="border-b border-gray-100">
                    <td className="py-1">{entry.toothNumber}</td>
                    <td className="py-1 capitalize">{t(condKey(entry.condition))}</td>
                    <td className="py-1">{entry.surfaces.join(', ') || '\u2014'}</td>
                    <td className="py-1">{entry.notes || '\u2014'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Last Snapshot Note */}
        {lastSnapshot?.notes && (
          <div>
            <h2 className="text-lg font-semibold mb-2">
              {t('dentalCharts.print.latestSnapshotNotes')}
            </h2>
            <p className="text-sm">{lastSnapshot.notes}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t('dentalCharts.print.recorded')} {formatDateTime(lastSnapshot.recordedAt)}
            </p>
          </div>
        )}
      </div>
    );
  },
);
