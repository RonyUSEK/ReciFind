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

module.exports = router;
