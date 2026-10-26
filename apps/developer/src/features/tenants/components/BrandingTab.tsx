import { useState, useEffect, useRef } from 'react';
import { Palette, Loader2, Upload } from 'lucide-react';
import { Button } from '@dento/ui';
import type { TenantDetail } from '../types/tenant-detail.types.js';
import { useTenantBranding, useUpdateTenantBranding } from '../hooks/useTenants.js';
import { useTenantBrandingUpload } from '../hooks/useTenantBrandingUpload.js';

export function BrandingTab({ tenant, tenantId }: { tenant: TenantDetail; tenantId: string }) {
  const { data: brandingRes, isLoading } = useTenantBranding(tenantId);
  const updateBranding = useUpdateTenantBranding(tenantId);
  const { upload, isUploading } = useTenantBrandingUpload(tenantId);

  const branding = (brandingRes as Record<string, unknown>)?.data
    ? (((brandingRes as Record<string, unknown>).data as Record<string, unknown>).branding as
        | Record<string, unknown>
        | undefined)
    : undefined;

  const [primaryColor, setPrimaryColor] = useState(tenant.branding.primaryColor);
  const [accentColor, setAccentColor] = useState(tenant.branding.accentColor || '#10b981');
  const [nameEn, setNameEn] = useState(tenant.name.en);
  const [nameAr, setNameAr] = useState(tenant.name.ar || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [addressEn, setAddressEn] = useState('');
  const [addressAr, setAddressAr] = useState('');

  // Upload state
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [logoDarkKey, setLogoDarkKey] = useState<string | null>(null);
  const [faviconKey, setFaviconKey] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // Sync form state when branding data loads from the tenant's settings collection
  useEffect(() => {
    if (!branding) return;
    const clinicName = branding.clinicName as { en?: string; ar?: string } | undefined;
    const address = branding.address as { main?: { en?: string; ar?: string } } | undefined;
    if (clinicName?.en) setNameEn(clinicName.en);
    if (clinicName?.ar) setNameAr(clinicName.ar);
    if (branding.primaryColor) setPrimaryColor(branding.primaryColor as string);
    if (branding.accentColor) setAccentColor(branding.accentColor as string);
    if (branding.phone) setPhone(branding.phone as string);
    if (branding.email) setEmail(branding.email as string);
    if (branding.website) setWebsite(branding.website as string);
    if (address?.main?.en) setAddressEn(address.main.en);
    if (address?.main?.ar) setAddressAr(address.main.ar);
  }, [branding]);

  const handleUpload = async (
    file: File,
    setKey: (k: string) => void,
    setPreview: (u: string) => void,
  ) => {
    try {
      const result = await upload(file);
      setKey(result.key);
      setPreview(result.url);
    } catch {
      // hook throws with message
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setKey: (k: string) => void,
    setPreview: (u: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, setKey, setPreview);
    e.target.value = '';
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      clinicName: { en: nameEn, ar: nameAr || undefined },
      primaryColor,
      accentColor,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      address: { main: { en: addressEn || nameEn, ar: addressAr || undefined } },
    };
    if (logoKey !== null) payload.logoUrl = logoKey;
    if (logoDarkKey !== null) payload.logoDarkUrl = logoDarkKey;
    if (faviconKey !== null) payload.faviconUrl = faviconKey;

    updateBranding.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo & Favicon */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Light Logo */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Clinic Logo</h3>
          <div className="space-y-4">
            <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
              {logoPreview || (branding?.logoUrl as string) ? (
                <img
                  src={logoPreview || (branding?.logoUrl as string)}
                  alt="Logo"
                  className="max-h-20 max-w-full object-contain"
                />
              ) : (
                <Palette className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, setLogoKey, setLogoPreview)}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 dark:border-gray-700 dark:text-gray-300"
              disabled={isUploading}
              onClick={() => logoInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {isUploading ? 'Uploading…' : 'Upload Logo'}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, or SVG. Max 5MB.</p>
          </div>
        </div>

        {/* Dark Logo */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Dark Mode Logo
          </h3>
          <div className="space-y-4">
            <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-800 dark:border-gray-600">
              {logoDarkPreview || (branding?.logoDarkUrl as string) ? (
                <img
                  src={logoDarkPreview || (branding?.logoDarkUrl as string)}
                  alt="Dark logo"
                  className="max-h-20 max-w-full object-contain"
                />
              ) : (
                <Palette className="h-8 w-8 text-gray-500" />
              )}
            </div>
            <input
              ref={logoDarkInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, setLogoDarkKey, setLogoDarkPreview)}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 dark:border-gray-700 dark:text-gray-300"
              disabled={isUploading}
              onClick={() => logoDarkInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {isUploading ? 'Uploading…' : 'Upload Dark Logo'}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Optional. Used in dark theme.
            </p>
          </div>
        </div>

        {/* Favicon */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Favicon</h3>
          <div className="space-y-4">
            <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
              {faviconPreview || (branding?.faviconUrl as string) ? (
                <img
                  src={faviconPreview || (branding?.faviconUrl as string)}
                  alt="Favicon"
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <span className="text-2xl">🦷</span>
              )}
            </div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, setFaviconKey, setFaviconPreview)}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 dark:border-gray-700 dark:text-gray-300"
              disabled={isUploading}
              onClick={() => faviconInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {isUploading ? 'Uploading…' : 'Upload Favicon'}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ICO, PNG. 32x32 or 64x64 recommended.
            </p>
          </div>
        </div>
      </div>

      {/* App Name */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          App Name (Bilingual)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              English Name
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span dir="rtl">الاسم العربي</span>
            </label>
            <input
              type="text"
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Brand Colors</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-32 rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-32 rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact & Address */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Contact & Address
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+20 2 1234 5678"
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@clinic.com"
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Website
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="www.clinic.com"
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address (English)
            </label>
            <input
              type="text"
              value={addressEn}
              onChange={(e) => setAddressEn(e.target.value)}
              placeholder="15 Tahrir St, Cairo"
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span dir="rtl">العنوان (عربي)</span>
            </label>
            <input
              type="text"
              dir="rtl"
              value={addressAr}
              onChange={(e) => setAddressAr(e.target.value)}
              placeholder="15 شارع التحرير، القاهرة"
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custom CSS</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add custom styles for PDFs and documents
            </p>
          </div>
          <span className="rounded-full bg-warning-50 px-2.5 py-1 text-xs font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
            Advanced
          </span>
        </div>
        <textarea
          rows={6}
          placeholder={`/* Custom CSS for this tenant */
.invoice-header {
  border-bottom: 2px solid var(--primary-color);
}

.prescription-footer {
  font-style: italic;
}`}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Branding Preview
        </h3>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto max-w-sm space-y-4 text-center">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl text-white"
              style={{ backgroundColor: primaryColor }}
            >
              🦷
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">{nameEn}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400" dir="rtl">
              {nameAr}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Welcome to your dental clinic management portal
            </p>
            <Button variant="default" className="w-full" style={{ backgroundColor: primaryColor }}>
              Login to Portal
            </Button>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button variant="default" onClick={handleSave} disabled={updateBranding.isPending}>
          {updateBranding.isPending ? 'Saving…' : 'Save Branding'}
        </Button>
      </div>
    </div>
  );
}
