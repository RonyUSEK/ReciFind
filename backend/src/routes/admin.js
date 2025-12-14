const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { AI_DAILY_LIMIT } = require('../middleware/rateLimiter');

const normalizeIngredientName = (value) => String(value || '').trim().toLowerCase();

/**
 * GET /api/admin/chef-applications
 * Get all chef applications (pending, approved, rejected)
 */
router.get('/chef-applications', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { status } = req.query;

    let query = `
      SELECT ca.*, 
             u.name as applicant_name,
             u.email as applicant_email,
             reviewer.name as reviewer_name
      FROM chef_applications ca
      JOIN users u ON ca.user_id = u.id
      LEFT JOIN users reviewer ON ca.reviewed_by = reviewer.id
    `;

    const params = [];
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query += ' WHERE ca.status = $1';
      params.push(status);
    }

    query += ' ORDER BY ca.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Error fetching chef applications:', error);
    res.status(500).json({ error: 'Failed to fetch chef applications' });
  }
});

/**
 * POST /api/admin/chef-applications/:id/approve
 * Approve chef application
 */
router.post('/chef-applications/:id/approve', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const adminId = req.user.userId;

    // Get application
    const appResult = await pool.query(
      'SELECT * FROM chef_applications WHERE id = $1',
      [id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appResult.rows[0];

    if (application.status !== 'pending') {
      return res.status(400).json({ 
        error: `Application already ${application.status}` 
      });
    }

    // Update application status
    await pool.query(
      `UPDATE chef_applications 
       SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [adminId, id]
    );

    // Update user role to chef
    await pool.query(
      `UPDATE users 
       SET role = 'chef', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [application.user_id]
    );

    res.json({ 
      message: 'Chef application approved successfully',
      application_id: id,
      user_id: application.user_id
    });
  } catch (error) {
    console.error('Error approving chef application:', error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

/**
 * POST /api/admin/chef-applications/:id/reject
 * Reject chef application with feedback
 */
router.post('/chef-applications/:id/reject', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { feedback } = req.body;
    const adminId = req.user.userId;

    if (!feedback) {
      return res.status(400).json({ error: 'Feedback is required when rejecting' });
    }

    // Get application
    const appResult = await pool.query(
      'SELECT * FROM chef_applications WHERE id = $1',
      [id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appResult.rows[0];

    if (application.status !== 'pending') {
      return res.status(400).json({ 
        error: `Application already ${application.status}` 
      });
    }

    // Update application status
    await pool.query(
      `UPDATE chef_applications 
       SET status = 'rejected', 
           reviewed_by = $1, 
           admin_feedback = $2,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [adminId, feedback, id]
    );

    res.json({ 
      message: 'Chef application rejected',
      application_id: id,
      feedback
    });
  } catch (error) {
    console.error('Error rejecting chef application:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

/**
 * GET /api/admin/recipes/pending
 * Get all pending recipes awaiting approval
 */
router.get('/recipes/pending', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const result = await pool.query(`
      SELECT r.*, 
             u.name as chef_name,
             u.email as chef_email,
             u.reputation_score
      FROM recipes r
      JOIN users u ON r.chef_id = u.id
      WHERE r.status = 'pending' AND r.source_type = 'chef'
      ORDER BY r.created_at ASC
    `);

    const recipeIds = result.rows.map(r => r.id);
    let pendingByRecipe = new Map();
    if (recipeIds.length > 0) {
      const pending = await pool.query(
        `SELECT rpi.recipe_id, array_agg(ir.requested_name ORDER BY ir.created_at) AS pending_ingredients
         FROM recipe_pending_ingredients rpi
         JOIN ingredient_requests ir ON rpi.ingredient_request_id = ir.id
         WHERE rpi.recipe_id = ANY($1::int[])
         GROUP BY rpi.recipe_id`,
        [recipeIds]
      );
      pendingByRecipe = new Map(pending.rows.map(row => [row.recipe_id, row.pending_ingredients || []]));
    }

    const enriched = result.rows.map(r => ({
      ...r,
      pending_ingredients: pendingByRecipe.get(r.id) || [],
      pending_ingredient_count: (pendingByRecipe.get(r.id) || []).length,
    }));

    res.json({ recipes: enriched });
  } catch (error) {
    console.error('Error fetching pending recipes:', error);
    res.status(500).json({ error: 'Failed to fetch pending recipes' });
  }
});

/**
 * GET /api/admin/ingredient-requests
 * List ingredient requests for moderation
 */
router.get('/ingredient-requests', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { status = 'pending' } = req.query;

    const params = [];
    let where = '';
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where = 'WHERE ir.status = $1';
      params.push(status);
    }

    const result = await pool.query(
      `SELECT ir.*, u.name AS requested_by_name, u.email AS requested_by_email, a.name AS reviewed_by_name
       FROM ingredient_requests ir
       LEFT JOIN users u ON ir.requested_by = u.id
       LEFT JOIN users a ON ir.reviewed_by = a.id
       ${where}
       ORDER BY ir.created_at DESC`,
      params
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Error fetching ingredient requests:', error);
    res.status(500).json({ error: 'Failed to fetch ingredient requests' });
  }
});

/**
 * POST /api/admin/ingredient-requests/:id/approve
 * Approve an ingredient request and link it into any waiting recipes.
 */
router.post('/ingredient-requests/:id/approve', authenticate, requireRole(['admin']), async (req, res) => {
  const pool = req.app.locals.pool;
  const adminId = req.user.userId;

  try {
    const { id } = req.params;
    const { name, category } = req.body || {};

    await pool.query('BEGIN');

    const reqResult = await pool.query('SELECT * FROM ingredient_requests WHERE id = $1', [id]);
    if (reqResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Ingredient request not found' });
    }

    const request = reqResult.rows[0];
    if (request.status !== 'pending') {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: `Ingredient request already ${request.status}` });
    }

    const canonicalName = String(name || request.requested_name).trim();
    const normalized = normalizeIngredientName(canonicalName);
    if (!canonicalName || !normalized) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Ingredient name is required' });
    }

    // Create ingredient if missing
    const ingredientUpsert = await pool.query(
      `WITH ins AS (
         INSERT INTO ingredients (name, category)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING
         RETURNING id
       )
       SELECT id FROM ins
       UNION ALL
       SELECT id FROM ingredients WHERE LOWER(name) = $3
       LIMIT 1`,
      [canonicalName, category || null, normalized]
    );

    const ingredientId = ingredientUpsert.rows[0]?.id;
    if (!ingredientId) {
      await pool.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to create ingredient' });
    }

    // Mark request approved
    await pool.query(
      `UPDATE ingredient_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [adminId, id]
    );

    // Link into any waiting recipes
    const pendingLinks = await pool.query(
      `SELECT recipe_id, quantity, unit
       FROM recipe_pending_ingredients
       WHERE ingredient_request_id = $1`,
      [id]
    );

    for (const row of pendingLinks.rows) {
      await pool.query(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (recipe_id, ingredient_id)
         DO UPDATE SET quantity = EXCLUDED.quantity, unit = EXCLUDED.unit`,
        [row.recipe_id, ingredientId, row.quantity || '', row.unit || '']
      );
    }

    await pool.query('DELETE FROM recipe_pending_ingredients WHERE ingredient_request_id = $1', [id]);

    await pool.query('COMMIT');

    res.json({ message: 'Ingredient request approved', ingredient_id: ingredientId });
  } catch (error) {
    try { await pool.query('ROLLBACK'); } catch (_) {}
    console.error('Error approving ingredient request:', error);
    res.status(500).json({ error: 'Failed to approve ingredient request' });
  }
});

/**
 * POST /api/admin/ingredient-requests/:id/reject
 * Reject an ingredient request.
 */
router.post('/ingredient-requests/:id/reject', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const adminId = req.user.userId;
    const { id } = req.params;
    const { feedback } = req.body || {};

    const reqResult = await pool.query('SELECT * FROM ingredient_requests WHERE id = $1', [id]);
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient request not found' });
    }

    const request = reqResult.rows[0];
    if (request.status !== 'pending') {
      return res.status(400).json({ error: `Ingredient request already ${request.status}` });
    }

    await pool.query(
      `UPDATE ingredient_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, admin_notes = $2
       WHERE id = $3`,
      [adminId, feedback || null, id]
    );

    res.json({ message: 'Ingredient request rejected' });
  } catch (error) {
    console.error('Error rejecting ingredient request:', error);
    res.status(500).json({ error: 'Failed to reject ingredient request' });
  }
});

/**
 * POST /api/admin/recipes/:id/approve
 * Approve a pending recipe
 */
router.post('/recipes/:id/approve', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const adminId = req.user.userId;

    const pendingIng = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM recipe_pending_ingredients WHERE recipe_id = $1',
      [id]
    );

    if ((pendingIng.rows[0]?.cnt || 0) > 0) {
      return res.status(400).json({
        error: 'Recipe has pending ingredient requests. Approve/reject the ingredients first.'
      });
    }

    // Get recipe
    const recipeResult = await pool.query(
      'SELECT * FROM recipes WHERE id = $1',
      [id]
    );

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipe = recipeResult.rows[0];

    if (recipe.status !== 'pending') {
      return res.status(400).json({ 
        error: `Recipe already ${recipe.status}` 
      });
    }

    // Update recipe status to approved
    await pool.query(
      `UPDATE recipes 
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Create approval record
    await pool.query(
      `INSERT INTO recipe_approvals (recipe_id, admin_id, status, reviewed_at)
       VALUES ($1, $2, 'approved', CURRENT_TIMESTAMP)`,
      [id, adminId]
    );

    // Increment chef's reputation score
    await pool.query(
      `UPDATE users 
       SET reputation_score = reputation_score + 10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [recipe.chef_id]
    );

    res.json({ 
      message: 'Recipe approved successfully',
      recipe_id: id
    });
  } catch (error) {
    console.error('Error approving recipe:', error);
    res.status(500).json({ error: 'Failed to approve recipe' });
  }
});

/**
 * POST /api/admin/recipes/:id/reject
 * Reject a pending recipe with feedback
 */
router.post('/recipes/:id/reject', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { feedback } = req.body;
    const adminId = req.user.userId;

    if (!feedback) {
      return res.status(400).json({ error: 'Feedback is required when rejecting' });
    }

    // Get recipe
    const recipeResult = await pool.query(
      'SELECT * FROM recipes WHERE id = $1',
      [id]
    );

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipe = recipeResult.rows[0];

    if (recipe.status !== 'pending') {
      return res.status(400).json({ 
        error: `Recipe already ${recipe.status}` 
      });
    }

    // Update recipe status to rejected
    await pool.query(
      `UPDATE recipes 
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Create approval record with feedback
    await pool.query(
      `INSERT INTO recipe_approvals (recipe_id, admin_id, status, feedback, reviewed_at)
       VALUES ($1, $2, 'rejected', $3, CURRENT_TIMESTAMP)`,
      [id, adminId, feedback]
    );

    res.json({ 
      message: 'Recipe rejected',
      recipe_id: id,
      feedback
    });
  } catch (error) {
    console.error('Error rejecting recipe:', error);
    res.status(500).json({ error: 'Failed to reject recipe' });
  }
});

/**
 * GET /api/admin/ai-usage
 * Get remaining daily AI credits for users (admin only)
 */
router.get('/ai-usage', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const result = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         COALESCE(adu.count, 0) AS used_today
       FROM users u
       LEFT JOIN ai_daily_usage adu
         ON adu.user_id = u.id AND adu.day = CURRENT_DATE
       ORDER BY u.role DESC, u.id ASC`
    );

    const users = result.rows.map((row) => {
      const used = parseInt(row.used_today) || 0;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        dailyLimit: AI_DAILY_LIMIT,
        usedToday: used,
        remainingToday: Math.max(0, AI_DAILY_LIMIT - used),
      };
    });

    res.json({ dailyLimit: AI_DAILY_LIMIT, users });
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    res.status(500).json({ error: 'Failed to fetch AI usage' });
  }
});

/**
 * POST /api/admin/ai-usage/reset
 * Reset current admin's daily AI usage
 */
router.post('/ai-usage/reset', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;

    await pool.query('DELETE FROM ai_daily_usage WHERE user_id = $1 AND day = CURRENT_DATE', [userId]);
    res.json({ message: 'AI usage reset successfully', userId });
  } catch (error) {
    console.error('Error resetting AI usage:', error);
    res.status(500).json({ error: 'Failed to reset AI usage' });
  }
});

/**
 * POST /api/admin/ai-usage/:userId/reset
 * Reset a user's daily AI usage (admin only)
 */
router.post('/ai-usage/:userId/reset', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { userId } = req.params;

    await pool.query('DELETE FROM ai_daily_usage WHERE user_id = $1 AND day = CURRENT_DATE', [userId]);
    res.json({ message: 'AI usage reset successfully', userId: parseInt(userId) });
  } catch (error) {
    console.error('Error resetting AI usage for user:', error);
    res.status(500).json({ error: 'Failed to reset AI usage' });
  }
});

/**
 * GET /api/admin/users
 * Get all users (for user management)
 */
router.get('/users', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const result = await pool.query(`
      SELECT id, name, email, role, reputation_score, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Change a user's role
 */
router.put('/users/:id/role', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'chef', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Don't allow changing own role
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, role`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'User role updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * PUT /api/admin/users/:id/reputation
 * Update chef's reputation score
 */
router.put('/users/:id/reputation', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { reputation_score } = req.body;

    if (typeof reputation_score !== 'number') {
      return res.status(400).json({ error: 'Reputation score must be a number' });
    }

    const result = await pool.query(
      `UPDATE users 
       SET reputation_score = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND role IN ('chef', 'admin')
       RETURNING id, name, email, role, reputation_score`,
      [reputation_score, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    res.json({ 
      message: 'Reputation score updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating reputation:', error);
    res.status(500).json({ error: 'Failed to update reputation' });
  }
});

/**
 * GET /api/admin/reports
 * Get all reports with filtering options
 */
router.get('/reports', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { status, content_type } = req.query;

    let query = `
      SELECT r.*,
             reporter.name as reporter_name,
             reporter.email as reporter_email,
             reviewer.name as reviewer_name,
             CASE 
               WHEN r.content_type = 'recipe' THEN rec.title
               WHEN r.content_type = 'comment' THEN c.content
             END as content_preview,
             CASE
               WHEN r.content_type = 'recipe' THEN rec.chef_id
               WHEN r.content_type = 'comment' THEN c.user_id
             END as content_author_id,
             CASE
               WHEN r.content_type = 'recipe' THEN chef.name
               WHEN r.content_type = 'comment' THEN commenter.name
             END as content_author_name
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
      LEFT JOIN recipes rec ON r.content_type = 'recipe' AND r.content_id = rec.id
      LEFT JOIN comments c ON r.content_type = 'comment' AND r.content_id = c.id
      LEFT JOIN users chef ON rec.chef_id = chef.id
      LEFT JOIN users commenter ON c.user_id = commenter.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status && ['pending', 'resolved', 'dismissed'].includes(status)) {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (content_type && ['recipe', 'comment'].includes(content_type)) {
      query += ` AND r.content_type = $${paramCount}`;
      params.push(content_type);
      paramCount++;
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ reports: result.rows });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * GET /api/admin/reports/stats
 * Get report statistics (MUST come before /:id route)
 */
router.get('/reports/stats', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed,
        COUNT(CASE WHEN content_type = 'recipe' THEN 1 END) as recipe_reports,
        COUNT(CASE WHEN content_type = 'comment' THEN 1 END) as comment_reports
      FROM reports
    `);

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({ error: 'Failed to fetch report statistics' });
  }
});

/**
 * GET /api/admin/reports/:id
 * Get detailed report information
 */
router.get('/reports/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*,
              reporter.name as reporter_name,
              reporter.email as reporter_email,
              reviewer.name as reviewer_name,
              CASE 
                WHEN r.content_type = 'recipe' THEN row_to_json(rec.*)
                WHEN r.content_type = 'comment' THEN row_to_json(c.*)
              END as content_data
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
       LEFT JOIN recipes rec ON r.content_type = 'recipe' AND r.content_id = rec.id
       LEFT JOIN comments c ON r.content_type = 'comment' AND r.content_id = c.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report: result.rows[0] });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

/**
 * PUT /api/admin/reports/:id/resolve
 * Resolve a report with action
 */
router.put('/reports/:id/resolve', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { action, admin_notes } = req.body; // action: 'dismiss', 'remove_content', 'warn_user', 'ban_user'
    const adminId = req.user.userId;

    if (!action || !['dismiss', 'remove_content', 'warn_user', 'ban_user'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be: dismiss, remove_content, warn_user, or ban_user' });
    }

    // Get report details
    const reportResult = await pool.query(
      'SELECT * FROM reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportResult.rows[0];

    if (report.status !== 'pending') {
      return res.status(400).json({ error: 'Report has already been resolved' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Perform action based on admin decision
      if (action === 'remove_content') {
        if (report.content_type === 'recipe') {
          await pool.query('DELETE FROM recipes WHERE id = $1', [report.content_id]);
        } else if (report.content_type === 'comment') {
          await pool.query('DELETE FROM comments WHERE id = $1', [report.content_id]);
        }
      } else if (action === 'warn_user') {
        // Flag the content for user to see warning
        if (report.content_type === 'comment') {
          await pool.query(
            'UPDATE comments SET is_flagged = true WHERE id = $1',
            [report.content_id]
          );
        }
      } else if (action === 'ban_user') {
        // Get content author
        let authorId;
        if (report.content_type === 'recipe') {
          const recipeResult = await pool.query('SELECT chef_id FROM recipes WHERE id = $1', [report.content_id]);
          authorId = recipeResult.rows[0]?.chef_id;
        } else if (report.content_type === 'comment') {
          const commentResult = await pool.query('SELECT user_id FROM comments WHERE id = $1', [report.content_id]);
          authorId = commentResult.rows[0]?.user_id;
        }

        if (authorId) {
          // For this demo, we'll just set role back to 'user' and zero reputation
          await pool.query(
            `UPDATE users 
             SET role = 'user', reputation_score = 0, is_verified = false
             WHERE id = $1`,
            [authorId]
          );
        }
      }

      // Update report status
      const updateResult = await pool.query(
        `UPDATE reports 
         SET status = 'resolved', 
             reviewed_by = $1, 
             admin_notes = $2,
             resolved_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [adminId, admin_notes, id]
      );

      await pool.query('COMMIT');

      res.json({
        message: `Report resolved with action: ${action}`,
        report: updateResult.rows[0]
      });
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error resolving report:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

/**
 * PUT /api/admin/reports/:id/dismiss
 * Dismiss a report (no action taken)
 */
router.put('/reports/:id/dismiss', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { admin_notes } = req.body;
    const adminId = req.user.userId;

    const result = await pool.query(
      `UPDATE reports 
       SET status = 'dismissed', 
           reviewed_by = $1, 
           admin_notes = $2,
           resolved_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [adminId, admin_notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found or already resolved' });
    }

    res.json({
      message: 'Report dismissed',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Error dismissing report:', error);
    res.status(500).json({ error: 'Failed to dismiss report' });
  }
});

/**
 * GET /api/admin/ai-metrics
 * Get AI recipe generation metrics and statistics
 */
router.get('/ai-metrics', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { period = '7d', userId } = req.query;

    // Calculate date range based on period
    let dateFilter = '';
    let dateFilterAg = '';
    const params = [];
    
    if (period === '24h') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '24 hours'";
      dateFilterAg = "AND ag.created_at >= NOW() - INTERVAL '24 hours'";
    } else if (period === '7d') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
      dateFilterAg = "AND ag.created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === '30d') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
      dateFilterAg = "AND ag.created_at >= NOW() - INTERVAL '30 days'";
    } else if (period === 'all') {
      dateFilter = '';
      dateFilterAg = '';
    }

    // Add user filter if provided
    let userFilter = '';
    if (userId) {
      userFilter = 'AND user_id = $1';
      params.push(userId);
    }

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_generations,
        COUNT(*) FILTER (WHERE success = true) as successful_generations,
        COUNT(*) FILTER (WHERE success = false) as failed_generations,
        SUM(tokens_used) as total_tokens,
        AVG(tokens_used) FILTER (WHERE tokens_used IS NOT NULL) as avg_tokens,
        COUNT(DISTINCT user_id) as unique_users
      FROM ai_generations
      WHERE 1=1 ${dateFilter} ${userFilter}
    `;

    const statsResult = await pool.query(statsQuery, params);
    const stats = statsResult.rows[0];

    // Get generation over time (daily breakdown)
    const timelineQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as generations,
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) FILTER (WHERE success = false) as failed,
        SUM(tokens_used) as tokens
      FROM ai_generations
      WHERE 1=1 ${dateFilter} ${userFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const timelineResult = await pool.query(timelineQuery, params);

    // Get top users by generation count
    const topUsersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(*) as generation_count,
        COUNT(*) FILTER (WHERE ag.success = true) as successful_count,
        SUM(ag.tokens_used) as total_tokens
      FROM ai_generations ag
      JOIN users u ON ag.user_id = u.id
      WHERE 1=1 ${dateFilterAg}
      GROUP BY u.id, u.name, u.email
      ORDER BY generation_count DESC
      LIMIT 10
    `;

    const topUsersResult = await pool.query(topUsersQuery);

    // Get most common ingredients used
    const ingredientsQuery = `
      SELECT 
        UNNEST(ingredients) as ingredient,
        COUNT(*) as usage_count
      FROM ai_generations
      WHERE success = true ${dateFilter} ${userFilter}
      GROUP BY ingredient
      ORDER BY usage_count DESC
      LIMIT 20
    `;

    const ingredientsResult = await pool.query(ingredientsQuery, params);

    // Get error breakdown if there are failures
    const errorsQuery = `
      SELECT 
        error_message,
        COUNT(*) as count
      FROM ai_generations
      WHERE success = false ${dateFilter} ${userFilter}
      GROUP BY error_message
      ORDER BY count DESC
      LIMIT 10
    `;

    const errorsResult = await pool.query(errorsQuery, params);

    res.json({
      period,
      stats: {
        totalGenerations: parseInt(stats.total_generations) || 0,
        successfulGenerations: parseInt(stats.successful_generations) || 0,
        failedGenerations: parseInt(stats.failed_generations) || 0,
        successRate: stats.total_generations > 0 
          ? ((stats.successful_generations / stats.total_generations) * 100).toFixed(2)
          : 0,
        totalTokens: parseInt(stats.total_tokens) || 0,
        avgTokens: parseFloat(stats.avg_tokens) || 0,
        uniqueUsers: parseInt(stats.unique_users) || 0
      },
      timeline: timelineResult.rows,
      topUsers: topUsersResult.rows,
      topIngredients: ingredientsResult.rows,
      errors: errorsResult.rows
    });

  } catch (error) {
    console.error('Error fetching AI metrics:', error);
    res.status(500).json({ error: 'Failed to fetch AI metrics' });
  }
});

/**
 * GET /api/admin/ai-generations
 * Get detailed list of AI generations with filtering
 */
router.get('/ai-generations', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { 
      page = 1, 
      limit = 20, 
      userId, 
      success,
      startDate,
      endDate 
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [limit, offset];
    let paramIndex = 3;

    // Build WHERE clause
    let whereConditions = [];
    
    if (userId) {
      whereConditions.push(`ag.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (success !== undefined) {
      whereConditions.push(`ag.success = $${paramIndex}`);
      params.push(success === 'true');
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`ag.created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`ag.created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ai_generations ag
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(2));
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT 
        ag.id,
        ag.user_id,
        u.name as user_name,
        u.email as user_email,
        ag.ingredients,
        ag.preferences,
        ag.tokens_used,
        ag.success,
        ag.error_message,
        ag.created_at
      FROM ai_generations ag
      JOIN users u ON ag.user_id = u.id
      ${whereClause}
      ORDER BY ag.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, params);

    res.json({
      generations: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching AI generations:', error);
    res.status(500).json({ error: 'Failed to fetch AI generations' });
  }
});

module.exports = router;
