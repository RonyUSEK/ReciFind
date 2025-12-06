const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password, name } = req.body;
    const pool = req.app.locals.pool;
    
    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, name, role, created_at`,
      [email, password_hash, name]
    );
    
    const user = result.rows[0];
    
    // Generate token
    const token = generateToken(user);
    
    // Return user (without password) and token
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;
    const pool = req.app.locals.pool;
    
    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Return user (without password) and token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        bio: user.bio,
        profile_image: user.profile_image,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current logged-in user
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    
    // Get user by ID from token
    const result = await pool.query(
      `SELECT id, email, name, role, bio, profile_image, reputation_score, 
              is_verified, created_at
       FROM users 
       WHERE id = $1`,
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/auth/apply-chef
 * Submit chef application for admin review
 */
router.post('/apply-chef', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;
    
    const {
      full_name,
      experience_years,
      specialty,
      bio,
      portfolio_url,
      instagram_handle,
      sample_recipe_title,
      sample_recipe_description,
      sample_recipe_images,
      demo_video_url,
      motivation
    } = req.body;

    // Validate required fields
    if (!full_name || !bio || !motivation) {
      return res.status(400).json({ 
        error: 'Full name, bio, and motivation are required' 
      });
    }

    // Check if user exists and get current role
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if already a chef or admin
    if (user.role === 'chef' || user.role === 'admin') {
      return res.status(400).json({ error: 'User is already a chef or admin' });
    }

    // Check if already has a pending application
    const existingApp = await pool.query(
      'SELECT * FROM chef_applications WHERE user_id = $1',
      [userId]
    );

    if (existingApp.rows.length > 0) {
      const app = existingApp.rows[0];
      if (app.status === 'pending') {
        return res.status(400).json({ 
          error: 'You already have a pending chef application' 
        });
      } else if (app.status === 'rejected') {
        // Allow reapplication - delete old one
        await pool.query('DELETE FROM chef_applications WHERE user_id = $1', [userId]);
      } else if (app.status === 'approved') {
        return res.status(400).json({ 
          error: 'Your application was already approved' 
        });
      }
    }

    // Create chef application
    const result = await pool.query(
      `INSERT INTO chef_applications (
        user_id, full_name, experience_years, specialty, bio,
        portfolio_url, instagram_handle, sample_recipe_title,
        sample_recipe_description, sample_recipe_images,
        demo_video_url, motivation, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
      RETURNING *`,
      [
        userId, full_name, experience_years, specialty, bio,
        portfolio_url, instagram_handle, sample_recipe_title,
        sample_recipe_description, sample_recipe_images,
        demo_video_url, motivation
      ]
    );

    res.status(201).json({
      message: 'Chef application submitted successfully. You will be notified once reviewed.',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting chef application:', error);
    res.status(500).json({ error: 'Failed to submit chef application' });
  }
});

/**
 * GET /api/auth/my-application
 * Get current user's chef application status
 */
router.get('/my-application', authenticate, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT ca.*, u.name as reviewer_name 
       FROM chef_applications ca
       LEFT JOIN users u ON ca.reviewed_by = u.id
       WHERE ca.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No application found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

module.exports = router;
