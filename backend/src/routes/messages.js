import { Router } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { generateMessage } from '../services/claude.js';

const router = Router();

// POST /messages/preview — generate a message without sending it
router.post('/preview', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      contact_id: z.string().uuid(),
      occasion_type: z.enum(['birthday', 'anniversary', 'holiday', 'daily', 'random']),
      depth: z.enum(['light', 'medium', 'deep']).default('medium'),
    });

    const { contact_id, occasion_type, depth } = schema.parse(req.body);

    // Load contact + interests (verify ownership)
    const { rows } = await pool.query(
      `SELECT c.*, i.hobbies, i.foods, i.dietary, i.memory_note
       FROM contacts c
       LEFT JOIN interests i ON i.contact_id = c.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [contact_id, req.user.id]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Contact not found' });

    const contact = rows[0];
    const interests = {
      hobbies: contact.hobbies,
      foods: contact.foods,
      dietary: contact.dietary,
      memory_note: contact.memory_note,
    };

    const body = await generateMessage(
      { name: contact.name, relationship: contact.relationship, tone: contact.tone },
      { type: occasion_type },
      interests,
      depth
    );

    // Log as preview (no send)
    const { rows: msg } = await pool.query(
      `INSERT INTO messages (contact_id, body, status)
       VALUES ($1, $2, 'preview') RETURNING *`,
      [contact_id, body]
    );

    res.json({ message: msg[0] });
  } catch (err) {
    next(err);
  }
});

// GET /messages?contactId=uuid — message history for a contact
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { contactId } = req.query;
    if (!contactId) return res.status(400).json({ error: 'contactId query param required' });

    // Verify ownership
    const { rows: contact } = await pool.query(
      'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, req.user.id]
    );
    if (!contact[0]) return res.status(404).json({ error: 'Contact not found' });

    const { rows } = await pool.query(
      `SELECT * FROM messages WHERE contact_id = $1
       ORDER BY created_at DESC LIMIT 100`,
      [contactId]
    );

    res.json({ messages: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
