import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { pool, query, queryOne, withTransaction } from '../db/pool';
import { signAccessToken, verifyAccessToken } from '../auth/jwt';
import { ah, ApiError, requireAuth, AuthedRequest } from '../middleware';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  phone: z.string().min(10).max(15),
  businessName: z.string().min(1),
  gstin: z.string().optional(),
});

authRouter.post(
  '/register',
  ah(async (req, res) => {
    const dto = registerSchema.parse(req.body);

    const exists = await queryOne(`SELECT id FROM users WHERE email = $1`, [dto.email]);
    if (exists) throw new ApiError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await withTransaction(async (client) => {
      const tenant = await client.query(`SELECT id FROM tenants WHERE slug = 'mozopost' LIMIT 1`);
      const tenantId = tenant.rows[0].id;

      const userRes = await client.query(
        `INSERT INTO users (tenant_id, email, phone, password_hash, first_name, last_name, role, status, kyc_status)
         VALUES ($1,$2,$3,$4,$5,$6,'seller','pending_kyc','pending') RETURNING id, email, first_name, last_name, role`,
        [tenantId, dto.email, dto.phone, passwordHash, dto.firstName, dto.lastName || null],
      );
      const user = userRes.rows[0];

      const sellerRes = await client.query(
        `INSERT INTO sellers (user_id, business_name, gstin) VALUES ($1,$2,$3) RETURNING id`,
        [user.id, dto.businessName, dto.gstin || null],
      );
      const sellerId = sellerRes.rows[0].id;

      await client.query(`INSERT INTO wallets (seller_id, balance) VALUES ($1, 0)`, [sellerId]);

      // Enable all active couriers by default for new sellers
      await client.query(
        `INSERT INTO merchant_courier_access (seller_id, courier_id, is_enabled, priority)
         SELECT $1, id, true, priority FROM couriers WHERE status = 'active'`,
        [sellerId],
      );

      return { user, sellerId };
    });

    const accessToken = signAccessToken({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      sellerId: result.sellerId,
    });

    const refreshToken = uuid();
    const refreshHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`, [
      result.user.id,
      refreshHash,
      expiresAt,
    ]);

    res.status(201).json({
      user: { ...result.user, sellerId: result.sellerId },
      accessToken,
      refreshToken,
    });
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  ah(async (req, res) => {
    const dto = loginSchema.parse(req.body);

    const user = await queryOne<any>(
      `SELECT u.*, s.id as seller_id FROM users u
       LEFT JOIN sellers s ON s.user_id = u.id
       WHERE u.email = $1`,
      [dto.email],
    );
    if (!user) throw new ApiError(401, 'Invalid email or password');

    // if (user.locked_until && new Date(user.locked_until) > new Date()) {
    //   throw new ApiError(423, 'Account temporarily locked due to failed login attempts. Try again later.');
    // }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      const attempts = (user.login_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await query(`UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3`, [attempts, lockUntil, user.id]);
      throw new ApiError(401, 'Invalid email or password');
    }

    await query(`UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1`, [user.id]);

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      sellerId: user.seller_id || undefined,
    });

    const refreshToken = uuid();
    const refreshHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
      [user.id, refreshHash, expiresAt],
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        sellerId: user.seller_id || undefined,
      },
      accessToken,
      refreshToken,
    });
  }),
);

authRouter.post(
  '/refresh',
  ah(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ApiError(400, 'refreshToken is required');

    // Refresh tokens are stored hashed; we must scan active, unexpired tokens.
    // For simplicity at this scale, look up by user supplied in a short-lived
    // companion cookie/header would be ideal; here we accept email for lookup.
    const candidates = await query<any>(
      `SELECT rt.*, u.email, u.role FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
    );

    let matched: any = null;
    for (const c of candidates) {
      if (await bcrypt.compare(refreshToken, c.token_hash)) {
        matched = c;
        break;
      }
    }
    if (!matched) throw new ApiError(401, 'Invalid or expired refresh token');

    await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [matched.id]);

    const newRefreshToken = uuid();
    const newRefreshHash = await bcrypt.hash(newRefreshToken, 8);
    await query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`, [
      matched.user_id, newRefreshHash, matched.expires_at
    ]);

    const seller = await queryOne<{ id: string }>(`SELECT id FROM sellers WHERE user_id = $1`, [matched.user_id]);

    const accessToken = signAccessToken({
      sub: matched.user_id,
      email: matched.email,
      role: matched.role,
      sellerId: seller?.id,
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  ah(async (req: AuthedRequest, res) => {
    const user = await queryOne<any>(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.kyc_status,
              s.id as seller_id, s.business_name, w.balance as wallet_balance
       FROM users u
       LEFT JOIN sellers s ON s.user_id = u.id
       LEFT JOIN wallets w ON w.seller_id = s.id
       WHERE u.id = $1`,
      [req.user!.sub],
    );
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ user });
  }),
);

authRouter.post(
  '/logout',
  requireAuth,
  ah(async (req: AuthedRequest, res) => {
    await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [req.user!.sub]);
    res.json({ message: 'Logged out' });
  }),
);
