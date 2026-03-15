import { Queue } from 'bullmq';
import redis from './redis.js';

export const messageQueue = new Queue('messages', { connection: redis });

/**
 * Schedule a BullMQ job for an occasion.
 * - birthday/anniversary/holiday: fires once per year on the occasion date
 * - daily: repeats every day at send_time ± random stagger
 * - random: fires at a random interval (every 3–14 days)
 */
export async function scheduleOccasion(occasion) {
  const jobId = `occasion:${occasion.id}`;

  // Stagger send time ±3–8 minutes to prevent pattern detection
  const staggerMs = (Math.floor(Math.random() * 6) + 3) * 60 * 1000;

  const baseDelay = getDelayMs(occasion);

  if (occasion.type === 'daily') {
    await messageQueue.add(
      'send-message',
      { occasionId: occasion.id },
      {
        jobId,
        repeat: { every: 24 * 60 * 60 * 1000 },
        delay: baseDelay + staggerMs,
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
  } else if (occasion.type === 'random') {
    const randomIntervalDays = Math.floor(Math.random() * 12) + 3; // 3–14 days
    await messageQueue.add(
      'send-message',
      { occasionId: occasion.id },
      {
        jobId,
        repeat: { every: randomIntervalDays * 24 * 60 * 60 * 1000 },
        delay: staggerMs,
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
  } else {
    // birthday, anniversary, holiday — one-time per year
    await messageQueue.add(
      'send-message',
      { occasionId: occasion.id },
      {
        jobId,
        delay: baseDelay + staggerMs,
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
  }
}

export async function cancelOccasion(occasionId) {
  const jobId = `occasion:${occasionId}`;
  const job = await messageQueue.getJob(jobId);
  if (job) await job.remove();
}

function getDelayMs(occasion) {
  if (!occasion.date) return 0;

  const [hours, minutes] = (occasion.send_time || '08:00:00').split(':').map(Number);
  const sendDate = new Date(occasion.date);
  sendDate.setHours(hours, minutes, 0, 0);

  const now = Date.now();
  const delay = sendDate.getTime() - now;

  // If date has passed this year, schedule for next year
  if (delay < 0) {
    sendDate.setFullYear(sendDate.getFullYear() + 1);
    return sendDate.getTime() - now;
  }

  return delay;
}
