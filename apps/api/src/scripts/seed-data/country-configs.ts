/**
 * Country Config Seed Data
 *
 * Supported countries for Dento v2:
 * - Egypt (EG) — Primary market
 * - Saudi Arabia (SA)
 * - United Arab Emirates (AE)
 * - Jordan (JO)
 * - Kuwait (KW)
 * - Qatar (QA)
 * - Bahrain (BH)
 * - Oman (OM)
 * - Lebanon (LB)
 * - Iraq (IQ)
 * - Syria (SY)
 * - Palestine (PS)
 * - Yemen (YE)
 * - Turkey (TR)
 * - United States (US)
 * - United Kingdom (GB)
 * - Germany (DE)
 * - France (FR)
 */

// Define seed data type without Mongoose Document fields
interface CountryConfigSeed {
  code: string;
  name: string;
  nameArabic?: string;
  defaultLocale: 'en' | 'ar';
  supportedLocales: ('en' | 'ar')[];
  currency: {
    code: string;
    symbol: string;
    symbolPosition: 'before' | 'after';
    decimalPlaces: number;
  };
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStart: 0 | 1 | 5 | 6;
  phoneCode: string;
  direction: 'ltr' | 'rtl';
  isActive: boolean;
}

export const countryConfigs: CountryConfigSeed[] = [
  {
    code: 'EG',
    name: 'Egypt',
    nameArabic: 'مصر',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'EGP',
      symbol: 'ج.م',
      symbolPosition: 'after',
      decimalPlaces: 2,
    },
    timezone: 'Africa/Cairo',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+20',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    nameArabic: 'المملكة العربية السعودية',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'SAR',
      symbol: 'ر.س',
      symbolPosition: 'after',
      decimalPlaces: 2,
    },
    timezone: 'Asia/Riyadh',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+966',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    nameArabic: 'الإمارات العربية المتحدة',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'AED',
      symbol: 'د.إ',
      symbolPosition: 'after',
      decimalPlaces: 2,
    },
    timezone: 'Asia/Dubai',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+971',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'JO',
    name: 'Jordan',
    nameArabic: 'الأردن',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'JOD',
      symbol: 'د.أ',
      symbolPosition: 'after',
      decimalPlaces: 3,
    },
    timezone: 'Asia/Amman',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+962',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'KW',
    name: 'Kuwait',
    nameArabic: 'الكويت',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'KWD',
      symbol: 'د.ك',
      symbolPosition: 'after',
      decimalPlaces: 3,
    },
    timezone: 'Asia/Kuwait',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+965',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'QA',
    name: 'Qatar',
    nameArabic: 'قطر',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'QAR',
      symbol: 'ر.ق',
      symbolPosition: 'after',
      decimalPlaces: 2,
    },
    timezone: 'Asia/Qatar',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+974',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'BH',
    name: 'Bahrain',
    nameArabic: 'البحرين',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'BHD',
      symbol: 'د.ب',
      symbolPosition: 'after',
      decimalPlaces: 3,
    },
    timezone: 'Asia/Bahrain',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+973',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'OM',
    name: 'Oman',
    nameArabic: 'عُمان',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'OMR',
      symbol: 'ر.ع',
      symbolPosition: 'after',
      decimalPlaces: 3,
    },
    timezone: 'Asia/Muscat',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+968',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'LB',
    name: 'Lebanon',
    nameArabic: 'لبنان',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'LBP',
      symbol: 'ل.ل',
      symbolPosition: 'after',
      decimalPlaces: 0,
    },
    timezone: 'Asia/Beirut',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 1, // Monday
    phoneCode: '+961',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'IQ',
    name: 'Iraq',
    nameArabic: 'العراق',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'IQD',
      symbol: 'ع.د',
      symbolPosition: 'after',
      decimalPlaces: 0,
    },
    timezone: 'Asia/Baghdad',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+964',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'SY',
    name: 'Syria',
    nameArabic: 'سوريا',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'SYP',
      symbol: 'ل.س',
      symbolPosition: 'after',
      decimalPlaces: 0,
    },
    timezone: 'Asia/Damascus',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+963',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'PS',
    name: 'Palestine',
    nameArabic: 'فلسطين',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'ILS',
      symbol: '₪',
      symbolPosition: 'before',
      decimalPlaces: 2,
    },
    timezone: 'Asia/Hebron',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+970',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'YE',
    name: 'Yemen',
    nameArabic: 'اليمن',
    defaultLocale: 'ar',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: 'YER',
      symbol: 'ر.ي',
      symbolPosition: 'after',
      decimalPlaces: 0,
    },
    timezone: 'Asia/Aden',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+967',
    direction: 'rtl',
    isActive: true,
  },
  {
    code: 'TR',
    name: 'Turkey',
    defaultLocale: 'en',
    supportedLocales: ['en'],
    currency: {
      code: 'TRY',
      symbol: '₺',
      symbolPosition: 'before',
      decimalPlaces: 2,
    },
    timezone: 'Europe/Istanbul',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: '24h',
    weekStart: 1, // Monday
    phoneCode: '+90',
    direction: 'ltr',
    isActive: true,
  },
  {
    code: 'US',
    name: 'United States',
    defaultLocale: 'en',
    supportedLocales: ['en'],
    currency: {
      code: 'USD',
      symbol: '$',
      symbolPosition: 'before',
      decimalPlaces: 2,
    },
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    weekStart: 0, // Sunday
    phoneCode: '+1',
    direction: 'ltr',
    isActive: true,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    defaultLocale: 'en',
    supportedLocales: ['en'],
    currency: {
      code: 'GBP',
      symbol: '£',
      symbolPosition: 'before',
      decimalPlaces: 2,
    },
    timezone: 'Europe/London',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStart: 1, // Monday
    phoneCode: '+44',
    direction: 'ltr',
    isActive: true,
  },
  {
    code: 'DE',
    name: 'Germany',
    defaultLocale: 'en',
    supportedLocales: ['en'],
    currency: {
      code: 'EUR',
      symbol: '€',
      symbolPosition: 'after',
      decimalPlaces: 2,
    },
    timezone: 'Europe/Berlin',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: '24h',
    weekStart: 1, // Monday
    phoneCode: '+49',
    direction: 'ltr',
    isActive: true,
  },
  {
    code: 'FR',
    name: 'France',
    defaultLocale: 'en',
    supportedLocales: ['en'],
    currency: {
      code: 'EUR',
      symbol: '€',
      symbolPosition: 'after',
      decimalPlaces: 2,
    },
    timezone: 'Europe/Paris',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStart: 1, // Monday
    phoneCode: '+33',
    direction: 'ltr',
    isActive: true,
  },
];
