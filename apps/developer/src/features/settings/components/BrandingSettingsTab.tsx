/**
 * BrandingSettingsTab — Platform name, logo, favicon, colors, landing page
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.9
 * Supports both URL input and file upload for logo & favicon.
 */

import { useState, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  toast,
} from '@dento/ui';
import { Save, RotateCcw, Palette, Upload, Loader2, X } from 'lucide-react';
import type { Branding, UpdateBrandingInput } from '@dento/shared';
import { useUpdateBranding } from '../hooks/useSystemSettings.js';
import { useBrandingUpload } from '../hooks/useBrandingUpload.js';

interface Props {
  branding: Branding;
}

// ── Image Upload Field ──────────────────────────────────────

function ImageUploadField({
  label,
  id,
  value,
  onChange,
  accept,
  previewSize,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (key: string) => void;
  accept: string;
  previewSize: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useBrandingUpload();
  // After upload we store the S3 key in the form but need a displayable URL for preview
  const [previewOverride, setPreviewOverride] = useState<string>('');
  // Show the presigned preview URL if we just uploaded, otherwise show the value from API
  const displayUrl = previewOverride || value;

  const handleFile = async (file: File) => {
    try {
      const result = await upload(file);
      onChange(result.key); // store S3 key in form → saved to DB
      setPreviewOverride(result.url); // presigned URL for immediate preview
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      {/* Preview + Upload area */}
      <div
        className="relative flex items-center gap-4 rounded-lg border-2 border-dashed border-gray-200 p-4 transition-colors hover:border-brand-300 dark:border-gray-700 dark:hover:border-brand-600"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {displayUrl ? (
          <div className="relative">
            <img
              src={displayUrl}
              alt={`${label} preview`}
              className={`${previewSize} rounded-lg border object-contain bg-white dark:bg-gray-900 dark:border-gray-700`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '';
                (e.target as HTMLImageElement).alt = 'Invalid image';
              }}
            />
            <button
              type="button"
              onClick={() => {
                onChange('');
                setPreviewOverride('');
              }}
              className="absolute -right-2 -top-2 rounded-full bg-error-500 p-0.5 text-white shadow-sm hover:bg-error-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            className={`${previewSize} flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800`}
          >
            <Upload className="h-5 w-5 text-gray-400" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="me-1.5 h-3.5 w-3.5" />
              )}
              {isUploading ? 'Uploading…' : 'Upload File'}
            </Button>
            <span className="text-xs text-gray-400">or drag & drop</span>
          </div>
          <Input
            id={id}
            type="url"
            placeholder="https://example.com/image.png"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs"
          />
          <p className="text-xs text-gray-400">PNG, JPG, WebP, SVG, ICO — max 5 MB</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}

export function BrandingSettingsTab({ branding }: Props) {
  const updateMutation = useUpdateBranding();

  const [form, setForm] = useState<UpdateBrandingInput>({
    platformName: branding.platformName,
    logoUrl: branding.logoUrl,
    faviconUrl: branding.faviconUrl,
    primaryColor: branding.primaryColor,
    landingPageUrl: branding.landingPageUrl,
  });

  const isDirty =
    form.platformName !== branding.platformName ||
    form.logoUrl !== branding.logoUrl ||
    form.faviconUrl !== branding.faviconUrl ||
    form.primaryColor !== branding.primaryColor ||
    form.landingPageUrl !== branding.landingPageUrl;

  const handleReset = () => {
    setForm({
      platformName: branding.platformName,
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
      primaryColor: branding.primaryColor,
      landingPageUrl: branding.landingPageUrl,
    });
  };

  const handleSave = () => {
    const updates: UpdateBrandingInput = {};
    if (form.platformName !== branding.platformName) updates.platformName = form.platformName;
    if (form.logoUrl !== branding.logoUrl) updates.logoUrl = form.logoUrl;
    if (form.faviconUrl !== branding.faviconUrl) updates.faviconUrl = form.faviconUrl;
    if (form.primaryColor !== branding.primaryColor) updates.primaryColor = form.primaryColor;
    if (form.landingPageUrl !== branding.landingPageUrl)
      updates.landingPageUrl = form.landingPageUrl;
    if (Object.keys(updates).length > 0) updateMutation.mutate(updates);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Customize the platform name, logo, favicon, accent color, and landing page URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform Name */}
        <div className="space-y-2">
          <Label htmlFor="br-name">Platform Name</Label>
          <Input
            id="br-name"
            value={form.platformName ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, platformName: e.target.value }))}
            maxLength={200}
          />
        </div>

        {/* Logo */}
        <ImageUploadField
          label="Logo"
          id="br-logo"
          value={form.logoUrl ?? ''}
          onChange={(url) => setForm((p) => ({ ...p, logoUrl: url }))}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          previewSize="h-16 w-16"
        />

        {/* Favicon */}
        <ImageUploadField
          label="Favicon"
          id="br-favicon"
          value={form.faviconUrl ?? ''}
          onChange={(url) => setForm((p) => ({ ...p, faviconUrl: url }))}
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
          previewSize="h-10 w-10"
        />

        {/* Primary Color */}
        <div className="space-y-2">
          <Label htmlFor="br-color">Primary Color</Label>
          <div className="flex items-center gap-3">
            <Input
              id="br-color"
              value={form.primaryColor ?? '#2563EB'}
              onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
              placeholder="#2563EB"
              className="max-w-40"
            />
            <div
              className="h-9 w-9 rounded-md border dark:border-gray-700"
              style={{ backgroundColor: form.primaryColor ?? '#2563EB' }}
            />
            <Palette className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Hex format: #RRGGBB</span>
          </div>
        </div>

        {/* Landing Page URL */}
        <div className="space-y-2">
          <Label htmlFor="br-landing">Landing Page URL</Label>
          <Input
            id="br-landing"
            type="url"
            placeholder="https://dento.app"
            value={form.landingPageUrl ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, landingPageUrl: e.target.value }))}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-4 dark:border-gray-800">
          <Button variant="outline" disabled={!isDirty} onClick={handleReset}>
            <RotateCcw className="me-1.5 h-4 w-4" />
            Reset
          </Button>
          <Button disabled={!isDirty || updateMutation.isPending} onClick={handleSave}>
            <Save className="me-1.5 h-4 w-4" />
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
