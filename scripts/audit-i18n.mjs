/**
 * i18n Audit Script — Compares EN bundled keys vs AR seed keys
 * Run: node scripts/audit-i18n.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── Parse AR seed file ─────────────────────────────────
const arFile = readFileSync(
  resolve(root, 'apps/api/src/scripts/seed-data/translations-ar.ts'),
  'utf8',
);

function parseARSeed(content) {
  const namespaces = {};
  let currentNS = null;
  let braceDepth = 0;

  for (const line of content.split('\n')) {
    // Top-level namespace: "  namespaceName: {"
    const nsMatch = line.match(/^\s{2}(\w+)\s*:\s*\{/);
    if (nsMatch && braceDepth === 0) {
      currentNS = nsMatch[1];
      namespaces[currentNS] = [];
      braceDepth = 1;
      continue;
    }

    if (currentNS) {
      // Count braces
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      // Key line: "'some.key': 'value',"
      const keyMatch = line.match(/^\s+'([^']+)'\s*:/);
      if (keyMatch) {
        namespaces[currentNS].push(keyMatch[1]);
      }

      if (braceDepth === 0) {
        currentNS = null;
      }
    }
  }
  return namespaces;
}

// ─── Parse EN bundled translations at runtime ───────────
// We can't easily import the TS file, so we'll parse the EN sources directly

function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      result[key] = v;
    } else if (typeof v === 'object' && v !== null) {
      Object.assign(result, flatten(v, key));
    }
  }
  return result;
}

function stripTSExport(content) {
  // Remove "export const xxx = " prefix and " as const;" suffix
  let cleaned = content
    .replace(/export\s+const\s+\w+\s*=\s*/, '')
    .replace(/\}\s*as\s+const\s*;?\s*$/, '}')
    .replace(/\/\/[^\n]*/g, '') // strip comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // strip block comments
  return cleaned;
}

function parseENFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const cleaned = stripTSExport(content);
    // Use Function constructor to evaluate (safe for static data)
    const fn = new Function(`return (${cleaned})`);
    return fn();
  } catch (e) {
    console.error(`  Failed to parse ${filePath}: ${e.message}`);
    return null;
  }
}

// ─── Build EN bundled map ───────────────────────────────
const enBundled = {};
const adminI18n = resolve(root, 'apps/admin/src/i18n');

// Feature files (flat format — keys already include namespace prefix for some)
const featureNames = [
  'appointmentTypes',
  'appointments',
  'attendance',
  'auditLogs',
  'auth',
  'branches',
  'cbct',
  'commissions',
  'consent',
  'dashboard',
  'dentalCharts',
  'onboarding',
  'onlineBookings',
  'operations',
  'patients',
  'payments',
  'prescriptions',
  'procedureNotes',
  'profile',
  'reports',
  'schedules',
  'services',
];
for (const name of featureNames) {
  const data = parseENFile(resolve(adminI18n, `features/${name}.ts`));
  if (data) enBundled[name] = Object.keys(data);
}

// Locale files (nested — need flattening)
const localeNames = [
  'dentalLabs',
  'doctors',
  'documents',
  'installments',
  'insurance',
  'inventory',
  'invoices',
  'labOrders',
  'leave',
  'medications',
  'notifications',
];
for (const name of localeNames) {
  const data = parseENFile(resolve(adminI18n, `locales/en/${name}.ts`));
  if (data) enBundled[name] = Object.keys(flatten(data));
}

// Key files (nested — need flattening)
const keyNames = [
  'settings',
  'subscription',
  'support',
  'treatmentPlans',
  'users',
  'webhooks',
  'xrays',
  'docs',
  'platformNotes',
  'uploads',
  'components',
];
for (const name of keyNames) {
  const data = parseENFile(resolve(adminI18n, `keys/${name}.ts`));
  if (data) enBundled[name] = Object.keys(flatten(data));
}

// Inline: 'app' and 'common' - parsed from bundled-translations.ts
// We'll read the bundled file and manually count them
const bundledContent = readFileSync(resolve(adminI18n, 'bundled-translations.ts'), 'utf8');

// Extract app keys
const appKeys = [];
const appMatch = bundledContent.match(/app:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
if (appMatch) {
  const appBlock = appMatch[1];
  for (const m of appBlock.matchAll(/'([^']+)'\s*:/g)) {
    appKeys.push(m[1]);
  }
}
// Also count unquoted keys like: darkMode, language, notifications
for (const m of (appMatch?.[1] || '').matchAll(/^\s+(\w[\w.]*)\s*:/gm)) {
  if (!m[1].includes("'")) appKeys.push(m[1]);
}
enBundled['app'] = [...new Set(appKeys)];

// Extract common keys
const commonKeys = [];
const commonMatch = bundledContent.match(/common:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/);
if (commonMatch) {
  for (const m of commonMatch[1].matchAll(/'([^']+)'\s*:/g)) {
    commonKeys.push(m[1]);
  }
}
enBundled['common'] = [...new Set(commonKeys)];

// ─── Parse AR ───────────────────────────────────────────
const arNamespaces = parseARSeed(arFile);

// ─── Compare ────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════');
console.log('  i18n AUDIT — EN Bundled vs AR Seed Key Comparison');
console.log('═══════════════════════════════════════════════════════\n');

let totalENKeys = 0;
let totalARKeys = 0;
let totalMissing = 0;
let totalExtra = 0;
const issues = [];

const allNamespaces = [
  ...new Set([...Object.keys(enBundled), ...Object.keys(arNamespaces)]),
].sort();

for (const ns of allNamespaces) {
  const enKeys = new Set(enBundled[ns] || []);
  const arKeys = new Set(arNamespaces[ns] || []);

  totalENKeys += enKeys.size;
  totalARKeys += arKeys.size;

  const missingInAR = [...enKeys].filter((k) => !arKeys.has(k));
  const extraInAR = [...arKeys].filter((k) => !enKeys.has(k));

  if (missingInAR.length > 0 || extraInAR.length > 0 || !enBundled[ns] || !arNamespaces[ns]) {
    let status = '';
    if (!enBundled[ns]) status = '⚠ ONLY IN AR';
    else if (!arNamespaces[ns]) status = '⚠ ONLY IN EN';
    else if (missingInAR.length === 0 && extraInAR.length === 0) status = '✓ MATCH';
    else status = `✗ MISMATCH`;

    console.log(`\n── ${ns} ${status} ──`);
    console.log(`   EN: ${enKeys.size} keys | AR: ${arKeys.size} keys`);

    if (missingInAR.length > 0) {
      totalMissing += missingInAR.length;
      console.log(`   MISSING in AR (${missingInAR.length}):`);
      for (const k of missingInAR.slice(0, 15)) console.log(`     - ${k}`);
      if (missingInAR.length > 15) console.log(`     ... and ${missingInAR.length - 15} more`);
      issues.push({ ns, type: 'missing', count: missingInAR.length, keys: missingInAR });
    }

    if (extraInAR.length > 0) {
      totalExtra += extraInAR.length;
      console.log(`   EXTRA in AR (${extraInAR.length}):`);
      for (const k of extraInAR.slice(0, 10)) console.log(`     + ${k}`);
      if (extraInAR.length > 10) console.log(`     ... and ${extraInAR.length - 10} more`);
    }
  }
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Namespaces checked: ${allNamespaces.length}`);
console.log(`  Total EN bundled keys: ${totalENKeys}`);
console.log(`  Total AR seed keys:    ${totalARKeys}`);
console.log(`  Missing in AR:         ${totalMissing}`);
console.log(`  Extra in AR:           ${totalExtra}`);
console.log(
  `  Coverage: ${totalENKeys > 0 ? ((1 - totalMissing / totalENKeys) * 100).toFixed(1) : 0}%`,
);
console.log('═══════════════════════════════════════════════════════');

if (issues.length > 0) {
  console.log(`\n  ⚠ ${issues.length} namespaces with missing keys need attention.`);
}
