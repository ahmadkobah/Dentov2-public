// Tenant Models — tenant_{slug} database
// These models are accessed via tenant-specific database connections

export {
  getBranchModel,
  type IBranch,
  type IWorkingHours,
  type IBranchHoliday,
  type ISlotConfig,
  type IOnlineBookingConfig,
  type BranchModel,
} from './branch.model.js';

export {
  getDoctorModel,
  type IDoctor,
  type IDoctorSchedule,
  type IDoctorException,
  type DoctorModel,
} from './doctor.model.js';

// Patient Models
export {
  getPatientModel,
  type IPatient,
  type IAllergy,
  type IMedicalHistory,
  type IFamilyLink,
  type IPatientInsurance,
  type PatientModel,
} from './patient.model.js';

// Appointment Models
export {
  getAppointmentModel,
  type IAppointment,
  type AppointmentModel,
} from './appointment.model.js';

// Appointment Type Models
export {
  getAppointmentTypeModel,
  type IAppointmentType,
  type AppointmentTypeModel,
} from './appointment-type.model.js';

// Walk-in Queue Models
export {
  getWalkInQueueModel,
  type IWalkInQueue,
  type WalkInQueueModel,
} from './walk-in-queue.model.js';

// Notification Models
export {
  createNotificationTemplateModel,
  createNotificationModel,
  createNotificationLogModel,
  createNotificationPreferencesModel,
  createDeviceTokenModel,
  createAlertRuleModel,
  type INotificationTemplateDoc,
  type INotificationDoc,
  type INotificationLogDoc,
  type INotificationPreferencesDoc,
  type IDeviceTokenDoc,
  type IAlertRuleDoc,
} from './notification.model.js';

// Doctor Schedule Models (Week 9)
export {
  getDoctorScheduleModel,
  type IDoctorSchedule as IDoctorScheduleDoc,
  type DoctorScheduleModel,
} from './doctor-schedule.model.js';

// Schedule Exception Models (Week 9)
export {
  getScheduleExceptionModel,
  type IScheduleException,
  type ScheduleExceptionModel,
} from './schedule-exception.model.js';

// Shift Template Models (Week 9)
export {
  getShiftTemplateModel,
  type IShiftTemplate,
  type ShiftTemplateModel,
} from './shift-template.model.js';

// Staff Schedule Models (Week 9)
export {
  getStaffScheduleModel,
  type IStaffSchedule,
  type StaffScheduleModel,
} from './staff-schedule.model.js';

// Leave Models (Week 9)
export { getLeaveTypeModel, type ILeaveType, type LeaveTypeModel } from './leave-type.model.js';

export {
  getLeaveRequestModel,
  type ILeaveRequest,
  type LeaveRequestModel,
} from './leave-request.model.js';

export {
  getLeaveBalanceModel,
  type ILeaveBalance,
  type LeaveBalanceModel,
} from './leave-balance.model.js';

// Attendance Models (Week 9)
export { getAttendanceModel, type IAttendance, type AttendanceModel } from './attendance.model.js';

// Recurring Rule Models
export {
  createRecurringRuleModel,
  createSkippedOccurrenceModel,
  getRecurrenceDescription,
  type IRecurringRuleDoc,
  type ISkippedOccurrenceDoc,
  type RecurringRuleModel,
  type SkippedOccurrenceModel,
} from './recurring-rule.model.js';

// Week 10 — Dental Chart Models
export {
  getDentalChartModel,
  getDentalChartHistoryModel,
  type IDentalChart,
  type IDentalChartHistory,
  type IPerioData,
  type ToothCondition,
  type NumberingSystem,
  type Surface,
  type DentalChartModel,
  type DentalChartHistoryModel,
} from './dental-chart.model.js';

// Week 10 — Treatment Plan Models
export {
  getTreatmentPlanModel,
  type ITreatmentPlan,
  type ITreatmentPlanItem,
  type TreatmentPlanStatus,
  type TreatmentPlanItemStatus,
  type DiscountType,
  type TreatmentPlanModel,
} from './treatment-plan.model.js';

// Week 10 — Procedure Note Models
export {
  getProcedureNoteModel,
  getProcedureNoteTemplateModel,
  type IProcedureNote,
  type IProcedureAttachment,
  type IProcedureNoteTemplate,
  type ProcedureNoteModel,
  type ProcedureNoteTemplateModel,
} from './procedure-note.model.js';

// Week 11 — Medication Model
export { getMedicationModel, type IMedication, type MedicationModel } from './medication.model.js';

// Week 11 — Prescription Model
export {
  getPrescriptionModel,
  type IPrescription,
  type IPrescriptionItem,
  type PrescriptionStatus,
  type PrescriptionModel,
} from './prescription.model.js';

// Week 11 — X-Ray Model
export { getXrayModel, type IXray, type XrayModel } from './xray.model.js';

// Week 11 — CBCT Order Model
export {
  getCbctOrderModel,
  type ICbctOrder,
  type ICbctScan,
  type ICbctReport,
  type CbctOrderStatus,
  type CbctPriority,
  type CbctOrderModel,
} from './cbct-order.model.js';

// Week 11 — X-Ray Type Lookup
export { getXrayTypeModel, type IXrayType, type XrayTypeModel } from './xray-type.model.js';

// Week 11 — CBCT Scan Region Lookup
export {
  getCbctScanRegionModel,
  type ICbctScanRegion,
  type CbctScanRegionModel,
} from './cbct-scan-region.model.js';

// Phase 2 Completion — Lab Order Types + Chair
export {
  getLabOrderTypeModel,
  type ILabOrderType,
  type LabOrderTypeModel,
} from './lab-order-type.model.js';

export { getChairModel, type IChair, type ChairModel } from './chair.model.js';

// Week 12 — Dental Labs + Lab Orders
export { getDentalLabModel, type IDentalLab, type DentalLabModel } from './dental-lab.model.js';

export { getLabOrderModel, type ILabOrder, type LabOrderModel } from './lab-order.model.js';

// Week 12 — Services
export { getServiceModel, type IService, type ServiceModel } from './service.model.js';

// Week 12 — Consent Templates + Forms
export {
  getConsentTemplateModel,
  type IConsentTemplate,
  type ConsentTemplateModel,
} from './consent-template.model.js';

export {
  getConsentFormModel,
  type IConsentForm,
  type ConsentFormModel,
} from './consent-form.model.js';

// Week 12 — Chat Channels + Messages
export {
  getChatChannelModel,
  type IChatChannel,
  type IChannelMember,
  type ILastMessage,
  type ChannelType,
  type ChatChannelModel,
} from './chat-channel.model.js';

export {
  getChatMessageModel,
  type IChatMessage,
  type IChatAttachment,
  type IReadReceipt,
  type IReplyPreview,
  type MessageType,
  type ChatMessageModel,
} from './chat-message.model.js';

// Week 13 — Settings, Audit Logs, Custom Fields, Workflow Rules
export {
  getSettingsModel,
  DEFAULT_SETTINGS,
  type ISettings,
  type SettingsKey,
} from './settings.model.js';

export { getAuditLogModel, type IAuditLog } from './audit-log.model.js';

export { getCustomFieldModel, type ICustomField } from './custom-field.model.js';

export {
  getWorkflowRuleModel,
  getWorkflowExecutionModel,
  type IWorkflowRule,
  type IWorkflowExecution,
} from './workflow-rule.model.js';

// Week 14 — Invoices, Payments, Reconciliation (Phase 4: Financial)
export {
  getInvoiceModel,
  type IInvoice,
  type IInvoiceItem,
  type InvoiceStatus,
  type InvoiceModel,
} from './invoice.model.js';

export {
  getTenantPaymentModel,
  type ITenantPayment,
  type TenantPaymentMethod,
  type TenantPaymentStatus,
  type TenantPaymentModel,
} from './payment.model.js';

export {
  getReconciliationModel,
  type IReconciliation,
  type ReconciliationStatus,
  type ReconciliationModel,
} from './reconciliation.model.js';

// Phase 5 — Inventory Models
export {
  getInventoryCategoryModel,
  INVENTORY_CATEGORY_SEEDS,
  type IInventoryCategory,
  type InventoryCategoryModel,
} from './inventory-category.model.js';

export {
  getInventoryItemModel,
  type IInventoryItem,
  type InventoryUnit,
  type BarcodeType,
  type InventoryItemModel,
} from './inventory-item.model.js';

export {
  getInventoryStockModel,
  type IInventoryStock,
  type IStockBatch,
  type BatchStatus,
  type ValuationMethod,
  type CountResult,
  type InventoryStockModel,
} from './inventory-stock.model.js';

export {
  getInventoryMovementModel,
  type IInventoryMovement,
  type MovementType,
  type MovementReferenceType,
  type InventoryMovementModel,
} from './inventory-movement.model.js';

export {
  getStockTransferModel,
  type IStockTransfer,
  type ITransferItem,
  type TransferStatus,
  type StockTransferModel,
} from './stock-transfer.model.js';

export {
  getStockCountModel,
  type IStockCount,
  type IStockCountItem,
  type IStockCountSummary,
  type StockCountStatus,
  type StockCountType,
  type StockCountModel,
} from './stock-count.model.js';
