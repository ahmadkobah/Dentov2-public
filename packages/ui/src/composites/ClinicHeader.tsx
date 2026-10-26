/**
 * ClinicHeader — Reusable component for all document templates (§14/§15)
 *
 * Used in: Invoice, Prescription, Treatment Plan, Consent Form, Lab Order PDFs.
 * Always shows Main Branch address (multi-branch logic per §14).
 *
 * Props:
 * - branding: logoUrl, clinicName (en+ar), address, phone, email
 * - doctor: optional doctor info (name, specialty, license)
 * - showDoctor: whether to display doctor info
 */

import { cn } from '../utils/cn';

export interface ClinicHeaderBranding {
  logoUrl: string | null;
  clinicName: { en: string; ar?: string };
  address: string;
  phone: string;
  email: string;
}

export interface ClinicHeaderDoctor {
  name: { en: string; ar?: string };
  specialty: { en: string; ar?: string };
  licenseNumber?: string;
}

export interface ClinicHeaderProps {
  branding: ClinicHeaderBranding;
  doctor?: ClinicHeaderDoctor;
  showDoctor?: boolean;
  className?: string;
}

export function ClinicHeader({
  branding,
  doctor,
  showDoctor = false,
  className = '',
}: ClinicHeaderProps) {
  return (
    <div className={cn('clinic-header border-b-2 pb-4 mb-4', className)}>
      <div className="flex items-start gap-4">
        {/* Logo */}
        {branding.logoUrl && (
          <img
            src={branding.logoUrl}
            alt={branding.clinicName.en}
            className="w-20 h-20 object-contain"
          />
        )}

        {/* Clinic Info */}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{branding.clinicName.en}</h1>
          {branding.clinicName.ar && (
            <h2 dir="rtl" className="text-lg text-gray-700">
              {branding.clinicName.ar}
            </h2>
          )}
          {branding.address && <p className="text-sm text-gray-600">{branding.address}</p>}
          <p className="text-sm text-gray-600">
            {branding.phone}
            {branding.phone && branding.email && ' | '}
            {branding.email}
          </p>
        </div>

        {/* Doctor (only when showDoctor=true) — §15 */}
        {showDoctor && doctor && (
          <div className="text-end">
            <p className="font-bold">{doctor.name.en}</p>
            {doctor.name.ar && (
              <p dir="rtl" className="text-gray-700">
                {doctor.name.ar}
              </p>
            )}
            <p className="text-sm text-gray-500">{doctor.specialty.en}</p>
            {doctor.licenseNumber && (
              <p className="text-sm text-gray-500">Lic: {doctor.licenseNumber}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
