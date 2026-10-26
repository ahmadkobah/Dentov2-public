/**
 * ToothSelector — Interactive mini dental chart for picking tooth numbers.
 * Wraps react-odontogram in selection mode and reports selected FDI numbers.
 */

import { useCallback, useMemo, useState } from 'react';
import { Odontogram, type ToothConditionGroup } from 'react-odontogram';
import 'react-odontogram/style.css';
import { useThemeStore } from '@/stores/theme.store.js';
import { cn, Button, Badge, Popover, PopoverTrigger, PopoverContent } from '@dento/ui';
import { X } from 'lucide-react';

interface ToothSelectorProps {
  /** Currently selected tooth numbers (FDI notation, e.g. ["11","21","36"]) */
  value: string[];
  /** Called when selection changes */
  onValueChange: (teeth: string[]) => void;
  className?: string;
  disabled?: boolean;
}

/** Convert our stored FDI numbers to the internal key format react-odontogram uses */
function toOdontogramKey(fdi: string): string {
  const q = fdi.charAt(0);
  const t = fdi.slice(1);
  const prefix: Record<string, string> = { '1': 'UR', '2': 'UL', '3': 'LL', '4': 'LR' };
  return `${prefix[q] ?? 'UR'}${t}`;
}

/** Convert react-odontogram internal key back to FDI */
function toFdi(key: string): string {
  const prefix = key.slice(0, 2);
  const num = key.slice(2);
  const quadrant: Record<string, string> = { UR: '1', UL: '2', LL: '3', LR: '4' };
  return `${quadrant[prefix] ?? '1'}${num}`;
}

export function ToothSelector({ value, onValueChange, className, disabled }: ToothSelectorProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const [open, setOpen] = useState(false);

  const defaultSelected = useMemo(() => value.map(toOdontogramKey), [value]);

  const selectedConditions: ToothConditionGroup[] = useMemo(() => {
    if (!value.length) return [];
    return [
      {
        label: 'selected',
        teeth: value.map(toOdontogramKey),
        fillColor: isDark ? '#60a5fa' : '#3b82f6',
        outlineColor: isDark ? '#93c5fd' : '#1d4ed8',
      },
    ];
  }, [value, isDark]);

  const handleChange = useCallback(
    (selected: { id: string; notations: { fdi: string } }[]) => {
      const fdiNumbers = selected.map((t) => {
        return t.notations?.fdi || toFdi(t.id);
      });
      // Defer to avoid setState-during-render when Odontogram processes defaultSelected
      queueMicrotask(() => onValueChange(fdiNumbers));
    },
    [onValueChange],
  );

  const removeTooth = useCallback(
    (tooth: string) => {
      onValueChange(value.filter((t) => t !== tooth));
    },
    [value, onValueChange],
  );

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-start font-normal"
            disabled={disabled}
          >
            {value.length > 0
              ? `${value.length} tooth${value.length > 1 ? '' : ''} selected`
              : 'Click to select teeth...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-105 p-3" align="start">
          <p className="mb-2 text-xs text-muted-foreground">
            Click teeth to select / deselect (FDI notation)
          </p>
          <div className="tooth-selector-chart">
            <Odontogram
              notation="FDI"
              theme={isDark ? 'dark' : 'light'}
              defaultSelected={defaultSelected}
              onChange={handleChange}
              showLabels
              showTooltip
              layout="square"
              teethConditions={selectedConditions}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected teeth badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pe-1">
              {t}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTooth(t)}
                  className="rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
