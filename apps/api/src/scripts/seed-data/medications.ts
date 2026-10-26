/**
 * Medications Seed Data
 *
 * Common dental medications for prescription.
 * Per MASTER_PLAN §10 - Medications Module
 *
 * Field names match the actual Medication model:
 *   nameEn, nameAr, dosageForm, instructionsEn, instructionsAr
 *
 * category enum: antibiotic | analgesic | anti_inflammatory | antifungal |
 *                antiseptic | anesthetic | vitamin | other
 *
 * dosageForm enum: tablet | capsule | syrup | injection | cream | gel |
 *                  mouthwash | drops | spray | powder | other
 */

export interface MedicationSeed {
  nameEn: string;
  nameAr?: string;
  genericName: string;
  category: string;
  dosageForm: string;
  strength?: string;
  defaultDosage?: string;
  defaultFrequency?: string;
  defaultDuration?: string;
  instructionsEn?: string;
  instructionsAr?: string;
  warnings?: string[];
  isActive: boolean;
}

export const medications: MedicationSeed[] = [
  // ── Analgesics / Pain Relief ──────────────────────────────
  {
    nameEn: 'Ibuprofen 400mg',
    nameAr: 'إيبوبروفين 400 مجم',
    genericName: 'Ibuprofen',
    category: 'analgesic',
    dosageForm: 'tablet',
    strength: '400mg',
    defaultDosage: '1 tablet',
    defaultFrequency: '3 times daily',
    defaultDuration: '5 days',
    instructionsEn: 'Take after meals',
    instructionsAr: 'يؤخذ بعد الأكل',
    warnings: ['Avoid if allergic to NSAIDs', 'Not for stomach ulcer patients'],
    isActive: true,
  },
  {
    nameEn: 'Paracetamol 500mg',
    nameAr: 'باراسيتامول 500 مجم',
    genericName: 'Acetaminophen',
    category: 'analgesic',
    dosageForm: 'tablet',
    strength: '500mg',
    defaultDosage: '1-2 tablets',
    defaultFrequency: 'Every 6 hours',
    defaultDuration: '3-5 days',
    instructionsEn: 'Do not exceed 8 tablets in 24 hours',
    instructionsAr: 'لا تتجاوز 8 أقراص في 24 ساعة',
    isActive: true,
  },
  {
    nameEn: 'Diclofenac 50mg',
    nameAr: 'ديكلوفيناك 50 مجم',
    genericName: 'Diclofenac Sodium',
    category: 'analgesic',
    dosageForm: 'tablet',
    strength: '50mg',
    defaultDosage: '1 tablet',
    defaultFrequency: 'Twice daily',
    defaultDuration: '5 days',
    instructionsEn: 'Take with food',
    instructionsAr: 'يؤخذ مع الطعام',
    isActive: true,
  },
  {
    nameEn: 'Ketoprofen 100mg',
    nameAr: 'كيتوبروفين 100 مجم',
    genericName: 'Ketoprofen',
    category: 'analgesic',
    dosageForm: 'capsule',
    strength: '100mg',
    defaultDosage: '1 capsule',
    defaultFrequency: 'Twice daily',
    defaultDuration: '5 days',
    isActive: true,
  },

  // ── Antibiotics ───────────────────────────────────────────
  {
    nameEn: 'Amoxicillin 500mg',
    nameAr: 'أموكسيسيلين 500 مجم',
    genericName: 'Amoxicillin',
    category: 'antibiotic',
    dosageForm: 'capsule',
    strength: '500mg',
    defaultDosage: '1 capsule',
    defaultFrequency: '3 times daily',
    defaultDuration: '7 days',
    instructionsEn: 'Complete the full course',
    instructionsAr: 'أكمل الجرعة كاملة',
    isActive: true,
  },
  {
    nameEn: 'Augmentin 625mg',
    nameAr: 'أوجمنتين 625 مجم',
    genericName: 'Amoxicillin/Clavulanate',
    category: 'antibiotic',
    dosageForm: 'tablet',
    strength: '625mg',
    defaultDosage: '1 tablet',
    defaultFrequency: 'Twice daily',
    defaultDuration: '7 days',
    instructionsEn: 'Take at the start of a meal',
    instructionsAr: 'يؤخذ في بداية الوجبة',
    isActive: true,
  },
  {
    nameEn: 'Azithromycin 500mg',
    nameAr: 'أزيثروميسين 500 مجم',
    genericName: 'Azithromycin',
    category: 'antibiotic',
    dosageForm: 'tablet',
    strength: '500mg',
    defaultDosage: '1 tablet',
    defaultFrequency: 'Once daily',
    defaultDuration: '3 days',
    instructionsEn: 'Can be taken with or without food',
    instructionsAr: 'يمكن تناوله مع أو بدون طعام',
    isActive: true,
  },
  {
    nameEn: 'Clindamycin 300mg',
    nameAr: 'كليندامايسين 300 مجم',
    genericName: 'Clindamycin',
    category: 'antibiotic',
    dosageForm: 'capsule',
    strength: '300mg',
    defaultDosage: '1 capsule',
    defaultFrequency: '3 times daily',
    defaultDuration: '7 days',
    instructionsEn: 'Take with a full glass of water',
    instructionsAr: 'يؤخذ مع كوب كامل من الماء',
    isActive: true,
  },
  {
    nameEn: 'Metronidazole 500mg',
    nameAr: 'ميترونيدازول 500 مجم',
    genericName: 'Metronidazole',
    category: 'antibiotic',
    dosageForm: 'tablet',
    strength: '500mg',
    defaultDosage: '1 tablet',
    defaultFrequency: '3 times daily',
    defaultDuration: '7 days',
    instructionsEn: 'Avoid alcohol during treatment',
    instructionsAr: 'تجنب الكحول أثناء العلاج',
    isActive: true,
  },
  {
    nameEn: 'Doxycycline 100mg',
    nameAr: 'دوكسيسيكلين 100 مجم',
    genericName: 'Doxycycline',
    category: 'antibiotic',
    dosageForm: 'capsule',
    strength: '100mg',
    defaultDosage: '1 capsule',
    defaultFrequency: 'Twice daily',
    defaultDuration: '7 days',
    instructionsEn: 'Take with food, avoid sun exposure',
    instructionsAr: 'يؤخذ مع الطعام، تجنب التعرض للشمس',
    isActive: true,
  },

  // ── Anti-inflammatory / Steroids ──────────────────────────
  {
    nameEn: 'Prednisolone 5mg',
    nameAr: 'بريدنيزولون 5 مجم',
    genericName: 'Prednisolone',
    category: 'anti_inflammatory',
    dosageForm: 'tablet',
    strength: '5mg',
    defaultDosage: '4 tablets',
    defaultFrequency: 'Once daily (morning)',
    defaultDuration: '5 days (tapering)',
    instructionsEn: 'Take in the morning with food',
    instructionsAr: 'يؤخذ صباحاً مع الطعام',
    isActive: true,
  },
  {
    nameEn: 'Dexamethasone 0.5mg',
    nameAr: 'ديكساميثازون 0.5 مجم',
    genericName: 'Dexamethasone',
    category: 'anti_inflammatory',
    dosageForm: 'tablet',
    strength: '0.5mg',
    defaultDosage: '4 tablets',
    defaultFrequency: 'Once daily',
    defaultDuration: '3 days',
    isActive: true,
  },

  // ── Mouth Products ────────────────────────────────────────
  {
    nameEn: 'Chlorhexidine Mouthwash 0.12%',
    nameAr: 'غسول كلورهكسيدين 0.12%',
    genericName: 'Chlorhexidine Gluconate',
    category: 'antiseptic',
    dosageForm: 'mouthwash',
    strength: '0.12%',
    defaultDosage: '15ml',
    defaultFrequency: 'Twice daily',
    defaultDuration: '14 days',
    instructionsEn: 'Rinse for 30 seconds, do not swallow',
    instructionsAr: 'المضمضة لمدة 30 ثانية، لا تبلع',
    isActive: true,
  },
  {
    nameEn: 'Miconazole Oral Gel 2%',
    nameAr: 'ميكونازول جل فموي 2%',
    genericName: 'Miconazole',
    category: 'antifungal',
    dosageForm: 'gel',
    strength: '2%',
    defaultDosage: 'Apply thin layer',
    defaultFrequency: '4 times daily',
    defaultDuration: '7 days',
    instructionsEn: 'Apply after meals, keep in mouth as long as possible',
    instructionsAr: 'يوضع بعد الوجبات، يبقى في الفم أطول فترة ممكنة',
    isActive: true,
  },
  {
    nameEn: 'Benzocaine Gel 20%',
    nameAr: 'جيل بنزوكايين 20%',
    genericName: 'Benzocaine',
    category: 'anesthetic',
    dosageForm: 'gel',
    strength: '20%',
    defaultDosage: 'Apply small amount',
    defaultFrequency: 'As needed (max 4 times daily)',
    instructionsEn: 'Apply directly to affected area',
    instructionsAr: 'يوضع مباشرة على المنطقة المصابة',
    isActive: true,
  },

  // ── GI Protection ─────────────────────────────────────────
  {
    nameEn: 'Omeprazole 20mg',
    nameAr: 'أوميبرازول 20 مجم',
    genericName: 'Omeprazole',
    category: 'other',
    dosageForm: 'capsule',
    strength: '20mg',
    defaultDosage: '1 capsule',
    defaultFrequency: 'Once daily (before breakfast)',
    defaultDuration: '14 days',
    instructionsEn: 'Take 30 minutes before first meal',
    instructionsAr: 'يؤخذ قبل 30 دقيقة من أول وجبة',
    isActive: true,
  },

  // ── Muscle Relaxants ──────────────────────────────────────
  {
    nameEn: 'Orphenadrine 100mg',
    nameAr: 'أورفينادرين 100 مجم',
    genericName: 'Orphenadrine Citrate',
    category: 'other',
    dosageForm: 'tablet',
    strength: '100mg',
    defaultDosage: '1 tablet',
    defaultFrequency: 'Twice daily',
    defaultDuration: '7 days',
    instructionsEn: 'May cause drowsiness',
    instructionsAr: 'قد يسبب النعاس',
    isActive: true,
  },

  // ── Antihistamines ────────────────────────────────────────
  {
    nameEn: 'Cetirizine 10mg',
    nameAr: 'سيتيريزين 10 مجم',
    genericName: 'Cetirizine',
    category: 'other',
    dosageForm: 'tablet',
    strength: '10mg',
    defaultDosage: '1 tablet',
    defaultFrequency: 'Once daily',
    defaultDuration: '5 days',
    isActive: true,
  },

  // ── Vitamins & Supplements ────────────────────────────────
  {
    nameEn: 'Vitamin C 1000mg',
    nameAr: 'فيتامين سي 1000 مجم',
    genericName: 'Ascorbic Acid',
    category: 'vitamin',
    dosageForm: 'tablet',
    strength: '1000mg',
    defaultDosage: '1 tablet',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days',
    isActive: true,
  },
  {
    nameEn: 'Calcium + Vitamin D3',
    nameAr: 'كالسيوم + فيتامين د3',
    genericName: 'Calcium Carbonate + Cholecalciferol',
    category: 'vitamin',
    dosageForm: 'tablet',
    strength: '600mg + 400IU',
    defaultDosage: '1 tablet',
    defaultFrequency: 'Once daily',
    defaultDuration: '30 days',
    isActive: true,
  },
];

/**
 * Lab Order Types Seed Data
 *
 * Standard dental laboratory orders.
 * Per MASTER_PLAN §10 - Lab Orders Module (14 types)
 */

export interface LabOrderTypeSeed {
  name: { en: string; ar: string };
  category: string;
  description?: string;
  defaultTurnaroundDays: number;
  isActive: boolean;
  sortOrder: number;
}

export const labOrderTypes: LabOrderTypeSeed[] = [
  {
    name: { en: 'PFM Crown', ar: 'تاج بورسلين على معدن' },
    category: 'crown_bridge',
    description: 'Porcelain-fused-to-metal crown',
    defaultTurnaroundDays: 5,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: { en: 'Zirconia Crown', ar: 'تاج زركونيا' },
    category: 'crown_bridge',
    description: 'Full zirconia crown (monolithic or layered)',
    defaultTurnaroundDays: 5,
    isActive: true,
    sortOrder: 2,
  },
  {
    name: { en: 'E-max Crown', ar: 'تاج إي ماكس' },
    category: 'crown_bridge',
    description: 'Lithium disilicate ceramic crown',
    defaultTurnaroundDays: 5,
    isActive: true,
    sortOrder: 3,
  },
  {
    name: { en: 'Bridge (3-unit)', ar: 'جسر (3 وحدات)' },
    category: 'crown_bridge',
    defaultTurnaroundDays: 7,
    isActive: true,
    sortOrder: 4,
  },
  {
    name: { en: 'Veneer', ar: 'فينير' },
    category: 'veneers',
    description: 'Porcelain or composite veneer',
    defaultTurnaroundDays: 7,
    isActive: true,
    sortOrder: 5,
  },
  {
    name: { en: 'Complete Denture', ar: 'طقم أسنان كامل' },
    category: 'removable',
    description: 'Full upper or lower denture',
    defaultTurnaroundDays: 10,
    isActive: true,
    sortOrder: 6,
  },
  {
    name: { en: 'Partial Denture', ar: 'طقم أسنان جزئي' },
    category: 'removable',
    description: 'Removable partial denture (acrylic or metal frame)',
    defaultTurnaroundDays: 10,
    isActive: true,
    sortOrder: 7,
  },
  {
    name: { en: 'Night Guard', ar: 'واقي ليلي' },
    category: 'appliances',
    description: 'Occlusal splint for bruxism',
    defaultTurnaroundDays: 5,
    isActive: true,
    sortOrder: 8,
  },
  {
    name: { en: 'Whitening Tray', ar: 'قالب تبييض' },
    category: 'appliances',
    description: 'Custom whitening tray',
    defaultTurnaroundDays: 3,
    isActive: true,
    sortOrder: 9,
  },
  {
    name: { en: 'Orthodontic Retainer', ar: 'مثبت تقويم' },
    category: 'orthodontics',
    description: 'Hawley or clear retainer',
    defaultTurnaroundDays: 5,
    isActive: true,
    sortOrder: 10,
  },
  {
    name: { en: 'Implant Crown', ar: 'تاج على زرعة' },
    category: 'implants',
    description: 'Crown on implant abutment',
    defaultTurnaroundDays: 7,
    isActive: true,
    sortOrder: 11,
  },
  {
    name: { en: 'Custom Abutment', ar: 'دعامة مخصصة' },
    category: 'implants',
    description: 'Custom titanium or zirconia abutment',
    defaultTurnaroundDays: 7,
    isActive: true,
    sortOrder: 12,
  },
  {
    name: { en: 'Surgical Guide', ar: 'دليل جراحي' },
    category: 'implants',
    description: '3D-printed surgical guide for implant placement',
    defaultTurnaroundDays: 5,
    isActive: true,
    sortOrder: 13,
  },
  {
    name: { en: 'Study Model', ar: 'نموذج دراسي' },
    category: 'diagnostics',
    description: 'Diagnostic cast / study model',
    defaultTurnaroundDays: 3,
    isActive: true,
    sortOrder: 14,
  },
];
