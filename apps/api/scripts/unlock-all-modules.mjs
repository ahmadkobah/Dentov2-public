/**
 * One-time script: Set enabledModules=[] on all tenants to unlock all modules.
 * Run: node scripts/unlock-all-modules.mjs
 */
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
const envVars = Object.fromEntries(
  envFile
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim()))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k, v.join('=')]),
);

const uri = envVars.MONGODB_URI || 'mongodb://localhost:27017/dento_platform';
await mongoose.connect(uri);

const result = await mongoose.connection.db
  .collection('tenants')
  .updateMany({}, { $set: { enabledModules: [] } });

console.log(`Updated ${result.modifiedCount} tenant(s) — enabledModules set to [] (all unlocked)`);
await mongoose.disconnect();
