const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const AI_DAILY_LIMIT = 5;

/**
 * AI recipe generation daily credits limiter (DB-backed)
 * - Atomic per-user increments (safe under parallel requests)
 * - Resettable by admins
 */
async function aiGenerationLimiter(req, res, next) {
  // Skip rate limiting in test environment unless explicitly enabled
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
    return next();
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const pool = req.app?.locals?.pool;
  if (!pool) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Increment today's count (calendar day)
    const upsert = await client.query(
      `INSERT INTO ai_daily_usage (user_id, day, count)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (user_id, day)
       DO UPDATE SET count = ai_daily_usage.count + 1
       RETURNING count`,
      [userId]
    );

    const newCount = parseInt(upsert.rows[0]?.count) || 0;
    if (newCount > AI_DAILY_LIMIT) {
      await client.query('ROLLBACK');
      return res.status(429).json({
        error: `Daily AI generation limit reached (${AI_DAILY_LIMIT} per day). Please try again tomorrow.`,
        limit: AI_DAILY_LIMIT,
        used: AI_DAILY_LIMIT,
        remaining: 0,
      });
    }

    await client.query('COMMIT');

    // Provide credit info for UI if needed
    res.setHeader('X-AI-Daily-Limit', String(AI_DAILY_LIMIT));
    res.setHeader('X-AI-Daily-Used', String(newCount));
    res.setHeader('X-AI-Daily-Remaining', String(Math.max(0, AI_DAILY_LIMIT - newCount)));

    return next();
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore rollback error
    }
    console.error('AI rate limit error:', error);
    return res.status(500).json({ error: 'Rate limiting failed' });
  } finally {
    client.release();
  }
}

module.exports = {
  authLimiter,
  aiGenerationLimiter,
  AI_DAILY_LIMIT,
};
