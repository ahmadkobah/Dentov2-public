/** Country configuration as returned by GET /api/countries */
export interface CountryConfig {
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
