import argon2 from 'argon2';

/**
 * Argon2id Password Hashing
 *
 * Configuration per V2_DECISION_LOG.md:
 * - Type: argon2id (hybrid: side-channel + GPU resistant)
 * - Memory: 64 MB
 * - Time: 3 iterations
 * - Parallelism: 4 threads
 * - Hash Length: 32 bytes (256-bit)
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB RAM
  timeCost: 3, // 3 iterations
  parallelism: 4, // 4 threads
  hashLength: 32, // 256-bit output
};

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, ARGON2_OPTIONS);
}

/**
 * Verify a password against an Argon2id hash
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hashedPassword, plainPassword);
  } catch {
    return false;
  }
}

/**
 * Check if a password needs rehashing (e.g., if options changed)
 */
export function needsRehash(hashedPassword: string): boolean {
  return argon2.needsRehash(hashedPassword, ARGON2_OPTIONS);
}
