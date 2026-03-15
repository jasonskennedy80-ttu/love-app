import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { scheduleOccasion, cancelOccasion } from '../workers/scheduler.js';

const router = Router();

const OccasionSchema = z.object({
  contact_id: z.string().uuid(),
  type: z.enum(['birthday', 'anniversary', 'holiday', 'daily', 'random']),
  date: z.string().optional(), // ISO date string, e.g. "2026-06-15"
  send_time: z.string().regex(/^\d{2}:\d{2}$/).default('08:00'), // HH:MM
  active: z.boolean().default(true),
  depth: z.enum(['light', 'medium', 'deep']).default('medium'),
});

// Verify the contact belongs to the requesting user
async function verifyContactOwnership(contactId, userId) {
  const { rows } = await pool.query(
    'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
    [contactId, userId]
  );
  return rows[0] ?? null;
}

// GET /occasions?contactId=uuid
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { contactId } = req.query;
    if (!contactId) return res.status(400).json({ error: 'contactId query param required' });

    const contact = await verifyContactOwnership(contactId, req.user.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const { rows } = await pool.query(
      'SELECT * FROM occasions WHERE contact_id = $1 ORDER BY created_at ASC',
      [contactId]
    );
    res.json({ occasions: rows });
  } catch (err) {
    next(err);
  }
});

// POST /occasions
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = OccasionSchema.parse(req.body);

    const contact = await verifyContactOwnership(data.contact_id, req.user.id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const { rows } = await pool.query(
      `INSERT INTO occasions (contact_id, type, date, send_time, active, depth)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.contact_id, data.type, data.date ?? null, data.send_time + ':00', data.active, data.depth]
    );

    const occasion = rows[0];

    // Schedule the BullMQ job if active
    if (occasion.active) {
      await scheduleOccasion(occasion);
    }

    res.status(201).json({ occasion });
  } catch (err) {
    next(err);
  }
});

// PATCH /occasions/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const schema = OccasionSchema.partial().omit({ contact_id: true });
    const data = schema.parse(req.body);

    // Verify ownership via contact
    const { rows: existing } = await pool.query(
      `SELECT o.* FROM occasions o
       JOIN contacts c ON o.contact_id = c.id
       WHERE o.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Occasion not found' });

    const fields = Object.keys(data);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [req.params.id, ...fields.map((f) => data[f])];

    const { rows } = await pool.query(
      `UPDATE occasions SET ${setClause} WHERE id = $1 RETURNING *`,
      values
    );

    const occasion = rows[0];

    // Re-schedule or cancel based on active flag
    await cancelOccasion(occasion.id);
    if (occasion.active) {
      await scheduleOccasion(occasion);
    }

    res.json({ occasion });
  } catch (err) {
    next(err);
  }
});

// DELETE /occasions/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id FROM occasions o
       JOIN contacts c ON o.contact_id = c.id
       WHERE o.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Occasion not found' });

    await cancelOccasion(req.params.id);
    await pool.query('DELETE FROM occasions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
