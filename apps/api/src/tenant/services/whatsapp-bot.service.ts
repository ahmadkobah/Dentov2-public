/**
 * WhatsApp Bot Service — Conversational booking flow
 *
 * State-machine driven multi-step dialog:
 *   greeting → select_branch → select_doctor → select_date →
 *   select_time → collect_name → confirm → completed
 *
 * Per BUILD_RULES §5.2 — Service layer (constructor receives Connection)
 */

import type { Connection } from 'mongoose';
import {
  getWhatsAppSessionModel,
  type IWhatsAppSession,
  type BotStep,
} from '../models/whatsapp-session.model.js';
import { BookingService } from './booking.service.js';
import { logger } from '../../utils/logger.js';

// ── Constants ───────────────────────────────────────────────

/** Session TTL: 30 minutes of inactivity */
const SESSION_TTL_MS = 30 * 60 * 1000;

/** Default slot duration for booking */
const DEFAULT_DURATION_MINUTES = 30;

// ── Bilingual Messages ──────────────────────────────────────

const MSG = {
  en: {
    welcome:
      '👋 Welcome to our dental clinic! I can help you book an appointment.\n\nPlease select your language:\n1️⃣ English\n2️⃣ العربية\n\nType *cancel* at any time to start over.',
    selectBranch: (branches: string) =>
      `🏥 Please select a branch:\n\n${branches}\n\nReply with the number of your choice.`,
    selectDoctor: (doctors: string) =>
      `👨‍⚕️ Please select a doctor:\n\n${doctors}\n\nReply with the number of your choice.`,
    selectDate:
      '📅 Please enter your preferred date.\n\nFormat: YYYY-MM-DD (e.g., 2025-01-20)\n\nOnly future dates are accepted.',
    selectTime: (slots: string) =>
      `⏰ Available time slots:\n\n${slots}\n\nReply with the number of your choice.`,
    noSlots: '😔 No available slots for this date. Please try another date (YYYY-MM-DD).',
    collectName: '📝 Please enter your full name (first and last name).',
    confirm: (summary: string) =>
      `✅ Please confirm your booking:\n\n${summary}\n\nReply *yes* to confirm or *no* to cancel.`,
    completed:
      '🎉 Your appointment has been booked successfully! You will receive a confirmation shortly.\n\nType *hi* to book another appointment.',
    completedPending:
      '📋 Your booking request has been submitted and is awaiting confirmation from the clinic.\n\nType *hi* to book another appointment.',
    cancelled: '❌ Booking cancelled. Type *hi* to start a new booking.',
    invalidChoice: '⚠️ Invalid choice. Please reply with a valid number from the list.',
    invalidDate: '⚠️ Invalid date format. Please use YYYY-MM-DD (e.g., 2025-01-20).',
    pastDate: '⚠️ Please select a future date.',
    invalidName: '⚠️ Please enter your first and last name (e.g., John Smith).',
    error: '😔 Something went wrong. Please type *hi* to try again.',
    sessionExpired: '⏰ Your session has expired. Type *hi* to start a new booking.',
    noBranches:
      '😔 No branches are currently available for online booking. Please try again later.',
    noDoctors: '😔 No doctors are available at this branch. Please select another branch.',
  },
  ar: {
    welcome:
      '👋 مرحباً بك في عيادتنا! يمكنني مساعدتك في حجز موعد.\n\nاختر لغتك:\n1️⃣ English\n2️⃣ العربية\n\nاكتب *إلغاء* في أي وقت للبدء من جديد.',
    selectBranch: (branches: string) => `🏥 اختر الفرع:\n\n${branches}\n\nأرسل رقم اختيارك.`,
    selectDoctor: (doctors: string) => `👨‍⚕️ اختر الطبيب:\n\n${doctors}\n\nأرسل رقم اختيارك.`,
    selectDate:
      '📅 أدخل التاريخ المفضل.\n\nالصيغة: YYYY-MM-DD (مثال: 2025-01-20)\n\nيُقبل فقط تاريخ مستقبلي.',
    selectTime: (slots: string) => `⏰ المواعيد المتاحة:\n\n${slots}\n\nأرسل رقم اختيارك.`,
    noSlots: '😔 لا توجد مواعيد متاحة في هذا التاريخ. جرب تاريخاً آخر (YYYY-MM-DD).',
    collectName: '📝 أدخل اسمك الكامل (الاسم الأول واسم العائلة).',
    confirm: (summary: string) =>
      `✅ تأكيد الحجز:\n\n${summary}\n\nأرسل *نعم* للتأكيد أو *لا* للإلغاء.`,
    completed: '🎉 تم حجز موعدك بنجاح! ستتلقى تأكيداً قريباً.\n\nاكتب *مرحبا* لحجز موعد آخر.',
    completedPending:
      '📋 تم تقديم طلب حجزك وهو بانتظار تأكيد العيادة.\n\nاكتب *مرحبا* لحجز موعد آخر.',
    cancelled: '❌ تم إلغاء الحجز. اكتب *مرحبا* لبدء حجز جديد.',
    invalidChoice: '⚠️ اختيار غير صالح. أرسل رقماً صحيحاً من القائمة.',
    invalidDate: '⚠️ صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD (مثال: 2025-01-20).',
    pastDate: '⚠️ اختر تاريخاً مستقبلياً.',
    invalidName: '⚠️ أدخل اسمك الأول واسم العائلة (مثال: أحمد محمد).',
    error: '😔 حدث خطأ. اكتب *مرحبا* للمحاولة مرة أخرى.',
    sessionExpired: '⏰ انتهت صلاحية جلستك. اكتب *مرحبا* لبدء حجز جديد.',
    noBranches: '😔 لا توجد فروع متاحة حالياً للحجز عبر الإنترنت. حاول لاحقاً.',
    noDoctors: '😔 لا يوجد أطباء متاحون في هذا الفرع. اختر فرعاً آخر.',
  },
} as const;

// ── Helper Functions ────────────────────────────────────────

function isCancelCommand(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return ['cancel', 'إلغاء', 'الغاء'].includes(lower);
}

function isGreetingCommand(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return ['hi', 'hello', 'hey', 'start', 'book', 'مرحبا', 'مرحباً', 'أهلا', 'اهلا', 'حجز'].includes(
    lower,
  );
}

function isValidDateFormat(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text.trim());
}

function isFutureDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  return date >= today && !isNaN(date.getTime());
}

function formatNumberedList(items: Array<{ label: string }>, startIdx = 1): string {
  return items.map((item, i) => `${i + startIdx}️⃣ ${item.label}`).join('\n');
}

// ── Service ─────────────────────────────────────────────────

export class WhatsAppBotService {
  private readonly WhatsAppSession;
  private readonly bookingService: BookingService;

  constructor(tenantDb: Connection) {
    this.WhatsAppSession = getWhatsAppSessionModel(tenantDb);
    this.bookingService = new BookingService(tenantDb);
  }

  /**
   * Process an incoming message and return the bot reply.
   */
  async handleMessage(phone: string, text: string): Promise<string> {
    const trimmed = text.trim();

    try {
      // Check for greeting/restart command
      if (isGreetingCommand(trimmed)) {
        return this.startNewSession(phone);
      }

      // Get existing session
      const session = await this.WhatsAppSession.findOne({ phone });

      // No session — prompt to start
      if (!session) {
        return MSG.en.welcome;
      }

      // Check for cancel command
      if (isCancelCommand(trimmed)) {
        await this.WhatsAppSession.deleteOne({ phone });
        const msg = MSG[session.language];
        return msg.cancelled;
      }

      // Route to step handler
      return this.processStep(session, trimmed);
    } catch (err) {
      logger.error({ err, phone }, 'WhatsApp bot error');
      return MSG.en.error;
    }
  }

  // ── Session Management ──────────────────────────────────

  private async startNewSession(phone: string): Promise<string> {
    await this.WhatsAppSession.deleteOne({ phone });
    await this.WhatsAppSession.create({
      phone,
      step: 'greeting',
      language: 'en',
      data: {},
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    return MSG.en.welcome;
  }

  private async updateSession(
    session: IWhatsAppSession,
    update: { step?: BotStep; data?: Partial<IWhatsAppSession['data']>; language?: 'en' | 'ar' },
  ): Promise<IWhatsAppSession> {
    if (update.step) session.step = update.step;
    if (update.language) session.language = update.language;
    if (update.data) {
      session.data = { ...session.data, ...update.data };
    }
    session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await session.save();
    return session;
  }

  // ── Step Router ─────────────────────────────────────────

  private async processStep(session: IWhatsAppSession, text: string): Promise<string> {
    switch (session.step) {
      case 'greeting':
        return this.handleGreeting(session, text);
      case 'select_branch':
        return this.handleBranchSelection(session, text);
      case 'select_doctor':
        return this.handleDoctorSelection(session, text);
      case 'select_date':
        return this.handleDateSelection(session, text);
      case 'select_time':
        return this.handleTimeSelection(session, text);
      case 'collect_name':
        return this.handleNameCollection(session, text);
      case 'confirm':
        return this.handleConfirmation(session, text);
      case 'completed':
      case 'cancelled':
        return this.startNewSession(session.phone);
      default:
        return MSG.en.error;
    }
  }

  // ── Step Handlers ───────────────────────────────────────

  /** Greeting — language selection */
  private async handleGreeting(session: IWhatsAppSession, text: string): Promise<string> {
    const choice = parseInt(text, 10);
    const lang = choice === 2 ? 'ar' : 'en';
    await this.updateSession(session, { language: lang });

    // Fetch branches and move to branch selection
    return this.showBranches(session);
  }

  /** Fetch branches and present numbered list */
  private async showBranches(session: IWhatsAppSession): Promise<string> {
    const branches = await this.bookingService.listPublicBranches();

    if (!branches || branches.length === 0) {
      const msg = MSG[session.language];
      await this.WhatsAppSession.deleteOne({ phone: session.phone });
      return msg.noBranches;
    }

    const branchList = branches.map((b) => ({
      id: b._id.toString(),
      name: (b.name as { en?: string; ar?: string })?.en || 'Branch',
    }));

    await this.updateSession(session, {
      step: 'select_branch',
      data: { branches: branchList },
    });

    const msg = MSG[session.language];
    const listStr = formatNumberedList(branchList.map((b) => ({ label: b.name })));
    return msg.selectBranch(listStr);
  }

  /** Branch selection by number */
  private async handleBranchSelection(session: IWhatsAppSession, text: string): Promise<string> {
    const msg = MSG[session.language];
    const choice = parseInt(text, 10);
    const branches = session.data.branches || [];

    if (isNaN(choice) || choice < 1 || choice > branches.length) {
      return msg.invalidChoice;
    }

    const selected = branches[choice - 1];
    await this.updateSession(session, {
      data: { branchId: selected.id, branchName: selected.name },
    });

    // Fetch doctors for the selected branch
    return this.showDoctors(session, selected.id);
  }

  /** Fetch doctors and present numbered list */
  private async showDoctors(session: IWhatsAppSession, branchId: string): Promise<string> {
    const doctors = await this.bookingService.listPublicDoctors(branchId);
    const msg = MSG[session.language];

    if (!doctors || doctors.length === 0) {
      // Go back to branch selection
      return this.showBranches(session);
    }

    const doctorList = doctors.map((d) => ({
      id: (d._id as { toString(): string }).toString(),
      name: `${d.firstName} ${d.lastName}`,
    }));

    await this.updateSession(session, {
      step: 'select_doctor',
      data: { doctors: doctorList },
    });

    const listStr = formatNumberedList(doctorList.map((d) => ({ label: d.name })));
    return msg.selectDoctor(listStr);
  }

  /** Doctor selection by number */
  private async handleDoctorSelection(session: IWhatsAppSession, text: string): Promise<string> {
    const msg = MSG[session.language];
    const choice = parseInt(text, 10);
    const doctors = session.data.doctors || [];

    if (isNaN(choice) || choice < 1 || choice > doctors.length) {
      return msg.invalidChoice;
    }

    const selected = doctors[choice - 1];
    await this.updateSession(session, {
      step: 'select_date',
      data: { doctorId: selected.id, doctorName: selected.name },
    });

    return msg.selectDate;
  }

  /** Date input and slot lookup */
  private async handleDateSelection(session: IWhatsAppSession, text: string): Promise<string> {
    const msg = MSG[session.language];
    const dateStr = text.trim();

    if (!isValidDateFormat(dateStr)) {
      return msg.invalidDate;
    }

    if (!isFutureDate(dateStr)) {
      return msg.pastDate;
    }

    // Get available slots
    const slotResult = await this.bookingService.getAvailableSlots({
      branchId: session.data.branchId!,
      doctorId: session.data.doctorId!,
      date: dateStr,
      durationMinutes: DEFAULT_DURATION_MINUTES,
    });

    const availableSlots =
      (
        slotResult as {
          slots?: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
        }
      ).slots?.filter((s) => s.isAvailable) || [];

    if (availableSlots.length === 0) {
      return msg.noSlots;
    }

    const slotList = availableSlots.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    await this.updateSession(session, {
      step: 'select_time',
      data: { date: dateStr, slots: slotList },
    });

    const listStr = formatNumberedList(
      slotList.map((s) => ({ label: `${s.startTime} — ${s.endTime}` })),
    );
    return msg.selectTime(listStr);
  }

  /** Time slot selection by number */
  private async handleTimeSelection(session: IWhatsAppSession, text: string): Promise<string> {
    const msg = MSG[session.language];
    const choice = parseInt(text, 10);
    const slots = session.data.slots || [];

    if (isNaN(choice) || choice < 1 || choice > slots.length) {
      return msg.invalidChoice;
    }

    const selected = slots[choice - 1];
    await this.updateSession(session, {
      step: 'collect_name',
      data: {
        startTime: selected.startTime,
        endTime: selected.endTime,
        durationMinutes: DEFAULT_DURATION_MINUTES,
      },
    });

    return msg.collectName;
  }

  /** Collect patient name */
  private async handleNameCollection(session: IWhatsAppSession, text: string): Promise<string> {
    const msg = MSG[session.language];
    const parts = text.trim().split(/\s+/);

    if (parts.length < 2) {
      return msg.invalidName;
    }

    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    await this.updateSession(session, {
      step: 'confirm',
      data: { firstName, lastName, contactPhone: session.phone },
    });

    // Build confirmation summary
    const d = session.data;
    const summary = [
      `🏥 ${session.language === 'ar' ? 'الفرع' : 'Branch'}: ${d.branchName}`,
      `👨‍⚕️ ${session.language === 'ar' ? 'الطبيب' : 'Doctor'}: ${d.doctorName}`,
      `📅 ${session.language === 'ar' ? 'التاريخ' : 'Date'}: ${d.date}`,
      `⏰ ${session.language === 'ar' ? 'الوقت' : 'Time'}: ${d.startTime} — ${d.endTime}`,
      `📝 ${session.language === 'ar' ? 'الاسم' : 'Name'}: ${firstName} ${lastName}`,
    ].join('\n');

    return msg.confirm(summary);
  }

  /** Booking confirmation */
  private async handleConfirmation(session: IWhatsAppSession, text: string): Promise<string> {
    const msg = MSG[session.language];
    const lower = text.toLowerCase().trim();

    const yesWords = ['yes', 'y', 'نعم', 'اي', 'أي', 'ايوه'];
    const noWords = ['no', 'n', 'لا'];

    if (noWords.includes(lower)) {
      await this.WhatsAppSession.deleteOne({ phone: session.phone });
      return msg.cancelled;
    }

    if (!yesWords.includes(lower)) {
      return msg.invalidChoice;
    }

    // Create booking via BookingService
    const d = session.data;
    const result = await this.bookingService.createBooking({
      branchId: d.branchId!,
      doctorId: d.doctorId!,
      date: d.date!,
      startTime: d.startTime!,
      endTime: d.endTime!,
      durationMinutes: d.durationMinutes || DEFAULT_DURATION_MINUTES,
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.contactPhone || session.phone,
      preferredLanguage: session.language,
    });

    // Mark session as completed
    await this.updateSession(session, { step: 'completed' });

    return result.isAutoConfirmed ? msg.completed : msg.completedPending;
  }
}
