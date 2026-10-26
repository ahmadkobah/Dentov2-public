/**
 * Shared print utility for all document types.
 *
 * Opens a styled print window with clinic branding header.
 * Preserves innerHTML (so signatures, images, etc. render correctly).
 */

export interface PrintOptions {
  title: string;
  /** The innerHTML content to print (preserves images/signatures) */
  content: string;
  /** Optional extra CSS to inject */
  extraCss?: string;
  /** Clinic branding shown at the top of the print page */
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string;
  direction?: 'ltr' | 'rtl';
}

const BASE_CSS = `
  body { direction: inherit; font-family: Arial, sans-serif; margin: 40px; color: #333; font-size: 14px; text-align: start; }
  h1, h2, h3 { margin: 0 0 4px; }
  .print-header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
  html[dir='rtl'] .print-header { flex-direction: row-reverse; }
  .print-header img { height: 60px; width: auto; object-fit: contain; }
  .clinic-info { text-align: start; }
  .clinic-info h2 { font-size: 18px; color: #0f766e; }
  .clinic-info p { color: #555; font-size: 13px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: start; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
  @media print { body { margin: 20px; } }
`;

/** Escapes a string for safe HTML insertion */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Opens a PDF blob in a new window and triggers window.print().
 * Falls back to just opening the tab if popups are blocked.
 */
export async function printPdfBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('load', () => {
      win.print();
      URL.revokeObjectURL(url);
    });
  } else {
    // Popup blocked — blob URL stays open in current tab
    URL.revokeObjectURL(url);
  }
}

/** Opens a new print window and triggers window.print() */
export function printDocument(opts: PrintOptions): void {
  const win = window.open('', '_blank');
  if (!win) return;

  const safeTitle = escapeHtml(opts.title);
  const direction = opts.direction ?? (document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr');

  const brandingHtml = opts.clinicName
    ? `<div class="print-header">
        ${opts.logoUrl ? `<img src="${escapeHtml(opts.logoUrl)}" alt="logo" />` : ''}
        <div class="clinic-info">
          <h2>${escapeHtml(opts.clinicName)}</h2>
          ${opts.clinicAddress ? `<p>${escapeHtml(opts.clinicAddress)}</p>` : ''}
          ${opts.clinicPhone ? `<p>${escapeHtml(opts.clinicPhone)}</p>` : ''}
        </div>
      </div>`
    : '';

  win.document.write(`<!DOCTYPE html>
<html dir="${direction}">
<head>
  <title>${safeTitle}</title>
  <style>${BASE_CSS}${opts.extraCss ?? ''}</style>
</head>
<body>
  ${brandingHtml}
  ${opts.content}
</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}
