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
  connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/mydb',
});

// Initialize database tables for ReciFind
async function initDatabase() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Recipes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        chef_id INTEGER REFERENCES users(id),
        prep_time INTEGER,
        cook_time INTEGER,
        servings INTEGER,
        difficulty VARCHAR(50),
        image_url TEXT,
        rating DECIMAL(3, 2) DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ingredients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Recipe-Ingredients relationship table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        ingredient_id INTEGER REFERENCES ingredients(id),
        quantity VARCHAR(100),
        unit VARCHAR(50),
        UNIQUE(recipe_id, ingredient_id)
      )
    `);

    console.log('✓ ReciFind database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Initialize on startup
initDatabase();

// API Routes

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

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, u.username as chef_name
      FROM recipes r
      LEFT JOIN users u ON r.chef_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Search recipes by ingredients
app.post('/api/recipes/search', async (req, res) => {
  const { includeIngredients, excludeIngredients } = req.body;
  
  try {
    // TODO: Implement ingredient-based recipe search
    // This is a placeholder for future implementation
    res.json({ 
      message: 'Recipe search endpoint - coming soon!',
      includeIngredients,
      excludeIngredients 
    });
  } catch (error) {
    console.error('Error searching recipes:', error);
    res.status(500).json({ error: 'Failed to search recipes' });
  }
});

// Get recipe by ID
app.get('/api/recipes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT r.*, u.username as chef_name
      FROM recipes r
      LEFT JOIN users u ON r.chef_id = u.id
      WHERE r.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    // Get ingredients for this recipe
    const ingredientsResult = await pool.query(`
      SELECT i.name, ri.quantity, ri.unit
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.recipe_id = $1
    `, [id]);
    
    res.json({
      ...result.rows[0],
      ingredients: ingredientsResult.rows
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('======================================');
  console.log(`✓ ReciFind API running on port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Database: ${pool.options.host || 'localhost'}:${pool.options.port || 5432}`);
  console.log('======================================');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});
