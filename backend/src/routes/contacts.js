import { Router } from 'express';
import { z } from 'zod';
import { parsePhoneNumber } from 'libphonenumber-js';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { gateContactLimit } from '../middleware/planGate.js';

const router = Router();

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(7),
  relationship: z.string().min(1).max(50),
  tone: z.enum(['warm', 'playful', 'romantic', 'formal', 'casual']).default('warm'),
  city: z.string().max(100).optional(),
});

function validatePhone(phone) {
  try {
    const parsed = parsePhoneNumber(phone, 'US');
    if (!parsed.isValid()) throw new Error();
    return parsed.format('E.164');
  } catch {
    throw Object.assign(new Error('Invalid phone number'), { status: 400 });
  }
}

// GET /contacts
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, i.hobbies, i.foods, i.dietary, i.memory_note
       FROM contacts c
       LEFT JOIN interests i ON i.contact_id = c.id
       WHERE c.user_id = $1
       ORDER BY c.created_at ASC`,
      [req.user.id]
    );
    res.json({ contacts: rows });
  } catch (err) {
    next(err);
  }
});

// POST /contacts
router.post('/', requireAuth, gateContactLimit, async (req, res, next) => {
  try {
    const data = ContactSchema.parse(req.body);
    const phone = validatePhone(data.phone);

    const { rows } = await pool.query(
      `INSERT INTO contacts (user_id, name, phone, relationship, tone, city)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, data.name, phone, data.relationship, data.tone, data.city ?? null]
    );

    // Auto-create empty interests row
    await pool.query(
      'INSERT INTO interests (contact_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [rows[0].id]
    );

    res.status(201).json({ contact: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /contacts/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, i.hobbies, i.foods, i.dietary, i.memory_note
       FROM contacts c
       LEFT JOIN interests i ON i.contact_id = c.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });
    res.json({ contact: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /contacts/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = ContactSchema.partial().parse(req.body);
    if (data.phone) data.phone = validatePhone(data.phone);

    const fields = Object.keys(data);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = [req.params.id, req.user.id, ...fields.map((f) => data[f])];

    const { rows } = await pool.query(
      `UPDATE contacts SET ${setClause} WHERE id = $1 AND user_id = $2 RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });
    res.json({ contact: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /contacts/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM contacts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Contact not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /contacts/:id/interests
router.patch('/:id/interests', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      hobbies: z.array(z.string()).optional(),
      foods: z.array(z.string()).optional(),
      dietary: z.string().optional(),
      memory_note: z.string().optional(),
    });
    const data = schema.parse(req.body);

    // Verify ownership
    const { rows: contact } = await pool.query(
      'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!contact[0]) return res.status(404).json({ error: 'Contact not found' });

    const fields = Object.keys(data);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...fields.map((f) => data[f])];

    const { rows } = await pool.query(
      `UPDATE interests SET ${setClause}, updated_at = NOW()
       WHERE contact_id = $1 RETURNING *`,
      values
    );
    res.json({ interests: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
