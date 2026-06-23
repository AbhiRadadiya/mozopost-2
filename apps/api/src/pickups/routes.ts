import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const pickupsRouter = Router();
pickupsRouter.use(requireAuth, requireRole('seller'));

function sellerIdOf(req: AuthedRequest): string {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller account');
  return req.user!.sellerId;
}

pickupsRouter.get(
  '/',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const rows = await query(
      `SELECT pr.*, c.name AS courier_name, w.name AS warehouse_name
       FROM pickup_requests pr
       LEFT JOIN couriers c ON c.id = pr.courier_id
       LEFT JOIN warehouses w ON w.id = pr.warehouse_id
       WHERE pr.seller_id = $1
       ORDER BY pr.pickup_date DESC`,
      [sellerId],
    );
    res.json({ pickups: rows });
  }),
);

const createPickupSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  courierId: z.string().uuid().optional(),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedPackageCount: z.number().int().min(1).default(1),
  timeSlot: z.string().optional(),
});

pickupsRouter.post(
  '/',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const dto = createPickupSchema.parse(req.body);
    const row = await queryOne(
      `INSERT INTO pickup_requests
         (seller_id, warehouse_id, courier_id, pickup_date, expected_package_count)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [sellerId, dto.warehouseId||null, dto.courierId||null, dto.pickupDate, dto.expectedPackageCount],
    );
    res.status(201).json({ pickup: row });
  }),
);

pickupsRouter.patch(
  '/:id/cancel',
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const pr = await queryOne(`SELECT * FROM pickup_requests WHERE id=$1 AND seller_id=$2`, [req.params.id, sellerId]);
    if (!pr) throw new ApiError(404, 'Pickup not found');
    await query(`UPDATE pickup_requests SET status='cancelled' WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Pickup cancelled' });
  }),
);

// Admin pickup management
export const adminPickupsRouter = Router();
adminPickupsRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

adminPickupsRouter.get(
  '/',
  ah(async (req, res) => {
    const { status, date } = req.query as Record<string, string>;
    const params: any[] = [];
    const filters: string[] = [];
    if (status) { params.push(status); filters.push(`pr.status=$${params.length}`); }
    if (date)   { params.push(date);   filters.push(`pr.pickup_date=$${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await query(
      `SELECT pr.*, s.business_name, c.name AS courier_name, w.name AS warehouse_name
       FROM pickup_requests pr
       JOIN sellers s ON s.id=pr.seller_id
       LEFT JOIN couriers c ON c.id=pr.courier_id
       LEFT JOIN warehouses w ON w.id=pr.warehouse_id
       ${where} ORDER BY pr.pickup_date DESC LIMIT 100`,
      params,
    );
    res.json({ pickups: rows });
  }),
);

adminPickupsRouter.patch(
  '/:id/status',
  ah(async (req, res) => {
    const { status } = req.body;
    await query(`UPDATE pickup_requests SET status=$1 WHERE id=$2`, [status, req.params.id]);
    res.json({ message: `Pickup status updated to ${status}` });
  }),
);
