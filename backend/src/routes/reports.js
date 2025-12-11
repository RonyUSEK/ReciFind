const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

/**
 * POST /api/reports
 * Submit a new report (auth required)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { content_type, content_id, reason, description } = req.body;
    const reporter_id = req.user.userId;

    // Validate input
    if (!content_type || !content_id || !reason) {
      return res.status(400).json({ error: 'Missing required fields: content_type, content_id, reason' });
    }

    // Validate content_type
    if (!['recipe', 'comment'].includes(content_type)) {
      return res.status(400).json({ error: 'content_type must be "recipe" or "comment"' });
    }

    // Check if content exists
    if (content_type === 'recipe') {
      const recipeCheck = await pool.query('SELECT id FROM recipes WHERE id = $1', [content_id]);
      if (recipeCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
    } else if (content_type === 'comment') {
      const commentCheck = await pool.query('SELECT id FROM comments WHERE id = $1', [content_id]);
      if (commentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Comment not found' });
      }
    }

    // Check if user already reported this content
    const existingReport = await pool.query(
      'SELECT id FROM reports WHERE content_type = $1 AND content_id = $2 AND reporter_id = $3',
      [content_type, content_id, reporter_id]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reported this content' });
    }

    // Create report
    const result = await pool.query(
      `INSERT INTO reports (content_type, content_id, reporter_id, reason, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, content_type, content_id, reason, description, status, created_at`,
      [content_type, content_id, reporter_id, reason, description || null]
    );

    res.status(201).json({
      message: 'Report submitted successfully',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

/**
 * GET /api/reports/my
 * Get current user's submitted reports (auth required)
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const reporter_id = req.user.userId;

    const result = await pool.query(
      `SELECT r.*, 
              CASE 
                WHEN r.content_type = 'recipe' THEN rec.title
                WHEN r.content_type = 'comment' THEN LEFT(c.content, 100)
              END as content_preview
       FROM reports r
       LEFT JOIN recipes rec ON r.content_type = 'recipe' AND r.content_id = rec.id
       LEFT JOIN comments c ON r.content_type = 'comment' AND r.content_id = c.id
       WHERE r.reporter_id = $1
       ORDER BY r.created_at DESC`,
      [reporter_id]
    );

    res.json({ reports: result.rows });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * GET /api/reports/stats
 * Get report statistics for current user (auth required)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const reporter_id = req.user.userId;

    const result = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
         COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
         COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed
       FROM reports
       WHERE reporter_id = $1`,
      [reporter_id]
    );

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ error: 'Failed to fetch report statistics' });
  }
});

module.exports = router;
