const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const normalizeIngredientName = (value) => String(value || '').trim().toLowerCase();

/**
 * GET /api/ingredients
 * Get all ingredients
 */
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM ingredients ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

/**
 * POST /api/ingredients/requests
 * Let a logged-in user request a new ingredient to be added (moderation queue).
 */
router.post('/requests', authenticate, async (req, res) => {
  const pool = req.app.locals.pool;
  const userId = req.user?.userId;

  try {
    const canonicalName = String(req.body?.name || '').trim();
    const normalized = normalizeIngredientName(canonicalName);

    if (!canonicalName || !normalized) {
      return res.status(400).json({ error: 'Ingredient name is required' });
    }

    if (canonicalName.length > 100) {
      return res.status(400).json({ error: 'Ingredient name is too long' });
    }

    // If already in the canonical ingredient list, return a friendly response.
    const existingIngredient = await pool.query('SELECT * FROM ingredients WHERE lower(name) = $1', [normalized]);
    if (existingIngredient.rows.length > 0) {
      return res.status(200).json({
        status: 'exists',
        message: 'Ingredient already exists.',
        ingredient: existingIngredient.rows[0],
      });
    }

    // If a request already exists for this normalized name, reuse it.
    const existingRequest = await pool.query(
      'SELECT * FROM ingredient_requests WHERE normalized_name = $1',
      [normalized]
    );

    if (existingRequest.rows.length > 0) {
      const reqRow = existingRequest.rows[0];

      if (reqRow.status === 'rejected') {
        const updated = await pool.query(
          `UPDATE ingredient_requests
           SET requested_name = $1,
               requested_by = $2,
               status = 'pending',
               reviewed_by = NULL,
               admin_notes = NULL,
               reviewed_at = NULL,
               created_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING *`,
          [canonicalName, userId, reqRow.id]
        );

        return res.status(200).json({
          status: 'pending',
          message: 'Ingredient request resubmitted for review.',
          request: updated.rows[0],
        });
      }

      return res.status(200).json({
        status: reqRow.status,
        message:
          reqRow.status === 'pending'
            ? 'Ingredient already requested and awaiting admin review.'
            : 'Ingredient request already approved.',
        request: reqRow,
      });
    }

    const created = await pool.query(
      `INSERT INTO ingredient_requests (requested_name, normalized_name, requested_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [canonicalName, normalized, userId]
    );

    return res.status(201).json({
      status: 'pending',
      message: 'Ingredient request submitted for admin review.',
      request: created.rows[0],
    });
  } catch (error) {
    // Handle potential unique constraint race.
    if (error?.code === '23505') {
      try {
        const canonicalName = String(req.body?.name || '').trim();
        const normalized = normalizeIngredientName(canonicalName);
        const existingRequest = await pool.query(
          'SELECT * FROM ingredient_requests WHERE normalized_name = $1',
          [normalized]
        );

        if (existingRequest.rows.length > 0) {
          return res.status(200).json({
            status: existingRequest.rows[0].status,
            message: 'Ingredient already requested.',
            request: existingRequest.rows[0],
          });
        }
      } catch (_) {
        // fallthrough
      }
    }

    console.error('Error creating ingredient request:', error);
    return res.status(500).json({ error: 'Failed to submit ingredient request' });
  }
});

module.exports = router;
