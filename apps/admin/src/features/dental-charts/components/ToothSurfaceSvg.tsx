/**
 * 5-Surface Tooth SVG — interactive surface selector for a single tooth.
 * Per IMPLEMENTATION_ROADMAP Week 10 — "5-Surface SVG, Severity, Tooth Notes".
 *
 * Renders Mesial / Distal / Buccal / Lingual / Occlusal as clickable regions.
 */

import { cn } from '@dento/ui';
import { useTranslation } from '@/stores/locale.store.js';

const SURFACE_PATHS: Record<string, string> = {
  occlusal: 'M 30,30 L 70,30 L 70,70 L 30,70 Z',
  mesial: 'M 0,0 L 30,30 L 30,70 L 0,100 Z',
  distal: 'M 100,0 L 70,30 L 70,70 L 100,100 Z',
  buccal: 'M 0,0 L 100,0 L 70,30 L 30,30 Z',
  lingual: 'M 0,100 L 30,70 L 70,70 L 100,100 Z',
};

const SURFACE_LABELS: Record<string, { x: number; y: number; label: string }> = {
  occlusal: { x: 50, y: 53, label: 'O' },
  mesial: { x: 12, y: 53, label: 'M' },
  distal: { x: 88, y: 53, label: 'D' },
  buccal: { x: 50, y: 18, label: 'B' },
  lingual: { x: 50, y: 88, label: 'L' },
};

interface ToothSurfaceSvgProps {
  selected: string[];
  onToggle: (surface: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function ToothSurfaceSvg({
  selected,
  onToggle,
  readOnly = false,
  className,
}: ToothSurfaceSvgProps) {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 100 100" className={cn('w-32 h-32', className)}>
      {Object.entries(SURFACE_PATHS).map(([surface, d]) => {
        const isSelected = selected.includes(surface);
        const label = SURFACE_LABELS[surface];
        return (
          <g key={surface}>
            <path
              d={d}
              className={cn(
                'stroke-border stroke-[1.5] transition-colors cursor-pointer',
                isSelected
                  ? 'fill-primary/60 dark:fill-primary/40'
                  : 'fill-muted hover:fill-accent',
                readOnly && 'cursor-default',
              )}
              onClick={() => !readOnly && onToggle(surface)}
              role="button"
              aria-label={t(`dentalCharts.surface.${surface}`)}
              tabIndex={readOnly ? -1 : 0}
              onKeyDown={(e) => {
                if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onToggle(surface);
                }
              }}
            />
            {label && (
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] fill-foreground font-medium pointer-events-none select-none"
              >
                {label.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
