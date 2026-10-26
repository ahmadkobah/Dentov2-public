/**
 * DeveloperGuide — Collapsible 6-step walkthrough
 *
 * Per DENTO_V2_MASTER_PLAN §7 — Custom Fields developer guide.
 */

import { useState } from 'react';
import { Card, CardContent, Badge } from '@dento/ui';
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Layers,
  PlusCircle,
  Settings,
  CheckCircle,
  Save,
  GripVertical,
  AlertTriangle,
} from 'lucide-react';

const steps = [
  {
    number: 1,
    title: 'Choose Entity',
    description:
      'Select the entity type this field belongs to (Patient, Appointment, Invoice, etc.)',
    icon: Layers,
  },
  {
    number: 2,
    title: 'Click "+ Add Field"',
    description:
      'Open the field creation form to define a new custom field for the selected entity.',
    icon: PlusCircle,
  },
  {
    number: 3,
    title: 'Set Name & Type',
    description:
      'Give the field a label (bilingual: en/ar), a unique key, and choose its type (Text, Number, Date, Boolean, Select, etc.).',
    icon: Settings,
  },
  {
    number: 4,
    title: 'Configure Options',
    description:
      'Set whether the field is required, provide a default value, add validation rules (min/max, pattern), and configure select options if applicable.',
    icon: CheckCircle,
  },
  {
    number: 5,
    title: 'Save Field',
    description:
      'Save the field definition. It becomes immediately available for all users of this tenant in forms and lists.',
    icon: Save,
  },
  {
    number: 6,
    title: 'Reorder via Drag & Drop',
    description:
      'Drag fields to reorder them. The sort order determines the display sequence in forms and detail views.',
    icon: GripVertical,
  },
] as const;

export function DeveloperGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-start"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Custom Fields Developer Guide
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              6-step walkthrough for creating and managing custom fields
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            6 steps
          </Badge>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-blue-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-blue-600" />
          )}
        </div>
      </button>

      {isOpen && (
        <CardContent className="border-t border-blue-200 pt-4 dark:border-blue-900">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex gap-3 rounded-lg border border-blue-100 bg-white p-3 dark:border-blue-900 dark:bg-blue-950/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <step.icon className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    <span className="me-1 text-blue-500">#{step.number}</span>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-blue-600 dark:text-blue-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Warning about deletion */}
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Warning:</strong> Deleting a custom field permanently removes ALL data stored
              in that field across all records. This action cannot be undone.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
