/**
 * Color Scale Generator — Clinic App
 *
 * Generates a full 25-950 color scale from a single hex color.
 * Used by useBrandingTheme to create CSS custom properties from
 * the tenant's primaryColor / accentColor hex values.
 *
 * Algorithm: lightens for lower shades, darkens for higher shades,
 * using HSL manipulation. Scale matches TailAdmin conventions.
 */

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);

  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Target lightness values for each TailAdmin shade.
 * These map a single base color (500) to a full scale.
 */
const SHADE_LIGHTNESS: Record<string, number> = {
  '25': 97,
  '50': 95,
  '100': 90,
  '200': 82,
  '300': 70,
  '400': 58,
  '500': 0, // placeholder — use original
  '600': 38,
  '700': 30,
  '800': 24,
  '900': 18,
  '950': 12,
};

/**
 * Generate a full color scale from a single hex color.
 * Returns an object mapping shade numbers to hex values.
 *
 * Example: generateColorScale('#16a34a')
 * → { '25': '#f0fdf4', '50': '#dcfce7', ... '950': '#022c22' }
 */
export function generateColorScale(baseHex: string): Record<string, string> {
  const { h, s } = hexToHSL(baseHex);
  const scale: Record<string, string> = {};

  for (const [shade, targetL] of Object.entries(SHADE_LIGHTNESS)) {
    if (shade === '500') {
      scale[shade] = baseHex;
    } else {
      // Desaturate extremes slightly for a natural feel
      const satAdjust = Number(shade) < 100 ? s * 0.3 : Number(shade) > 800 ? s * 0.85 : s;
      scale[shade] = hslToHex(h, satAdjust, targetL);
    }
  }

  return scale;
}

/**
 * Apply a color scale to CSS custom properties on a target element.
 *
 * @param element - The target element (usually document.documentElement)
 * @param prefix  - CSS variable prefix (e.g., '--color-brand')
 * @param scale   - Color scale from generateColorScale()
 */
export function applyColorScaleToElement(
  element: HTMLElement,
  prefix: string,
  scale: Record<string, string>,
): void {
  for (const [shade, hex] of Object.entries(scale)) {
    element.style.setProperty(`${prefix}-${shade}`, hex);
  }
}
