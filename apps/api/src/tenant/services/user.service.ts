/**
 * User Service — Platform DB
 *
 * Per DENTO_V2_MASTER_PLAN §12, §27 — User/Staff Management
 *
 * Users live in the Platform DB (dento_platform), NOT in tenant DBs.
 * All queries filter by tenantSlug from the authenticated user's context.
 * Invite-based creation: Admin enters email+role → status='invited'.
 */

import { type QueryFilter } from 'mongoose';
import { User, type IUser } from '../../platform/models/user.model.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';
import type {
  InviteUserInput,
  UpdateUserInput,
  UserListQuery,
  EditUserProfileInput,
} from '@dento/shared';
import { getRedis } from '../../config/redis.js';
import { hashPassword } from '../../utils/password.js';
import crypto from 'node:crypto';

export class UserService {
  private tenantSlug: string;

  constructor(tenantSlug: string) {
    this.tenantSlug = tenantSlug;
  }

  /** List all users belonging to this tenant */
  async list(query: UserListQuery) {
    const { page, limit, search, role, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IUser> = { tenantSlug: this.tenantSlug };
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { email: regexContains(search) },
        { 'profile.firstName.en': regexContains(search) },
        { 'profile.lastName.en': regexContains(search) },
        { 'profile.phone': regexContains(search) },
      ];
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Get single user by ID (must belong to this tenant) */
  async getById(id: string) {
    const user = await User.findOne({ _id: id, tenantSlug: this.tenantSlug }).lean();
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    return user;
  }

  /**
   * Invite a new user.
   * Creates with status='invited', generates activation token.
   * Per MASTER_PLAN §12: invite-based, no self-registration.
   */
  async invite(data: InviteUserInput, invitedBy: string): Promise<unknown> {
    // Check for existing user with same email in this tenant
    const existing = await User.findOne({
      email: data.email.toLowerCase(),
      tenantSlug: this.tenantSlug,
    });
    if (existing) {
      throw new ApiError(
        409,
        'USER_EXISTS',
        'A user with this email already exists in this clinic',
      );
    }

    // Generate invite token (same pattern as platform invites)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const user = await User.create({
      email: data.email.toLowerCase(),
      password: crypto.randomBytes(32).toString('hex'), // Placeholder — set on activation
      role: data.role,
      tenantSlug: this.tenantSlug,
      profile: {
        firstName: { en: data.firstName },
        lastName: { en: data.lastName },
        ...(data.phone ? { phone: data.phone } : {}),
      },
      status: 'invited',
      inviteToken: hashedToken,
      inviteTokenExpiresAt,
      invitedBy: invitedBy,
      invitedAt: new Date(),
      createdBy: invitedBy,
    });

    const result = user.toJSON();
    // Attach raw token for the route to build the invite link & send email
    return { ...result, _rawInviteToken: rawToken };
  }

  /** Update a user's role or status */
  async update(id: string, data: UpdateUserInput, updatedBy: string) {
    const user = await User.findOne({ _id: id, tenantSlug: this.tenantSlug });
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');

    // Prevent changing own role
    if (data.role && updatedBy === id) {
      throw new ApiError(400, 'CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own role');
    }

    // Prevent deactivating self
    if (data.status === 'deactivated' && updatedBy === id) {
      throw new ApiError(400, 'CANNOT_DEACTIVATE_SELF', 'You cannot deactivate yourself');
    }

    if (data.role) user.role = data.role;
    if (data.status) {
      user.status = data.status;
      // Invalidate sessions on suspend/deactivate
      if (data.status === 'suspended' || data.status === 'deactivated') {
        user.tokenVersion += 1;
      }
    }
    user.updatedBy = updatedBy as unknown as typeof user.updatedBy;
    await user.save();

    return user.toJSON();
  }

  /** Suspend a user — per MASTER_PLAN §27 */
  async suspend(id: string, updatedBy: string) {
    return this.update(id, { status: 'suspended' }, updatedBy);
  }

  /** Deactivate a user — per MASTER_PLAN §27 */
  async deactivate(id: string, updatedBy: string) {
    return this.update(id, { status: 'deactivated' }, updatedBy);
  }

  /** Reactivate a suspended/deactivated user */
  async reactivate(id: string, updatedBy: string) {
    return this.update(id, { status: 'active' }, updatedBy);
  }

  /**
   * Unlock a user account that was auto-locked by brute-force protection (M-7).
   * Resets `failedLoginCount`, clears lock metadata, restores status to 'active',
   * and clears any Redis brute-force counters keyed by the user's email.
   */
  async unlock(id: string, updatedBy: string) {
    const user = await User.findOne({ _id: id, tenantSlug: this.tenantSlug });
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');

    if (user.status !== 'locked') {
      throw new ApiError(400, 'USER_NOT_LOCKED', 'User is not locked');
    }

    user.status = 'active';
    user.failedLoginCount = 0;
    user.lockedAt = null;
    user.lockedReason = null;
    user.updatedBy = updatedBy as unknown as typeof user.updatedBy;
    await user.save();

    // Best-effort: clear Redis brute-force counters keyed by this user's email
    // across any IPs that previously hit the limit.
    try {
      const redis = getRedis();
      const emailLower = user.email.toLowerCase();
      const patterns = [`auth:attempts:*:${emailLower}`, `auth:blocked:*:${emailLower}`];
      for (const pattern of patterns) {
        let cursor = '0';
        do {
          const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
          cursor = next;
          if (batch.length > 0) {
            await redis.del(...batch);
          }
        } while (cursor !== '0');
      }
    } catch {
      // Don't fail the unlock if redis is unavailable.
    }

    return user.toJSON();
  }

  /** Get active sessions for a user — per MASTER_PLAN §27 */
  async getSessions(userId: string) {
    const user = await User.findOne({ _id: userId, tenantSlug: this.tenantSlug });
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');

    const redis = getRedis();
    const sessionKeys = await redis.keys(`session:${userId}:*`);
    const sessions = [];

    for (const key of sessionKeys) {
      const data = await redis.get(key);
      if (data) {
        try {
          sessions.push(JSON.parse(data));
        } catch {
          // Skip malformed session data
        }
      }
    }

    return sessions;
  }

  /** Revoke all sessions for a user */
  async revokeAllSessions(userId: string) {
    const user = await User.findOne({ _id: userId, tenantSlug: this.tenantSlug });
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');

    // Increment tokenVersion to invalidate all JWTs
    user.tokenVersion += 1;
    await user.save();

    // Clear Redis sessions
    const redis = getRedis();
    const sessionKeys = await redis.keys(`session:${userId}:*`);
    if (sessionKeys.length > 0) {
      await redis.del(...sessionKeys);
    }

    return { revoked: sessionKeys.length };
  }

  /** Get role distribution stats */
  async getRoleStats() {
    const stats = await User.aggregate([
      { $match: { tenantSlug: this.tenantSlug } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const statusStats = await User.aggregate([
      { $match: { tenantSlug: this.tenantSlug } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return { byRole: stats, byStatus: statusStats };
  }

  /** Edit user profile (name, phone, gender, role) */
  async editProfile(id: string, data: EditUserProfileInput, updatedBy: string) {
    const user = await User.findOne({ _id: id, tenantSlug: this.tenantSlug });
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');

    // Prevent changing own role
    if (data.role && updatedBy === id) {
      throw new ApiError(400, 'CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own role');
    }

    // Handle email change
    if (data.email && data.email.toLowerCase() !== user.email) {
      const existing = await User.findOne({
        email: data.email.toLowerCase(),
        tenantSlug: this.tenantSlug,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ApiError(
          409,
          'EMAIL_TAKEN',
          'A user with this email already exists in this clinic',
        );
      }
      user.email = data.email.toLowerCase();
      user.isEmailVerified = false;
    }

    user.profile.firstName = data.firstName;
    user.profile.lastName = data.lastName;
    if (data.phone !== undefined) user.profile.phone = data.phone ?? undefined;
    if (data.gender !== undefined) user.profile.gender = data.gender ?? undefined;
    if (data.role) user.role = data.role;
    user.updatedBy = updatedBy as unknown as typeof user.updatedBy;
    await user.save();

    return user.toJSON();
  }

  /** Admin sets a password directly for a user */
  async adminSetPassword(id: string, newPassword: string, updatedBy: string) {
    const user = await User.findOne({ _id: id, tenantSlug: this.tenantSlug }).select('+password');
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');

    user.password = await hashPassword(newPassword);
    user.lastPasswordChangedAt = new Date();
    user.tokenVersion += 1; // Invalidate existing sessions
    user.updatedBy = updatedBy as unknown as typeof user.updatedBy;

    // If user was invited/pending, move to active
    if (user.status === 'invited' || user.status === 'pending_activation') {
      user.status = 'active';
    }

    await user.save();
    return { success: true };
  }

  /** Admin force-disables 2FA for a user */
  async adminDisable2FA(id: string, updatedBy: string) {
    const user = await User.findOne({ _id: id, tenantSlug: this.tenantSlug });
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');

    if (!user.twoFactorEnabled) {
      throw new ApiError(400, '2FA_NOT_ENABLED', '2FA is not enabled for this user');
    }

    // Check if 2FA is required by policy before allowing admin disable
    try {
      const { Tenant } = await import('../../platform/models/tenant.model.js');
      const tenantDoc = await Tenant.findOne({ slug: this.tenantSlug })
        .select('settings.platformEnforce2FA')
        .lean();
      if (tenantDoc?.settings?.platformEnforce2FA) {
        throw new ApiError(
          403,
          '2FA_REQUIRED_BY_PLATFORM',
          'Platform policy requires 2FA for all users. Cannot disable.',
        );
      }

      const { getTenantDb } = await import('../../config/database.js');
      const tenantDb = await getTenantDb(this.tenantSlug);
      const { SettingsService } = await import('../services/settings.service.js');
      const settingsService = new SettingsService(tenantDb);
      const securitySettings = await settingsService.getByKey('security');
      const require2FA = (securitySettings as any)?.require2FA;
      const requiredRoles: string[] = (securitySettings as any)?.require2FAForRoles || [];

      if (require2FA && requiredRoles.length > 0 && requiredRoles.includes(user.role)) {
        throw new ApiError(
          403,
          '2FA_REQUIRED_BY_POLICY',
          `2FA is required for the "${user.role}" role. Cannot disable.`,
        );
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Settings not available — allow disable
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorPendingSecret = null;
    user.twoFactorRecoveryCodes = [];
    user.updatedBy = updatedBy as unknown as typeof user.updatedBy;
    await user.save();

    return { success: true };
  }
}
