import pool from '../db/pool.js';

const PLAN_LIMITS = {
  free:     { contacts: 1, messagesPerMonth: 5 },
  personal: { contacts: 1, messagesPerMonth: Infinity },
  premium:  { contacts: 5, messagesPerMonth: Infinity },
};

// Gate by contact count — use before contact creation
export async function gateContactLimit(req, res, next) {
  const { id: userId, plan } = req.user;
  const limit = PLAN_LIMITS[plan]?.contacts ?? 1;

  const { rows } = await pool.query(
    'SELECT COUNT(*) FROM contacts WHERE user_id = $1',
    [userId]
  );

  if (parseInt(rows[0].count) >= limit) {
    return res.status(403).json({
      error: `Your ${plan} plan allows up to ${limit} contact(s). Upgrade to add more.`,
      upgrade: true,
    });
  }
  next();
}

// Gate by monthly message count — use before message sends
export async function gateMessageLimit(req, res, next) {
  const { id: userId, plan } = req.user;
  const limit = PLAN_LIMITS[plan]?.messagesPerMonth ?? 5;
  if (limit === Infinity) return next();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM messages m
     JOIN contacts c ON m.contact_id = c.id
     WHERE c.user_id = $1 AND m.status = 'sent' AND m.sent_at >= $2`,
    [userId, startOfMonth]
  );

  if (parseInt(rows[0].count) >= limit) {
    return res.status(403).json({
      error: `You've reached your ${limit} message limit for this month. Upgrade for unlimited messages.`,
      upgrade: true,
    });
  }
  next();
}
