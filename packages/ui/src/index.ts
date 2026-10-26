// @dento/ui — Shared UI Components (Shadcn/Radix + TailAdmin)
// ─────────────────────────────────────────────────────────────────────

// ── PDF: SaaS Invoice (shared by admin + developer) ────────────────
export {
  SaaSInvoicePDFDoc,
  SaaSInvoiceDownloadButton,
  generateSaaSInvoicePdfBlob,
  buildSaaSInvoicePdfLabels,
  defaultSaaSInvoicePdfLabels,
  type SaaSInvoicePDFDocProps,
  type SaaSInvoiceDownloadButtonProps,
  type SaaSInvoiceForPdf,
  type SaaSInvoiceLineItem,
  type SaaSInvoiceItemType,
  type SaaSInvoiceTenantInfo,
  type SaaSInvoicePlatformInfo,
  type SaaSInvoicePdfLabels,
} from './saas-invoice-pdf.js';

// ── Primitives ──────────────────────────────────────────────────────

export { Button, type ButtonProps, buttonVariants } from './primitives/Button.js';
export { Input, type InputProps } from './primitives/Input.js';
export { Label } from './primitives/Label.js';
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './primitives/Card.js';
export { Badge, type BadgeProps, badgeVariants } from './primitives/Badge.js';
export { Separator } from './primitives/Separator.js';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './primitives/Select.js';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalClose,
} from './primitives/Modal.js';

// New primitives (Phase 2.5)
export { Checkbox } from './primitives/Checkbox.js';
export { Switch } from './primitives/Switch.js';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './primitives/Tabs.js';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './primitives/DropdownMenu.js';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './primitives/Tooltip.js';
export { Avatar, AvatarImage, AvatarFallback } from './primitives/Avatar.js';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './primitives/Popover.js';
export { ScrollArea, ScrollBar } from './primitives/ScrollArea.js';
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './primitives/Accordion.js';
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './primitives/AlertDialog.js';
export { Textarea } from './primitives/Textarea.js';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './primitives/Table.js';
export { Skeleton } from './primitives/Skeleton.js';
export { Progress, type ProgressProps } from './primitives/Progress.js';
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './primitives/Command.js';
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './primitives/InputOTP.js';
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './primitives/Sheet.js';
export { Toaster, toast } from './primitives/Toaster.js';
export { Calendar, type CalendarProps } from './primitives/Calendar.js';

// ── Composites ──────────────────────────────────────────────────────

export {
  ClinicHeader,
  type ClinicHeaderProps,
  type ClinicHeaderBranding,
  type ClinicHeaderDoctor,
} from './composites/ClinicHeader.js';
export { PageHeader, type PageHeaderProps } from './composites/PageHeader.js';
export { StatCard, type StatCardProps, type StatVariant } from './composites/StatCard.js';
export { EmptyState, type EmptyStateProps } from './composites/EmptyState.js';
export { FormField, type FormFieldProps } from './composites/FormField.js';
export { ConfirmDialog, type ConfirmDialogProps } from './composites/ConfirmDialog.js';
export {
  SearchCombobox,
  type SearchComboboxProps,
  type SearchComboboxOption,
} from './composites/SearchCombobox.js';
export {
  MultiSelectCombobox,
  type MultiSelectComboboxProps,
  type MultiSelectOption,
} from './composites/MultiSelectCombobox.js';
export {
  DataTable,
  type DataTableProps,
  type ColumnDef,
  type SortDirection,
} from './composites/DataTable.js';
export { PhoneInput, type PhoneInputProps } from './composites/PhoneInput.js';
export {
  COUNTRIES,
  getFlagEmoji,
  findCountryByIso,
  detectCountryFromPhone,
  CURRENCY_TO_COUNTRY,
  type Country,
} from './data/countries.js';

// ── Utils ───────────────────────────────────────────────────────────

export { cn } from './utils/cn.js';
