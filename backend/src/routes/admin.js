const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');

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

    res.json({ recipes: result.rows });
  } catch (error) {
    console.error('Error fetching pending recipes:', error);
    res.status(500).json({ error: 'Failed to fetch pending recipes' });
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

module.exports = router;
