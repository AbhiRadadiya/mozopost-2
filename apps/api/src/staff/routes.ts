import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

// ─── ROLES ────────────────────────────────────────────────────────────────────
export const rolesRouter = Router();
rolesRouter.use(requireAuth, requireRole('super_admin'));

const PERMISSIONS = [
  'view_merchants','create_merchants','edit_merchants','delete_merchants','approve_merchants',
  'view_orders','create_orders','edit_orders','cancel_orders',
  'view_wallet','adjust_wallet','export_wallet',
  'view_credit','manage_credit',
  'view_disputes','resolve_disputes','refund_disputes',
  'view_ndr','resolve_ndr',
  'view_cod','release_cod',
  'view_reports','export_reports',
  'view_couriers','manage_couriers','manage_rate_cards',
  'view_staff','manage_staff',
  'view_global_settings','edit_global_settings',
  'view_audit_logs',
];

/** GET /api/v1/super-admin/roles  — list all custom roles */
rolesRouter.get(
  '/',
  ah(async (_req, res) => {
    const rows = await query(`SELECT * FROM staff_roles ORDER BY created_at ASC`);
    res.json({ roles: rows, availablePermissions: PERMISSIONS });
  }),
);

const roleSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  permissions: z.array(z.string()),
  description: z.string().max(500).optional(),
});

/** POST /  — create a new role */
rolesRouter.post(
  '/',
  ah(async (req: AuthedRequest, res) => {
    const dto = roleSchema.parse(req.body);
    const row = await queryOne(
      `INSERT INTO staff_roles (name, display_name, permissions, description, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [dto.name, dto.displayName, JSON.stringify(dto.permissions), dto.description || null, req.user!.sub],
    );
    res.status(201).json({ role: row });
  }),
);

/** PATCH /:id  — update role permissions */
rolesRouter.patch(
  '/:id',
  ah(async (req, res) => {
    const { permissions, displayName, description } = req.body;
    await query(
      `UPDATE staff_roles SET permissions=$1, display_name=COALESCE($2,display_name),
       description=COALESCE($3,description), updated_at=NOW() WHERE id=$4`,
      [JSON.stringify(permissions), displayName || null, description || null, req.params.id],
    );
    res.json({ message: 'Role updated' });
  }),
);

/** DELETE /:id  — delete a custom role (not a system role) */
rolesRouter.delete(
  '/:id',
  ah(async (req, res) => {
    const role = await queryOne<{ is_system: boolean }>(`SELECT is_system FROM staff_roles WHERE id=$1`, [req.params.id]);
    if (!role) throw new ApiError(404, 'Role not found');
    if (role.is_system) throw new ApiError(422, 'Cannot delete a system role');
    await query(`DELETE FROM staff_roles WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Role deleted' });
  }),
);

// ─── STAFF ────────────────────────────────────────────────────────────────────
export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole('super_admin', 'master_admin'));

/** GET /api/v1/admin/staff */
staffRouter.get(
  '/',
  ah(async (_req, res) => {
    const rows = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status,
              u.last_login_at, u.created_at,
              sr.display_name AS role_display_name, sr.permissions
       FROM users u
       LEFT JOIN staff_roles sr ON sr.name = u.role::text
       WHERE u.role IN ('master_admin','super_admin','staff')
       ORDER BY u.created_at DESC`,
    );
    res.json({ staff: rows });
  }),
);

const addStaffSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(['master_admin','staff']),
  department: z.string().optional(),
  designation: z.string().optional(),
});

/** POST /  — add a new staff member */
staffRouter.post(
  '/',
  ah(async (req: AuthedRequest, res) => {
    const dto = addStaffSchema.parse(req.body);
    const exists = await queryOne(`SELECT id FROM users WHERE email=$1`, [dto.email]);
    if (exists) throw new ApiError(409, 'Email already registered');
    const hash = await bcrypt.hash(dto.password, 10);
    const tenant = await queryOne<{ id: string }>(`SELECT id FROM tenants WHERE slug='mozopost' LIMIT 1`);
    const user = await queryOne(
      `INSERT INTO users (tenant_id,email,phone,password_hash,first_name,last_name,role,status,email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',true) RETURNING id,email,first_name,last_name,role`,
      [tenant!.id, dto.email, dto.phone||null, hash, dto.firstName, dto.lastName||null, dto.role],
    );
    res.status(201).json({ staff: user });
  }),
);

/** PATCH /:id/status  — activate / deactivate */
staffRouter.patch(
  '/:id/status',
  ah(async (req, res) => {
    const { status } = req.body; // 'active' | 'inactive'
    await query(`UPDATE users SET status=$1 WHERE id=$2`, [status, req.params.id]);
    res.json({ message: `Staff ${status}` });
  }),
);

/** DELETE /:id  — remove staff */
staffRouter.delete(
  '/:id',
  ah(async (req: AuthedRequest, res) => {
    if (req.params.id === req.user!.sub) throw new ApiError(422, 'Cannot remove yourself');
    await query(`UPDATE users SET status='inactive' WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Staff removed' });
  }),
);
