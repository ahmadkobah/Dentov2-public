/**
 * Dento v2 — Platform Seed Script
 *
 * Seeds the platform database (dento_platform) with:
 * - Platform admin user (dev account)
 * - Country configs
 * - Translation packs (EN + AR)
 *
 * Run: pnpm --filter @dento/api seed:platform
 */

import mongoose from 'mongoose';
import argon2 from 'argon2';
import { CountryConfig } from '../platform/models/country-config.model.js';
import { TranslationPack } from '../platform/models/translation-pack.model.js';
import { User } from '../platform/models/user.model.js';
import { Module } from '../platform/models/module.model.js';
import { Language } from '../platform/models/language.model.js';
import { countryConfigs } from './seed-data/country-configs.js';
import { translationsEN } from './seed-data/translations-en.js';
import { translationsAR } from './seed-data/translations-ar.js';
import { languageSeedData } from './seed-data/languages.js';
import { moduleSeedData } from './seed-data/modules.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dento_platform';

// ── Production Guard ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Seed scripts must not run in production');
  process.exit(1);
}

// ── Dev Admin Account ───────────────────────────────────────
const DEV_ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@dento.dev',
  password: process.env.SEED_ADMIN_PASSWORD || 'Admin@1234',
  role: 'platform_admin' as const,
  tenantSlug: null,
  platformRole: 'platform_owner' as const, // Platform RBAC: owner has full access
  platformPermissionOverrides: [],
  profile: {
    firstName: { en: 'Ahmad', ar: 'أحمد' },
    lastName: { en: 'Admin', ar: 'أدمن' },
    displayName: 'Ahmad (Dev)',
    languagePreference: 'en',
  },
  status: 'active' as const,
  isProfileComplete: true,
  isEmailVerified: true,
};

async function seedPlatform() {
  console.log('🌱 Starting platform seed...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── Seed Dev Admin ──────────────────────────────────────
    console.log('👤 Seeding platform admin...');
    const existingAdmin = await User.findOne({ email: DEV_ADMIN.email });

    if (existingAdmin) {
      // Upgrade existing admin to platform_owner if not already set
      if (!existingAdmin.platformRole) {
        await User.updateOne(
          { _id: existingAdmin._id },
          { $set: { platformRole: 'platform_owner', platformPermissionOverrides: [] } },
        );
        console.log(`   ✓ Upgraded ${DEV_ADMIN.email} to platform_owner`);
      } else {
        console.log(
          `   ⏭  Admin already exists: ${DEV_ADMIN.email} (platformRole: ${existingAdmin.platformRole})`,
        );
      }
    } else {
      const hashedPassword = await argon2.hash(DEV_ADMIN.password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      await User.create({
        ...DEV_ADMIN,
        password: hashedPassword,
        passwordHistory: [hashedPassword],
        tokenVersion: 0,
        activatedAt: new Date(),
      });
      console.log(`   ✓ Created: ${DEV_ADMIN.email} (role: platform_admin)`);
    }
    console.log();

    // ── Seed Country Configs ────────────────────────────────
    console.log('📍 Seeding country configs...');
    for (const config of countryConfigs) {
      await CountryConfig.updateOne({ code: config.code }, { $set: config }, { upsert: true });
      console.log(`   ✓ ${config.code} - ${config.name}`);
    }
    console.log(`   Total: ${countryConfigs.length} countries\n`);

    // ── Seed English Translations ───────────────────────────
    console.log('🇬🇧 Seeding English translations...');
    for (const [namespace, translations] of Object.entries(translationsEN)) {
      await TranslationPack.updateOne(
        { locale: 'en', namespace },
        {
          $set: {
            locale: 'en',
            namespace,
            translations,
            isDefault: true,
            version: 1,
          },
        },
        { upsert: true },
      );
      console.log(
        `   ✓ en/${namespace} (${Object.keys(translations as Record<string, string>).length} keys)`,
      );
    }

    // ── Seed Arabic Translations ────────────────────────────
    console.log('🇸🇦 Seeding Arabic translations...');
    for (const [namespace, translations] of Object.entries(translationsAR)) {
      await TranslationPack.updateOne(
        { locale: 'ar', namespace },
        {
          $set: {
            locale: 'ar',
            namespace,
            translations,
            isDefault: true,
            version: 1,
          },
        },
        { upsert: true },
      );
      console.log(
        `   ✓ ar/${namespace} (${Object.keys(translations as Record<string, string>).length} keys)`,
      );
    }

    // ── Seed Languages ───────────────────────────────────────
    console.log('\n🌐 Seeding platform languages...');
    for (const lang of languageSeedData) {
      await Language.updateOne({ code: lang.code }, { $set: lang }, { upsert: true });
      console.log(`   ✓ ${lang.code} — ${lang.name.en} (${lang.direction})`);
    }

    // ── Seed Modules ────────────────────────────────────────
    console.log('\n📦 Seeding platform modules...');
    let modulesCreated = 0;
    let modulesUpdated = 0;
    for (const mod of moduleSeedData) {
      const result = await Module.updateOne({ slug: mod.slug }, { $set: mod }, { upsert: true });
      if (result.upsertedCount > 0) {
        modulesCreated++;
        console.log(`   ✓ ${mod.slug} — created (${mod.type}/${mod.status})`);
      } else {
        modulesUpdated++;
        console.log(`   ✓ ${mod.slug} — updated (${mod.type}/${mod.status})`);
      }
    }
    console.log(`   Created: ${modulesCreated}, Updated: ${modulesUpdated}`);

    console.log('\n✅ Platform seed complete!');
    console.log('─'.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   • Platform admin: ${DEV_ADMIN.email}`);
    console.log(`   • Languages: ${languageSeedData.length}`);
    console.log(`   • Countries: ${countryConfigs.length}`);
    console.log(`   • Translation namespaces: ${Object.keys(translationsEN).length * 2}`);
    console.log(
      `   • Modules: ${moduleSeedData.length} (${modulesCreated} new, ${modulesUpdated} updated)`,
    );
    console.log('─'.repeat(50));
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run seed
seedPlatform();
