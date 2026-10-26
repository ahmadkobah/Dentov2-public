/**
 * CustomFieldCard — Displays a single custom field definition
 *
 * Shows field key, label, type, entity, status, and action buttons.
 * Drag-and-drop enabled via @dnd-kit/sortable for reordering.
 */

import { type CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Switch,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@dento/ui';
import {
  GripVertical,
  Pencil,
  Trash2,
  Type,
  Hash,
  CalendarDays,
  ToggleLeft,
  List,
  ListChecks,
  AlignLeft,
  Mail,
  Phone,
  Globe,
  Eye,
  FileText,
} from 'lucide-react';
import type { CustomField, CustomFieldType } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Field type icon + label mapping                                    */
/* ------------------------------------------------------------------ */

const FIELD_TYPE_CONFIG: Record<
  CustomFieldType,
  { icon: typeof Type; label: string; color: string }
> = {
  text: {
    icon: Type,
    label: 'Text',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  number: {
    icon: Hash,
    label: 'Number',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  date: {
    icon: CalendarDays,
    label: 'Date',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  boolean: {
    icon: ToggleLeft,
    label: 'Boolean',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  select: {
    icon: List,
    label: 'Select',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  },
  multiselect: {
    icon: ListChecks,
    label: 'Multi-Select',
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  },
  textarea: {
    icon: AlignLeft,
    label: 'Textarea',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  },
  phone: {
    icon: Phone,
    label: 'Phone',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
  url: {
    icon: Globe,
    label: 'URL',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  },
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CustomFieldCardProps {
  field: CustomField;
  onEdit: (field: CustomField) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CustomFieldCard({
  field,
  onEdit,
  onToggle,
  onDelete,
  isDragging,
}: CustomFieldCardProps) {
  const typeConfig = FIELD_TYPE_CONFIG[field.type];
  const TypeIcon = typeConfig.icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: field._id });

  const dragging = isDragging || sortableIsDragging;

  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
    opacity: dragging ? 0.5 : 1,
    zIndex: dragging ? 10 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-shadow ${dragging ? 'shadow-lg ring-2 ring-blue-400' : 'hover:shadow-md'} ${!field.isActive ? 'opacity-60' : ''}`}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {/* Drag handle */}
        <div
          className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Type icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${typeConfig.color}`}
        >
          <TypeIcon className="h-5 w-5" />
        </div>

        {/* Field info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {field.label.en}
            </h4>
            {field.label.ar && (
              <span className="truncate text-xs text-gray-500 dark:text-gray-400" dir="rtl">
                {field.label.ar}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {field.fieldKey}
            </code>
            <Badge variant="secondary" className="text-xs">
              {typeConfig.label}
            </Badge>
            {field.isRequired && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
            {field.showInList && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs">
                      <Eye className="me-1 h-3 w-3" />
                      List
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Visible in list/table views</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {field.showInForm && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="me-1 h-3 w-3" />
                      Form
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Visible in forms</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {field.options && field.options.length > 0 && (
              <span className="text-xs text-gray-500">
                {field.options.length} option{field.options.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Sort order indicator */}
        <span className="text-xs text-gray-400">#{field.sortOrder}</span>

        {/* Active toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Switch
                  checked={field.isActive}
                  onCheckedChange={(checked) => onToggle(field._id, checked)}
                  aria-label={`Toggle ${field.label.en}`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>{field.isActive ? 'Deactivate' : 'Activate'} field</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(field)} aria-label="Edit field">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(field._id)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
            aria-label="Delete field"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
