import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

function sellerIdOf(req: AuthedRequest): string {
  if (!req.user!.sellerId) throw new ApiError(403, 'Not a seller account');
  return req.user!.sellerId;
}

// ────────────────────────────────────────────────────────────────
// SELLER ROUTES  (/api/v1/tickets)
// ────────────────────────────────────────────────────────────────

ticketsRouter.get(
  '/',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const rows = await query(
      `SELECT t.*, o.mozopost_order_id, o.awb_number
       FROM tickets t
       LEFT JOIN orders o ON o.id = t.order_id
       WHERE t.seller_id = $1
       ORDER BY t.created_at DESC`,
      [sellerId]
    );
    res.json({ tickets: rows });
  })
);

const createTicketSchema = z.object({
  type: z.string().min(1),
  subject: z.string().min(1),
  description: z.string().min(1),
});

ticketsRouter.post(
  '/',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const dto = createTicketSchema.parse(req.body);

    const row = await queryOne(
      `INSERT INTO tickets (seller_id, type, subject, description, status, priority)
       VALUES ($1, $2, $3, $4, 'open', 'medium')
       RETURNING *`,
      [sellerId, dto.type, dto.subject, dto.description]
    );

    res.status(201).json({ ticket: row });
  })
);

ticketsRouter.patch(
  '/:id/escalate',
  requireRole('seller'),
  ah(async (req: AuthedRequest, res) => {
    const sellerId = sellerIdOf(req);
    const row = await queryOne(
      `UPDATE tickets SET status = 'escalated' 
       WHERE id = $1 AND seller_id = $2 AND status = 'open'
       RETURNING *`,
      [req.params.id, sellerId]
    );
    if (!row) throw new ApiError(404, 'Ticket not found or cannot be escalated');
    res.json({ ticket: row });
  })
);

// ────────────────────────────────────────────────────────────────
// ADMIN ROUTES  (/api/v1/admin/tickets)
// ────────────────────────────────────────────────────────────────

export const adminTicketsRouter = Router();
adminTicketsRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

adminTicketsRouter.get(
  '/',
  ah(async (req, res) => {
    const rows = await query(
      `SELECT t.*, s.business_name
       FROM tickets t
       JOIN sellers s ON s.id = t.seller_id
       ORDER BY CASE WHEN t.status = 'open' THEN 1 WHEN t.status = 'escalated' THEN 2 ELSE 3 END, t.created_at DESC
       LIMIT 100`
    );
    res.json({ tickets: rows });
  })
);

adminTicketsRouter.patch(
  '/:id/status',
  ah(async (req, res) => {
    const { status } = req.body;
    if (!status) throw new ApiError(400, 'Status is required');
    
    await query(`UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2`, [status, req.params.id]);
    res.json({ message: 'Status updated' });
  })
);
