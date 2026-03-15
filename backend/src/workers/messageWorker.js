import 'dotenv/config';
import { Worker } from 'bullmq';
import pool from '../db/pool.js';
import { generateMessage } from '../services/claude.js';
import { sendSMS } from '../services/twilio.js';
import redis from './redis.js';

const worker = new Worker(
  'messages',
  async (job) => {
    const { occasionId } = job.data;
    console.log(`Processing job for occasion ${occasionId}`);

    // Load occasion + contact + interests
    const { rows } = await pool.query(
      `SELECT
         o.id AS occasion_id, o.type, o.depth,
         c.id AS contact_id, c.name, c.phone, c.relationship, c.tone,
         i.hobbies, i.foods, i.dietary, i.memory_note
       FROM occasions o
       JOIN contacts c ON o.contact_id = c.id
       LEFT JOIN interests i ON i.contact_id = c.id
       WHERE o.id = $1 AND o.active = true`,
      [occasionId]
    );

    if (!rows[0]) {
      console.log(`Occasion ${occasionId} not found or inactive. Skipping.`);
      return;
    }

    const row = rows[0];

    const contact = {
      name: row.name,
      relationship: row.relationship,
      tone: row.tone,
    };

    const occasion = { type: row.type };

    const interests = {
      hobbies: row.hobbies ?? [],
      foods: row.foods ?? [],
      dietary: row.dietary,
      memory_note: row.memory_note,
    };

    // Generate message via Claude
    const body = await generateMessage(contact, occasion, interests, row.depth);

    // Insert pending message log
    const { rows: msgRows } = await pool.query(
      `INSERT INTO messages (contact_id, occasion_id, body, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [row.contact_id, occasionId, body]
    );
    const messageId = msgRows[0].id;

    // Send SMS via Twilio
    try {
      await sendSMS(row.phone, body);
      await pool.query(
        `UPDATE messages SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [messageId]
      );
      console.log(`Message sent to ${row.name} (${row.phone})`);
    } catch (smsErr) {
      await pool.query(
        `UPDATE messages SET status = 'failed' WHERE id = $1`,
        [messageId]
      );
      console.error(`SMS failed for message ${messageId}:`, smsErr.message);
      // Re-throw so BullMQ marks the job as failed and can retry
      throw smsErr;
    }
  },
  {
    connection: redis,
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 }, // retry after 1min, 2min, 4min
    },
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

console.log('Message worker started');
