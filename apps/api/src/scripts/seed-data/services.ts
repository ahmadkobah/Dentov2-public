/**
 * Dental Services Seed Data
 *
 * 25 common dental services with bilingual names (EN/AR),
 * ADA-style codes, default prices (USD), and durations.
 *
 * Per V2_DECISION_LOG.md — "25 default dental services"
 * Prices are baseline defaults; tenants can override per branch.
 */

// ── Service Seed ────────────────────────────────────────────

export interface ServiceSeed {
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  code: string;
  defaultPrice: number;
  defaultDuration: number; // minutes
  sortOrder: number;
  isActive: boolean;
  category?: string;
}

export const services: ServiceSeed[] = [
  // ── Diagnostic & Preventive ───────────────────────────────
  {
    name: { en: 'Oral Examination', ar: 'فحص الفم' },
    description: { en: 'Comprehensive oral examination', ar: 'فحص شامل للفم والأسنان' },
    code: 'D0150',
    defaultPrice: 50,
    defaultDuration: 20,
    sortOrder: 0,
    isActive: true,
  },
  {
    name: { en: 'Dental X-Ray (Periapical)', ar: 'أشعة سينية (حول الذروة)' },
    description: { en: 'Single periapical radiograph', ar: 'صورة أشعة سينية حول ذروة السن' },
    code: 'D0220',
    defaultPrice: 25,
    defaultDuration: 10,
    sortOrder: 1,
    isActive: true,
  },
  {
    name: { en: 'Panoramic X-Ray', ar: 'أشعة بانورامية' },
    description: { en: 'Panoramic radiographic image', ar: 'صورة أشعة بانورامية' },
    code: 'D0330',
    defaultPrice: 80,
    defaultDuration: 15,
    sortOrder: 2,
    isActive: true,
  },
  {
    name: { en: 'Dental Cleaning (Prophylaxis)', ar: 'تنظيف الأسنان' },
    description: { en: 'Professional teeth cleaning', ar: 'تنظيف أسنان احترافي' },
    code: 'D1110',
    defaultPrice: 80,
    defaultDuration: 45,
    sortOrder: 3,
    isActive: true,
  },
  {
    name: { en: 'Fluoride Treatment', ar: 'علاج الفلورايد' },
    description: {
      en: 'Topical fluoride varnish application',
      ar: 'تطبيق ورنيش الفلورايد الموضعي',
    },
    code: 'D1206',
    defaultPrice: 35,
    defaultDuration: 15,
    sortOrder: 4,
    isActive: true,
  },
  {
    name: { en: 'Dental Sealant (per tooth)', ar: 'حشوة وقائية (لكل سن)' },
    description: { en: 'Pit and fissure sealant per tooth', ar: 'مادة سادة للشقوق لكل سن' },
    code: 'D1351',
    defaultPrice: 40,
    defaultDuration: 15,
    sortOrder: 5,
    isActive: true,
  },

  // ── Restorative ───────────────────────────────────────────
  {
    name: { en: 'Composite Filling (1 surface)', ar: 'حشوة تجميلية (سطح واحد)' },
    description: {
      en: 'Tooth-colored composite filling, one surface',
      ar: 'حشوة كمبوزيت بلون السن، سطح واحد',
    },
    code: 'D2391',
    defaultPrice: 120,
    defaultDuration: 30,
    sortOrder: 6,
    isActive: true,
  },
  {
    name: { en: 'Composite Filling (2 surfaces)', ar: 'حشوة تجميلية (سطحين)' },
    description: {
      en: 'Tooth-colored composite filling, two surfaces',
      ar: 'حشوة كمبوزيت بلون السن، سطحين',
    },
    code: 'D2392',
    defaultPrice: 160,
    defaultDuration: 40,
    sortOrder: 7,
    isActive: true,
  },
  {
    name: { en: 'Composite Filling (3+ surfaces)', ar: 'حشوة تجميلية (3 أسطح أو أكثر)' },
    description: {
      en: 'Tooth-colored composite filling, three or more surfaces',
      ar: 'حشوة كمبوزيت بلون السن، ثلاثة أسطح أو أكثر',
    },
    code: 'D2393',
    defaultPrice: 200,
    defaultDuration: 50,
    sortOrder: 8,
    isActive: true,
  },

  // ── Endodontics ───────────────────────────────────────────
  {
    name: { en: 'Root Canal (Anterior)', ar: 'علاج عصب (أمامي)' },
    description: {
      en: 'Root canal treatment on anterior tooth',
      ar: 'علاج قناة الجذر للسن الأمامي',
    },
    code: 'D3310',
    defaultPrice: 400,
    defaultDuration: 60,
    sortOrder: 9,
    isActive: true,
  },
  {
    name: { en: 'Root Canal (Premolar)', ar: 'علاج عصب (ضاحك)' },
    description: { en: 'Root canal treatment on premolar', ar: 'علاج قناة الجذر للضاحك' },
    code: 'D3320',
    defaultPrice: 500,
    defaultDuration: 75,
    sortOrder: 10,
    isActive: true,
  },
  {
    name: { en: 'Root Canal (Molar)', ar: 'علاج عصب (ضرس)' },
    description: { en: 'Root canal treatment on molar', ar: 'علاج قناة الجذر للضرس' },
    code: 'D3330',
    defaultPrice: 700,
    defaultDuration: 90,
    sortOrder: 11,
    isActive: true,
  },

  // ── Periodontics ──────────────────────────────────────────
  {
    name: { en: 'Scaling & Root Planing (per quadrant)', ar: 'تقليح وكشط الجذر (لكل ربع)' },
    description: { en: 'Deep cleaning per quadrant', ar: 'تنظيف عميق لكل ربع من الفم' },
    code: 'D4341',
    defaultPrice: 150,
    defaultDuration: 45,
    sortOrder: 12,
    isActive: true,
  },
  {
    name: { en: 'Periodontal Maintenance', ar: 'صيانة اللثة' },
    description: {
      en: 'Periodontal maintenance following treatment',
      ar: 'صيانة اللثة بعد العلاج',
    },
    code: 'D4910',
    defaultPrice: 120,
    defaultDuration: 45,
    sortOrder: 13,
    isActive: true,
  },

  // ── Prosthodontics / Crowns & Bridges ─────────────────────
  {
    name: { en: 'Porcelain Crown (PFM)', ar: 'تاج بورسلين (معدن)' },
    description: { en: 'Porcelain fused to metal crown', ar: 'تاج بورسلين مدمج بالمعدن' },
    code: 'D2752',
    defaultPrice: 600,
    defaultDuration: 60,
    sortOrder: 14,
    isActive: true,
  },
  {
    name: { en: 'Zirconia Crown', ar: 'تاج زيركونيا' },
    description: { en: 'Full zirconia ceramic crown', ar: 'تاج زيركونيا سيراميك كامل' },
    code: 'D2740',
    defaultPrice: 800,
    defaultDuration: 60,
    sortOrder: 15,
    isActive: true,
  },
  {
    name: { en: 'Dental Veneer (Porcelain)', ar: 'قشرة أسنان (بورسلين)' },
    description: { en: 'Porcelain veneer per tooth', ar: 'قشرة بورسلين لكل سن' },
    code: 'D2962',
    defaultPrice: 700,
    defaultDuration: 60,
    sortOrder: 16,
    isActive: true,
  },

  // ── Oral Surgery ──────────────────────────────────────────
  {
    name: { en: 'Simple Extraction', ar: 'خلع بسيط' },
    description: { en: 'Simple tooth extraction', ar: 'خلع سن بسيط' },
    code: 'D7140',
    defaultPrice: 120,
    defaultDuration: 30,
    sortOrder: 17,
    isActive: true,
  },
  {
    name: { en: 'Surgical Extraction', ar: 'خلع جراحي' },
    description: { en: 'Surgical extraction of erupted tooth', ar: 'خلع جراحي لسن بارز' },
    code: 'D7210',
    defaultPrice: 250,
    defaultDuration: 45,
    sortOrder: 18,
    isActive: true,
  },
  {
    name: { en: 'Wisdom Tooth Extraction', ar: 'خلع ضرس العقل' },
    description: {
      en: 'Surgical removal of impacted wisdom tooth',
      ar: 'إزالة جراحية لضرس العقل المنحشر',
    },
    code: 'D7240',
    defaultPrice: 400,
    defaultDuration: 60,
    sortOrder: 19,
    isActive: true,
  },

  // ── Cosmetic ──────────────────────────────────────────────
  {
    name: { en: 'Teeth Whitening (In-Office)', ar: 'تبييض الأسنان (في العيادة)' },
    description: {
      en: 'Professional in-office teeth whitening',
      ar: 'تبييض أسنان احترافي في العيادة',
    },
    code: 'D9972',
    defaultPrice: 350,
    defaultDuration: 60,
    sortOrder: 20,
    isActive: true,
  },

  // ── Pediatric ─────────────────────────────────────────────
  {
    name: { en: 'Stainless Steel Crown (Pediatric)', ar: 'تاج فولاذ (أطفال)' },
    description: {
      en: 'Stainless steel crown for primary tooth',
      ar: 'تاج من الفولاذ المقاوم للصدأ للسن اللبني',
    },
    code: 'D2930',
    defaultPrice: 150,
    defaultDuration: 30,
    sortOrder: 21,
    isActive: true,
  },
  {
    name: { en: 'Pulpotomy (Pediatric)', ar: 'بتر لب السن (أطفال)' },
    description: { en: 'Pulpotomy on primary tooth', ar: 'بتر لب السن اللبني' },
    code: 'D3220',
    defaultPrice: 120,
    defaultDuration: 30,
    sortOrder: 22,
    isActive: true,
  },

  // ── Implants ──────────────────────────────────────────────
  {
    name: { en: 'Dental Implant (Fixture)', ar: 'زراعة أسنان (المسمار)' },
    description: { en: 'Endosseous implant fixture placement', ar: 'وضع مسمار زراعة الأسنان' },
    code: 'D6010',
    defaultPrice: 1500,
    defaultDuration: 90,
    sortOrder: 23,
    isActive: true,
  },
  {
    name: { en: 'Implant Crown', ar: 'تاج الزرعة' },
    description: { en: 'Crown on implant abutment', ar: 'تاج على دعامة الزرعة' },
    code: 'D6065',
    defaultPrice: 900,
    defaultDuration: 60,
    sortOrder: 24,
    isActive: true,
  },
];
