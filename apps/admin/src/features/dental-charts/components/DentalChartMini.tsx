/**
 * DentalChartMini — Reusable small read-only odontogram for embedding.
 * Per IMPLEMENTATION_ROADMAP Week 10 — "<DentalChartMini> für Treatment Plans + Patient Overview".
 *
 * Uses react-odontogram in readOnly mode with compact styling.
 */

import { useMemo } from 'react';
import { Odontogram, type ToothConditionGroup } from 'react-odontogram';
import 'react-odontogram/style.css';
import { useThemeStore } from '@/stores/theme.store.js';
import { cn } from '@dento/ui';

// ── Condition → color mapping ────────────────────────────────

const CONDITION_FILL: Record<string, string> = {
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

const CONDITION_OUTLINE: Record<string, string> = {
  cavity: '#b91c1c',
  crown: '#a16207',
  bridge: '#c2410c',
  implant: '#1d4ed8',
  missing: '#6b7280',
  rct: '#7e22ce',
  filling: '#0891b2',
  extraction_needed: '#be123c',
  periodontal: '#92400e',
  veneer: '#4338ca',
  temporary: '#475569',
  pontic: '#0d9488',
};

// ── Types ────────────────────────────────────────────────────

interface ChartEntry {
  toothNumber: number;
  condition: string;
}

interface DentalChartMiniProps {
  entries: ChartEntry[];
  className?: string;
  showHalf?: 'upper' | 'lower' | 'full';
  /** Highlight specific teeth (e.g. from treatment plan items) */
  highlightTeeth?: string[];
}

// ── Component ────────────────────────────────────────────────

export function DentalChartMini({
  entries,
  className,
  showHalf = 'full',
  highlightTeeth,
}: DentalChartMiniProps) {
  const isDark = useThemeStore((s) => s.isDark);

  const teethConditions: ToothConditionGroup[] = useMemo(() => {
    // Group entries by condition
    const grouped = new Map<string, string[]>();
    for (const entry of entries) {
      if (entry.condition === 'healthy') continue;
      const teeth = grouped.get(entry.condition) ?? [];
      teeth.push(String(entry.toothNumber));
      grouped.set(entry.condition, teeth);
    }

    const groups: ToothConditionGroup[] = [];
    for (const [condition, teeth] of grouped) {
      groups.push({
        label: condition.replace(/_/g, ' '),
        teeth,
        fillColor: CONDITION_FILL[condition] ?? '#9ca3af',
        outlineColor: CONDITION_OUTLINE[condition] ?? '#6b7280',
      });
    }

    // Add highlight group if specified
    if (highlightTeeth && highlightTeeth.length > 0) {
      groups.push({
        label: 'highlighted',
        teeth: highlightTeeth,
        fillColor: '#fbbf24',
        outlineColor: '#d97706',
      });
    }

    return groups;
  }, [entries, highlightTeeth]);

  return (
    <div className={cn('dental-chart-mini', className)}>
      <Odontogram
        notation="FDI"
        theme={isDark ? 'dark' : 'light'}
        teethConditions={teethConditions}
        readOnly
        showLabels
        showHalf={showHalf}
      />
    </div>
  );
}
