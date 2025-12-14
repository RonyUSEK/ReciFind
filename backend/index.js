const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables from backend/.env (dev container does not inject all vars)
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

const SOFT_DELETE_DAYS = parseInt(process.env.RECIPE_SOFT_DELETE_DAYS || '7', 10);

// CORS Middleware - Allow all origins for development (mobile access)
app.use(cors({
  origin: true, // Allow all origins (for mobile device access on local network)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

    // Soft-delete support for recipes (incremental upgrade)
    await pool.query('ALTER TABLE recipes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recipes_deleted_at ON recipes(deleted_at)');

    // Collections (private saved + public playlists) incremental upgrade
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_collections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      );
    `);
    // If table existed from an older schema, ensure newer columns/indexes exist.
    await pool.query('ALTER TABLE recipe_collections ADD COLUMN IF NOT EXISTS description TEXT');
    await pool.query('ALTER TABLE recipe_collections ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE');
    await pool.query('ALTER TABLE recipe_collections ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await pool.query('ALTER TABLE recipe_collections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recipe_collections_user_id ON recipe_collections(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recipe_collections_is_public ON recipe_collections(is_public)');
    // Use a unique index (works even if the original UNIQUE constraint wasn't present).
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_recipe_collections_user_name ON recipe_collections(user_id, name)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_recipes (
        id SERIAL PRIMARY KEY,
        collection_id INTEGER NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        ai_key VARCHAR(64),
        ai_recipe JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (recipe_id IS NOT NULL AND ai_recipe IS NULL AND ai_key IS NULL)
          OR
          (recipe_id IS NULL AND ai_recipe IS NOT NULL AND ai_key IS NOT NULL)
        )
      );
    `);
    // If table existed from an older schema, ensure newer columns exist.
    await pool.query('ALTER TABLE collection_recipes ADD COLUMN IF NOT EXISTS ai_key VARCHAR(64)');
    await pool.query('ALTER TABLE collection_recipes ADD COLUMN IF NOT EXISTS ai_recipe JSONB');
    await pool.query('ALTER TABLE collection_recipes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    // Legacy schema may have enforced recipe_id NOT NULL; allow AI-only rows.
    await pool.query('ALTER TABLE collection_recipes ALTER COLUMN recipe_id DROP NOT NULL');
    // Add/ensure the check constraint exists; if legacy data violates it, skip rather than breaking startup.
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'collection_recipes_item_check'
        ) THEN
          BEGIN
            ALTER TABLE collection_recipes
              ADD CONSTRAINT collection_recipes_item_check
              CHECK (
                (recipe_id IS NOT NULL AND ai_recipe IS NULL AND ai_key IS NULL)
                OR
                (recipe_id IS NULL AND ai_recipe IS NOT NULL AND ai_key IS NOT NULL)
              );
          EXCEPTION
            WHEN others THEN
              -- ignore (e.g., legacy rows violate constraint)
              NULL;
          END;
        END IF;
      END $$;
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_collection_recipes_collection_id ON collection_recipes(collection_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_collection_recipes_recipe_id ON collection_recipes(recipe_id)');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_recipes_recipe ON collection_recipes(collection_id, recipe_id) WHERE recipe_id IS NOT NULL');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_recipes_ai ON collection_recipes(collection_id, ai_key) WHERE ai_key IS NOT NULL');

    if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
      console.log('✓ Database already initialized');
    }
  } catch (error) {
    // Tables don't exist - initialize database
    if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
      console.log('⚙️  Database not initialized, setting up...');
      console.log('   Creating tables and loading demo data...');
    }
    
    const fs = require('fs');
    const initPath = path.join(__dirname, 'src/db/init.js');
    
    if (fs.existsSync(initPath)) {
      try {
        // Run initialization script in silent mode (no interactive prompts)
        const { initializeDatabase } = require('./src/db/init.js');
        await initializeDatabase(true); // true = silent mode
        if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
          console.log('✓ Database initialized with demo data');
          console.log('');
          console.log('🔐 Demo Login Credentials:');
          console.log('   User:  john.doe@example.com / password123');
          console.log('   Chef:  chef.maria@example.com / password123');
          console.log('   Admin: admin@recifind.com / password123');
          console.log('');
        }
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

async function purgeSoftDeletedRecipes() {
  // Permanently delete recipes that were soft-deleted more than SOFT_DELETE_DAYS ago.
  // Cascading FKs will remove related rows.
  if (!Number.isFinite(SOFT_DELETE_DAYS) || SOFT_DELETE_DAYS <= 0) return;

  try {
    const result = await pool.query(
      `DELETE FROM recipes
       WHERE deleted_at IS NOT NULL
         AND deleted_at < (CURRENT_TIMESTAMP - ($1 || ' days')::interval)`,
      [String(SOFT_DELETE_DAYS)]
    );

    if (process.env.NODE_ENV !== 'test' && result.rowCount > 0) {
      console.log(`🧹 Purged ${result.rowCount} soft-deleted recipe(s)`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error purging soft-deleted recipes:', error);
    }
  }
}

// Run purge on startup + periodically (no-op in tests)
// Note: scheduling is done only when this module is run directly.

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

// Ingredient routes (list + user requests)
const ingredientRoutes = require('./src/routes/ingredients');
app.use('/api/ingredients', ingredientRoutes);

// Recipe collections (private saved + public playlists)
const collectionRoutes = require('./src/routes/collections');
app.use('/api/collections', collectionRoutes);

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

// (moved to src/routes/ingredients.js)

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
    if (process.env.NODE_ENV !== 'test') {
      purgeSoftDeletedRecipes();
      setInterval(() => purgeSoftDeletedRecipes(), 60 * 60 * 1000);
    }

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
