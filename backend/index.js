const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Initialize database and start server
initializeDatabaseIfNeeded().catch(err => {
  console.error('❌ Database check error:', err.message);
});

// API Routes

// Authentication routes
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

// Recipe routes
const recipeRoutes = require('./src/routes/recipes');
app.use('/api/recipes', recipeRoutes);

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
  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('======================================');
    console.log(`✓ ReciFind API running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('======================================');
    console.log('');
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
