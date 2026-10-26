/**
 * Static country metadata maps for auto-fill when adding a new country.
 * Used by CountriesPage to derive currency, timezone, locale, etc. from an ISO country code.
 */

import type { Country } from '@dento/ui';

// ── ISO alpha-2 → ISO 4217 currency code ───────────────────

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // MENA
  SA: 'SAR',
  EG: 'EGP',
  AE: 'AED',
  KW: 'KWD',
  QA: 'QAR',
  BH: 'BHD',
  OM: 'OMR',
  JO: 'JOD',
  LB: 'LBP',
  IQ: 'IQD',
  SY: 'SYP',
  PS: 'ILS',
  YE: 'YER',
  LY: 'LYD',
  TN: 'TND',
  DZ: 'DZD',
  MA: 'MAD',
  SD: 'SDG',
  // Europe
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  PT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  LU: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  HR: 'EUR',
  ME: 'EUR',
  XK: 'EUR',
  AD: 'EUR',
  MC: 'EUR',
  SM: 'EUR',
  VA: 'EUR',
  CH: 'CHF',
  LI: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  IS: 'ISK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  RS: 'RSD',
  BA: 'BAM',
  MK: 'MKD',
  AL: 'ALL',
  MD: 'MDL',
  UA: 'UAH',
  BY: 'BYN',
  GE: 'GEL',
  AM: 'AMD',
  AZ: 'AZN',
  RU: 'RUB',
  TR: 'TRY',
  // Americas
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  VE: 'VES',
  EC: 'USD',
  UY: 'UYU',
  PY: 'PYG',
  BO: 'BOB',
  GY: 'GYD',
  SR: 'SRD',
  PA: 'PAB',
  CR: 'CRC',
  NI: 'NIO',
  HN: 'HNL',
  SV: 'USD',
  GT: 'GTQ',
  BZ: 'BZD',
  CU: 'CUP',
  JM: 'JMD',
  HT: 'HTG',
  DO: 'DOP',
  PR: 'USD',
  TT: 'TTD',
  BB: 'BBD',
  BS: 'BSD',
  AG: 'XCD',
  DM: 'XCD',
  GD: 'XCD',
  KN: 'XCD',
  LC: 'XCD',
  VC: 'XCD',
  // Asia
  CN: 'CNY',
  JP: 'JPY',
  KR: 'KRW',
  IN: 'INR',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  NP: 'NPR',
  MV: 'MVR',
  BT: 'BTN',
  ID: 'IDR',
  MY: 'MYR',
  SG: 'SGD',
  TH: 'THB',
  VN: 'VND',
  PH: 'PHP',
  KH: 'KHR',
  LA: 'LAK',
  MM: 'MMK',
  BN: 'BND',
  TL: 'USD',
  TW: 'TWD',
  HK: 'HKD',
  MO: 'MOP',
  MN: 'MNT',
  KZ: 'KZT',
  KG: 'KGS',
  TJ: 'TJS',
  TM: 'TMT',
  UZ: 'UZS',
  AF: 'AFN',
  IR: 'IRR',
  IL: 'ILS',
  KP: 'KPW',
  // Africa
  NG: 'NGN',
  ZA: 'ZAR',
  KE: 'KES',
  GH: 'GHS',
  ET: 'ETB',
  TZ: 'TZS',
  UG: 'UGX',
  RW: 'RWF',
  BI: 'BIF',
  SO: 'SOS',
  DJ: 'DJF',
  ER: 'ERN',
  SS: 'SSP',
  CM: 'XAF',
  CF: 'XAF',
  TD: 'XAF',
  CG: 'XAF',
  GQ: 'XAF',
  GA: 'XAF',
  SN: 'XOF',
  ML: 'XOF',
  BF: 'XOF',
  NE: 'XOF',
  CI: 'XOF',
  TG: 'XOF',
  BJ: 'XOF',
  GW: 'XOF',
  GN: 'GNF',
  SL: 'SLE',
  LR: 'LRD',
  GM: 'GMD',
  CV: 'CVE',
  MR: 'MRU',
  CD: 'CDF',
  MG: 'MGA',
  MU: 'MUR',
  SC: 'SCR',
  KM: 'KMF',
  MW: 'MWK',
  MZ: 'MZN',
  ZM: 'ZMW',
  ZW: 'ZWL',
  BW: 'BWP',
  NA: 'NAD',
  LS: 'LSL',
  SZ: 'SZL',
  ST: 'STN',
  // Oceania
  AU: 'AUD',
  NZ: 'NZD',
  FJ: 'FJD',
  PG: 'PGK',
  SB: 'SBD',
  VU: 'VUV',
  WS: 'WST',
  TO: 'TOP',
  KI: 'AUD',
  MH: 'USD',
  FM: 'USD',
  PW: 'USD',
  NR: 'AUD',
  TV: 'AUD',
};

// ── ISO alpha-2 → primary IANA timezone ─────────────────────

export const COUNTRY_TO_TIMEZONE: Record<string, string> = {
  // MENA
  SA: 'Asia/Riyadh',
  EG: 'Africa/Cairo',
  AE: 'Asia/Dubai',
  KW: 'Asia/Kuwait',
  QA: 'Asia/Qatar',
  BH: 'Asia/Bahrain',
  OM: 'Asia/Muscat',
  JO: 'Asia/Amman',
  LB: 'Asia/Beirut',
  IQ: 'Asia/Baghdad',
  SY: 'Asia/Damascus',
  PS: 'Asia/Hebron',
  YE: 'Asia/Aden',
  LY: 'Africa/Tripoli',
  TN: 'Africa/Tunis',
  DZ: 'Africa/Algiers',
  MA: 'Africa/Casablanca',
  SD: 'Africa/Khartoum',
  // Europe
  GB: 'Europe/London',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  IT: 'Europe/Rome',
  ES: 'Europe/Madrid',
  PT: 'Europe/Lisbon',
  NL: 'Europe/Amsterdam',
  BE: 'Europe/Brussels',
  AT: 'Europe/Vienna',
  IE: 'Europe/Dublin',
  FI: 'Europe/Helsinki',
  GR: 'Europe/Athens',
  CY: 'Asia/Nicosia',
  MT: 'Europe/Malta',
  LU: 'Europe/Luxembourg',
  EE: 'Europe/Tallinn',
  LV: 'Europe/Riga',
  LT: 'Europe/Vilnius',
  SK: 'Europe/Bratislava',
  SI: 'Europe/Ljubljana',
  HR: 'Europe/Zagreb',
  ME: 'Europe/Podgorica',
  XK: 'Europe/Belgrade',
  AD: 'Europe/Andorra',
  MC: 'Europe/Monaco',
  SM: 'Europe/San_Marino',
  VA: 'Europe/Vatican',
  CH: 'Europe/Zurich',
  LI: 'Europe/Vaduz',
  SE: 'Europe/Stockholm',
  NO: 'Europe/Oslo',
  DK: 'Europe/Copenhagen',
  IS: 'Atlantic/Reykjavik',
  PL: 'Europe/Warsaw',
  CZ: 'Europe/Prague',
  HU: 'Europe/Budapest',
  RO: 'Europe/Bucharest',
  BG: 'Europe/Sofia',
  RS: 'Europe/Belgrade',
  BA: 'Europe/Sarajevo',
  MK: 'Europe/Skopje',
  AL: 'Europe/Tirane',
  MD: 'Europe/Chisinau',
  UA: 'Europe/Kyiv',
  BY: 'Europe/Minsk',
  GE: 'Asia/Tbilisi',
  AM: 'Asia/Yerevan',
  AZ: 'Asia/Baku',
  RU: 'Europe/Moscow',
  TR: 'Europe/Istanbul',
  // Americas
  US: 'America/New_York',
  CA: 'America/Toronto',
  MX: 'America/Mexico_City',
  BR: 'America/Sao_Paulo',
  AR: 'America/Buenos_Aires',
  CL: 'America/Santiago',
  CO: 'America/Bogota',
  PE: 'America/Lima',
  VE: 'America/Caracas',
  EC: 'America/Guayaquil',
  UY: 'America/Montevideo',
  PY: 'America/Asuncion',
  BO: 'America/La_Paz',
  GY: 'America/Guyana',
  SR: 'America/Paramaribo',
  PA: 'America/Panama',
  CR: 'America/Costa_Rica',
  NI: 'America/Managua',
  HN: 'America/Tegucigalpa',
  SV: 'America/El_Salvador',
  GT: 'America/Guatemala',
  BZ: 'America/Belize',
  CU: 'America/Havana',
  JM: 'America/Jamaica',
  HT: 'America/Port-au-Prince',
  DO: 'America/Santo_Domingo',
  PR: 'America/Puerto_Rico',
  TT: 'America/Port_of_Spain',
  BB: 'America/Barbados',
  BS: 'America/Nassau',
  AG: 'America/Antigua',
  DM: 'America/Dominica',
  GD: 'America/Grenada',
  KN: 'America/St_Kitts',
  LC: 'America/St_Lucia',
  VC: 'America/St_Vincent',
  // Asia
  CN: 'Asia/Shanghai',
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  IN: 'Asia/Kolkata',
  PK: 'Asia/Karachi',
  BD: 'Asia/Dhaka',
  LK: 'Asia/Colombo',
  NP: 'Asia/Kathmandu',
  MV: 'Indian/Maldives',
  BT: 'Asia/Thimphu',
  ID: 'Asia/Jakarta',
  MY: 'Asia/Kuala_Lumpur',
  SG: 'Asia/Singapore',
  TH: 'Asia/Bangkok',
  VN: 'Asia/Ho_Chi_Minh',
  PH: 'Asia/Manila',
  KH: 'Asia/Phnom_Penh',
  LA: 'Asia/Vientiane',
  MM: 'Asia/Yangon',
  BN: 'Asia/Brunei',
  TL: 'Asia/Dili',
  TW: 'Asia/Taipei',
  HK: 'Asia/Hong_Kong',
  MO: 'Asia/Macau',
  MN: 'Asia/Ulaanbaatar',
  KZ: 'Asia/Almaty',
  KG: 'Asia/Bishkek',
  TJ: 'Asia/Dushanbe',
  TM: 'Asia/Ashgabat',
  UZ: 'Asia/Tashkent',
  AF: 'Asia/Kabul',
  IR: 'Asia/Tehran',
  IL: 'Asia/Jerusalem',
  KP: 'Asia/Pyongyang',
  // Africa
  NG: 'Africa/Lagos',
  ZA: 'Africa/Johannesburg',
  KE: 'Africa/Nairobi',
  GH: 'Africa/Accra',
  ET: 'Africa/Addis_Ababa',
  TZ: 'Africa/Dar_es_Salaam',
  UG: 'Africa/Kampala',
  RW: 'Africa/Kigali',
  BI: 'Africa/Bujumbura',
  SO: 'Africa/Mogadishu',
  DJ: 'Africa/Djibouti',
  ER: 'Africa/Asmara',
  SS: 'Africa/Juba',
  CM: 'Africa/Douala',
  CF: 'Africa/Bangui',
  TD: 'Africa/Ndjamena',
  CG: 'Africa/Brazzaville',
  GQ: 'Africa/Malabo',
  GA: 'Africa/Libreville',
  SN: 'Africa/Dakar',
  ML: 'Africa/Bamako',
  BF: 'Africa/Ouagadougou',
  NE: 'Africa/Niamey',
  CI: 'Africa/Abidjan',
  TG: 'Africa/Lome',
  BJ: 'Africa/Porto-Novo',
  GW: 'Africa/Bissau',
  GN: 'Africa/Conakry',
  SL: 'Africa/Freetown',
  LR: 'Africa/Monrovia',
  GM: 'Africa/Banjul',
  CV: 'Atlantic/Cape_Verde',
  MR: 'Africa/Nouakchott',
  CD: 'Africa/Kinshasa',
  MG: 'Indian/Antananarivo',
  MU: 'Indian/Mauritius',
  SC: 'Indian/Mahe',
  KM: 'Indian/Comoro',
  MW: 'Africa/Blantyre',
  MZ: 'Africa/Maputo',
  ZM: 'Africa/Lusaka',
  ZW: 'Africa/Harare',
  BW: 'Africa/Gaborone',
  NA: 'Africa/Windhoek',
  LS: 'Africa/Maseru',
  SZ: 'Africa/Mbabane',
  ST: 'Africa/Sao_Tome',
  // Oceania
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
  FJ: 'Pacific/Fiji',
  PG: 'Pacific/Port_Moresby',
  SB: 'Pacific/Guadalcanal',
  VU: 'Pacific/Efate',
  WS: 'Pacific/Apia',
  TO: 'Pacific/Tongatapu',
  KI: 'Pacific/Tarawa',
  MH: 'Pacific/Majuro',
  FM: 'Pacific/Pohnpei',
  PW: 'Pacific/Palau',
  NR: 'Pacific/Nauru',
  TV: 'Pacific/Funafuti',
};

// ── RTL writing direction countries ─────────────────────────

const RTL_COUNTRIES = new Set([
  'SA',
  'EG',
  'AE',
  'KW',
  'QA',
  'BH',
  'OM',
  'JO',
  'LB',
  'IQ',
  'SY',
  'PS',
  'YE',
  'LY',
  'TN',
  'DZ',
  'MA',
  'SD',
  'IR',
  'AF',
  'PK',
  'SO',
  'DJ',
  'KM',
  'MR',
  'SS',
]);

// ── Countries that primarily use 12-hour clock ──────────────

const TWELVE_HOUR_COUNTRIES = new Set([
  'US',
  'CA',
  'AU',
  'NZ',
  'GB',
  'IE',
  'IN',
  'PK',
  'BD',
  'PH',
  'MY',
  'SA',
  'EG',
  'JO',
  'CO',
  'MX',
  'KR',
]);

// ── Week start day by country (0=Sun, 1=Mon, 5=Fri, 6=Sat) ─

const FRIDAY_START = new Set([
  'SA',
  'AE',
  'BH',
  'DJ',
  'EG',
  'IQ',
  'IR',
  'JO',
  'KW',
  'LY',
  'OM',
  'QA',
  'SD',
  'SY',
  'AF',
]);
const SATURDAY_START = new Set(['IL', 'PS', 'YE', 'SO']);
const SUNDAY_START = new Set([
  'US',
  'CA',
  'MX',
  'BR',
  'JP',
  'KR',
  'CN',
  'TW',
  'IN',
  'PH',
  'TH',
  'AU',
  'NZ',
  'GT',
  'HN',
  'SV',
  'NI',
  'PA',
  'CO',
  'VE',
  'PE',
  'EC',
  'BO',
  'PY',
  'CL',
  'AR',
  'UY',
  'DO',
  'PR',
  'JM',
  'TT',
  'HT',
  'CU',
  'BS',
  'BB',
  'AG',
  'DM',
  'GD',
  'KN',
  'LC',
  'VC',
  'BZ',
  'GY',
  'SR',
  'ZA',
  'BW',
  'ZW',
  'MZ',
  'KE',
  'ET',
  'NG',
  'GH',
  'SG',
  'BD',
  'PK',
  'LK',
  'NP',
  'MM',
  'KH',
  'LA',
]);

function getWeekStart(iso: string): 0 | 1 | 5 | 6 {
  if (FRIDAY_START.has(iso)) return 5;
  if (SATURDAY_START.has(iso)) return 6;
  if (SUNDAY_START.has(iso)) return 0;
  return 1; // Monday default (most of Europe, Asia, Africa)
}

// ── Date format by country convention ───────────────────────

const MDY_COUNTRIES = new Set(['US', 'PR', 'FM', 'MH', 'PW']); // MM/dd/yyyy
const YMD_COUNTRIES = new Set(['CN', 'JP', 'KR', 'TW', 'HU', 'SE', 'LT', 'CA', 'IR']); // yyyy-MM-dd
// Everyone else: dd/MM/yyyy

function getDateFormat(iso: string): string {
  if (MDY_COUNTRIES.has(iso)) return 'MM/dd/yyyy';
  if (YMD_COUNTRIES.has(iso)) return 'yyyy-MM-dd';
  return 'dd/MM/yyyy';
}

// ── Date format options for dropdown ────────────────────────

export const DATE_FORMAT_OPTIONS = [
  { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy', example: '25/01/2025' },
  { value: 'MM/dd/yyyy', label: 'MM/dd/yyyy', example: '01/25/2025' },
  { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd', example: '2025-01-25' },
  { value: 'dd-MM-yyyy', label: 'dd-MM-yyyy', example: '25-01-2025' },
  { value: 'dd.MM.yyyy', label: 'dd.MM.yyyy', example: '25.01.2025' },
  { value: 'yyyy/MM/dd', label: 'yyyy/MM/dd', example: '2025/01/25' },
] as const;

// ── Currency derivation via Intl ────────────────────────────

function deriveCurrencyInfo(currencyCode: string): {
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
} {
  try {
    const fmt = new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode });
    const parts = fmt.formatToParts(1234.56);
    const currencyPart = parts.find((p) => p.type === 'currency');
    const symbol = currencyPart?.value ?? currencyCode;
    const currencyIdx = parts.findIndex((p) => p.type === 'currency');
    const integerIdx = parts.findIndex((p) => p.type === 'integer');
    const symbolPosition = currencyIdx < integerIdx ? 'before' : 'after';
    const fractionPart = parts.find((p) => p.type === 'fraction');
    const decimalPlaces = fractionPart?.value.length ?? 0;
    return { symbol, symbolPosition, decimalPlaces };
  } catch {
    return { symbol: currencyCode, symbolPosition: 'before', decimalPlaces: 2 };
  }
}

// ── Arabic name via Intl ────────────────────────────────────

function getArabicName(iso: string): string {
  try {
    const dn = new Intl.DisplayNames('ar', { type: 'region' });
    return dn.of(iso) ?? '';
  } catch {
    return '';
  }
}

// ── Main auto-fill function ─────────────────────────────────

export interface AutoFilledCountry {
  code: string;
  name: string;
  nameArabic: string;
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

export function autoFillFromCountry(country: Country): AutoFilledCountry {
  const { iso, name, dial } = country;

  const currencyCode = COUNTRY_TO_CURRENCY[iso] ?? '';
  const currencyInfo = currencyCode
    ? deriveCurrencyInfo(currencyCode)
    : { symbol: '', symbolPosition: 'before' as const, decimalPlaces: 2 };

  const isRtl = RTL_COUNTRIES.has(iso);

  return {
    code: iso,
    name,
    nameArabic: getArabicName(iso),
    defaultLocale: isRtl ? 'ar' : 'en',
    supportedLocales: ['en', 'ar'],
    currency: {
      code: currencyCode,
      ...currencyInfo,
    },
    timezone: COUNTRY_TO_TIMEZONE[iso] ?? '',
    dateFormat: getDateFormat(iso),
    timeFormat: TWELVE_HOUR_COUNTRIES.has(iso) ? '12h' : '24h',
    weekStart: getWeekStart(iso),
    phoneCode: dial,
    direction: isRtl ? 'rtl' : 'ltr',
    isActive: true,
  };
}
