import { Router } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { query, queryOne, withTransaction } from '../db/pool';
import { ah, ApiError, requireAuth, requireRole, AuthedRequest } from '../middleware';

export const smtpRouter = Router();
smtpRouter.use(requireAuth, requireRole('master_admin', 'super_admin'));

// ── SMTP CONFIG ────────────────────────────────────────────────

smtpRouter.get('/configs', ah(async (_req, res) => {
  const rows = await query(`SELECT id, name, host, port, secure, username, from_email, from_name, is_active, is_default, last_tested_at, test_status, created_at FROM smtp_configs ORDER BY is_default DESC, created_at ASC`);
  res.json({ configs: rows });
}));

const smtpSchema = z.object({
  name:      z.string().min(1),
  host:      z.string().min(1),
  port:      z.number().int().min(1).max(65535).default(587),
  secure:    z.boolean().default(false),
  username:  z.string().min(1),
  password:  z.string().min(1),
  fromEmail: z.string().email(),
  fromName:  z.string().min(1).default('Mozopost'),
  isDefault: z.boolean().default(false),
});

smtpRouter.post('/configs', ah(async (req, res) => {
  const dto = smtpSchema.parse(req.body);
  if (dto.isDefault) {
    await query(`UPDATE smtp_configs SET is_default = false`);
  }
  const row = await queryOne(
    `INSERT INTO smtp_configs (name, host, port, secure, username, password_encrypted, from_email, from_name, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, name, host, port, from_email, is_default`,
    [dto.name, dto.host, dto.port, dto.secure, dto.username, dto.password, dto.fromEmail, dto.fromName, dto.isDefault],
  );
  res.status(201).json({ config: row });
}));

smtpRouter.patch('/configs/:id', ah(async (req, res) => {
  const dto = smtpSchema.partial().parse(req.body);
  if (dto.isDefault) await query(`UPDATE smtp_configs SET is_default = false`);
  const fields: string[] = [];
  const params: any[] = [];
  if (dto.name)      { params.push(dto.name);      fields.push(`name=$${params.length}`); }
  if (dto.host)      { params.push(dto.host);      fields.push(`host=$${params.length}`); }
  if (dto.port)      { params.push(dto.port);      fields.push(`port=$${params.length}`); }
  if (dto.secure !== undefined)    { params.push(dto.secure);    fields.push(`secure=$${params.length}`); }
  if (dto.username)  { params.push(dto.username);  fields.push(`username=$${params.length}`); }
  if (dto.password)  { params.push(dto.password);  fields.push(`password_encrypted=$${params.length}`); }
  if (dto.fromEmail) { params.push(dto.fromEmail); fields.push(`from_email=$${params.length}`); }
  if (dto.fromName)  { params.push(dto.fromName);  fields.push(`from_name=$${params.length}`); }
  if (dto.isDefault !== undefined) { params.push(dto.isDefault); fields.push(`is_default=$${params.length}`); }
  if (!fields.length) throw new ApiError(400, 'No fields to update');
  params.push(req.params.id);
  await query(`UPDATE smtp_configs SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${params.length}`, params);
  res.json({ message: 'SMTP config updated' });
}));

smtpRouter.delete('/configs/:id', ah(async (req, res) => {
  await query(`DELETE FROM smtp_configs WHERE id=$1`, [req.params.id]);
  res.json({ message: 'SMTP config deleted' });
}));

/** POST /configs/:id/test — send a test email */
smtpRouter.post('/configs/:id/test', ah(async (req, res) => {
  const cfg = await queryOne<any>(`SELECT * FROM smtp_configs WHERE id=$1`, [req.params.id]);
  if (!cfg) throw new ApiError(404, 'SMTP config not found');
  const toEmail = req.body.toEmail || cfg.from_email;
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.secure,
      auth: { user: cfg.username, pass: cfg.password_encrypted },
    });
    await transporter.sendMail({
      from: `"${cfg.from_name}" <${cfg.from_email}>`,
      to: toEmail,
      subject: 'Mozopost SMTP Test',
      text: `SMTP configuration test successful. Sent from ${cfg.host}:${cfg.port}`,
      html: `<p>SMTP configuration test successful.</p><p>Host: <strong>${cfg.host}:${cfg.port}</strong></p>`,
    });
    await query(`UPDATE smtp_configs SET last_tested_at=NOW(), test_status='ok' WHERE id=$1`, [cfg.id]);
    res.json({ success: true, message: `Test email sent to ${toEmail}` });
  } catch (err: any) {
    await query(`UPDATE smtp_configs SET last_tested_at=NOW(), test_status='failed' WHERE id=$1`, [cfg.id]);
    throw new ApiError(500, `SMTP test failed: ${err.message}`);
  }
}));

// ── EMAIL TEMPLATES ─────────────────────────────────────────

smtpRouter.get('/templates', ah(async (_req, res) => {
  res.json({ templates: await query(`SELECT * FROM email_templates ORDER BY event`) });
}));

smtpRouter.patch('/templates/:id', ah(async (req, res) => {
  const { subject, bodyHtml, bodyText, isActive } = req.body;
  const fields: string[] = [];
  const params: any[] = [];
  if (subject)            { params.push(subject);   fields.push(`subject=$${params.length}`); }
  if (bodyHtml)           { params.push(bodyHtml);  fields.push(`body_html=$${params.length}`); }
  if (bodyText)           { params.push(bodyText);  fields.push(`body_text=$${params.length}`); }
  if (isActive !== undefined) { params.push(isActive); fields.push(`is_active=$${params.length}`); }
  if (!fields.length) throw new ApiError(400, 'No fields to update');
  params.push(req.params.id);
  await query(`UPDATE email_templates SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${params.length}`, params);
  res.json({ message: 'Template updated' });
}));

// ── EMAIL LOGS ─────────────────────────────────────────────

smtpRouter.get('/logs', ah(async (req, res) => {
  const page  = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(50, parseInt((req.query.limit as string) || '20', 10));
  const status = req.query.status as string | undefined;
  const params: any[] = [];
  let where = '';
  if (status) { params.push(status); where = `WHERE el.status=$${params.length}`; }
  const total = parseInt((await queryOne<any>(`SELECT COUNT(*)::text as count FROM email_logs el ${where}`, params))?.count || '0', 10);
  params.push(limit, (page - 1) * limit);
  const rows = await query(
    `SELECT el.*, et.event, s.business_name
     FROM email_logs el
     LEFT JOIN email_templates et ON et.id = el.template_id
     LEFT JOIN sellers s ON s.id = el.seller_id
     ${where} ORDER BY el.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  res.json({ logs: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}));

// ── NOTIFICATION RULES ──────────────────────────────────────

smtpRouter.get('/notification-rules', ah(async (_req, res) => {
  res.json({ rules: await query(`SELECT nr.*, et.subject FROM notification_rules nr LEFT JOIN email_templates et ON et.event = nr.event ORDER BY nr.event`) });
}));

smtpRouter.patch('/notification-rules/:id', ah(async (req, res) => {
  const { isActive, sendTo } = req.body;
  const fields: string[] = [];
  const params: any[] = [];
  if (isActive !== undefined) { params.push(isActive); fields.push(`is_active=$${params.length}`); }
  if (sendTo)                 { params.push(sendTo);   fields.push(`send_to=$${params.length}`); }
  if (!fields.length) throw new ApiError(400, 'No fields');
  params.push(req.params.id);
  await query(`UPDATE notification_rules SET ${fields.join(', ')} WHERE id=$${params.length}`, params);
  res.json({ message: 'Rule updated' });
}));
