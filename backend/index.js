const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables from backend/.env (dev container does not inject all vars)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Middleware - Allow all origins for development (mobile access)
app.use(cors({
  origin: true, // Allow all origins (for mobile device access on local network)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve locally uploaded media (dev/prod)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@postgres:5432/mydb',
});

// Make pool available to routes
app.locals.pool = pool;

// Auto-initialize database on startup
async function initializeDatabaseIfNeeded() {
  try {
    // Check if tables exist by querying users table
    await pool.query('SELECT 1 FROM users LIMIT 1');

    // Ensure AI generations tracking table exists for admin metrics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_generations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ingredients TEXT[] NOT NULL,
        preferences JSONB DEFAULT '{}'::jsonb,
        recipe_generated JSONB,
        tokens_used INTEGER,
        success BOOLEAN NOT NULL DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ai_generations_success ON ai_generations(success)');

    // Ensure AI daily usage table exists for daily credits + admin reset
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_daily_usage (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day DATE NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, day)
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ai_daily_usage_day ON ai_daily_usage(day)');

    // Ensure ingredient request moderation tables exist (for incremental upgrades)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredient_requests (
        id SERIAL PRIMARY KEY,
        requested_name VARCHAR(100) NOT NULL,
        normalized_name VARCHAR(100) UNIQUE NOT NULL,
        requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        admin_notes TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ingredient_requests_status ON ingredient_requests(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ingredient_requests_normalized_name ON ingredient_requests(normalized_name)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_pending_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        ingredient_request_id INTEGER NOT NULL REFERENCES ingredient_requests(id) ON DELETE CASCADE,
        requested_name VARCHAR(100) NOT NULL,
        quantity VARCHAR(50),
        unit VARCHAR(50),
        UNIQUE(recipe_id, ingredient_request_id)
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recipe_pending_ingredients_recipe_id ON recipe_pending_ingredients(recipe_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recipe_pending_ingredients_request_id ON recipe_pending_ingredients(ingredient_request_id)');

    if (process.env.NODE_ENV !== 'test') {
      console.log('✓ Database already initialized');
    }
  } catch (error) {
    // Tables don't exist - initialize database
    console.log('⚙️  Database not initialized, setting up...');
    console.log('   Creating tables and loading demo data...');
    
    const fs = require('fs');
    const initPath = path.join(__dirname, 'src/db/init.js');
    
    if (fs.existsSync(initPath)) {
      try {
        // Run initialization script in silent mode (no interactive prompts)
        const { initializeDatabase } = require('./src/db/init.js');
        await initializeDatabase(true); // true = silent mode
        console.log('✓ Database initialized with demo data');
        console.log('');
        console.log('🔐 Demo Login Credentials:');
        console.log('   User:  john.doe@example.com / password123');
        console.log('   Chef:  chef.maria@example.com / password123');
        console.log('   Admin: admin@recifind.com / password123');
        console.log('');
      } catch (initError) {
        console.error('❌ Database initialization failed:', initError.message);
        console.error('   The application may not work correctly.');
      }
    } else {
      console.warn('⚠️  Database initialization script not found');
      console.warn('   The application may not work correctly.');
    }
  }
}

// Initialize database once; tests import the app and rely on this side-effect.
const initPromise = initializeDatabaseIfNeeded().catch(err => {
  console.error('❌ Database check error:', err.message);
});

// API Routes

// Authentication routes
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

// Recipe routes
const recipeRoutes = require('./src/routes/recipes');
app.use('/api/recipes', recipeRoutes);

// Upload routes (local media storage)
const uploadRoutes = require('./src/routes/uploads');
app.use('/api/uploads', uploadRoutes);

// Admin routes
const adminRoutes = require('./src/routes/admin');
app.use('/api/admin', adminRoutes);

// Report routes
const reportRoutes = require('./src/routes/reports');
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Get all ingredients
app.get('/api/ingredients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ingredients ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // All other routes serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Start server (only if not in test mode)
// Check if this file is being run directly (not required by another module)
if (require.main === module) {
  initPromise.finally(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('======================================');
      console.log(`✓ ReciFind API running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('======================================');
      console.log('');
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});

// Export app for testing
module.exports = app;
