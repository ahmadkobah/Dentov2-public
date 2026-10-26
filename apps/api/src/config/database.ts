import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDatabase(): Promise<typeof mongoose> {
  if (isConnected) return mongoose;

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error({ err: error }, '❌ MongoDB connection failed');
    process.exit(1);
  }
}

/**
 * Get a tenant-specific database connection using useDb().
 * Each tenant has its own database: tenant_{slug}
 */
export function getTenantDb(tenantSlug: string) {
  return mongoose.connection.useDb(`tenant_${tenantSlug}`, { useCache: true });
}
