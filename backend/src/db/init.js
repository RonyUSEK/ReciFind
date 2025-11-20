#!/usr/bin/env node
/**
 * ReciFind Database Initialization Script
 * Initializes PostgreSQL database with schema and seed data
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from environment or defaults
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'recifind',
  user: process.env.DB_USER || 'recifind_user',
  password: process.env.DB_PASSWORD || 'recifind_password',
};

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

async function initializeDatabase(silent = false) {
  const client = new Client(dbConfig);
  
  try {
    if (!silent) logSection('ReciFind Database Initialization');
    
    // Connect to database
    if (!silent) {
      log('\n📡 Connecting to PostgreSQL database...', 'blue');
      log(`   Host: ${dbConfig.host}:${dbConfig.port}`, 'reset');
      log(`   Database: ${dbConfig.database}`, 'reset');
      log(`   User: ${dbConfig.user}`, 'reset');
    }
    
    await client.connect();
    if (!silent) log('✅ Connected successfully!\n', 'green');
    
    // Check if database is already initialized
    if (!silent) {
      log('🔍 Checking if database is already initialized...', 'blue');
      const checkQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `;
      const { rows } = await client.query(checkQuery);
      const isInitialized = rows[0].exists;
      
      if (isInitialized) {
        log('⚠️  Database already contains tables!', 'yellow');
        log('   This will DROP all existing tables and recreate them.', 'yellow');
        log('   All data will be lost!\n', 'red');
        
        // In production, you might want to prompt for confirmation
        // For now, we'll proceed automatically in development
        log('   Proceeding with reinitialization...\n', 'yellow');
      } else {
        log('✅ Database is empty. Proceeding with initialization.\n', 'green');
      }
    }
    
    // Execute schema.sql
    if (!silent) logSection('Creating Database Schema');
    if (!silent) log('📄 Reading schema.sql...', 'blue');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    if (!silent) log('🔨 Creating tables, indexes, and triggers...', 'blue');
    await client.query(schemaSQL);
    if (!silent) log('✅ Schema created successfully!\n', 'green');
    
    // Execute seed.sql
    if (!silent) logSection('Seeding Database with Demo Data');
    if (!silent) log('📄 Reading seed.sql...', 'blue');
    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    if (!silent) log('🌱 Inserting demo data...', 'blue');
    await client.query(seedSQL);
    if (!silent) log('✅ Data seeded successfully!\n', 'green');
    
    // Verify the initialization
    if (!silent) {
      logSection('Verification');
      log('🔍 Verifying database initialization...', 'blue');
      
      const verifyQueries = [
        { name: 'Users', query: 'SELECT COUNT(*) as count FROM users' },
        { name: 'Recipes', query: 'SELECT COUNT(*) as count FROM recipes' },
        { name: 'Ingredients', query: 'SELECT COUNT(*) as count FROM ingredients' },
        { name: 'Favorites', query: 'SELECT COUNT(*) as count FROM favorites' },
        { name: 'Likes', query: 'SELECT COUNT(*) as count FROM likes' },
        { name: 'Comments', query: 'SELECT COUNT(*) as count FROM comments' },
      ];
      
      log('\n📊 Database Statistics:', 'cyan');
      for (const { name, query } of verifyQueries) {
        const result = await client.query(query);
        const count = result.rows[0].count;
        log(`   ${name}: ${count}`, 'reset');
      }
      
      // Display demo credentials
      logSection('Demo Credentials');
      log('\n🔐 You can log in with these demo accounts:', 'cyan');
      log('\n   👤 Regular User:', 'bright');
      log('      Email: john.doe@example.com', 'reset');
      log('      Password: password123', 'reset');
      log('\n   👨‍🍳 Chef (Verified):', 'bright');
      log('      Email: chef.maria@example.com', 'reset');
      log('      Password: password123', 'reset');
      log('\n   🛡️  Admin:', 'bright');
      log('      Email: admin@recifind.com', 'reset');
      log('      Password: password123', 'reset');
      
      logSection('Success!');
      log('✅ Database initialization completed successfully!', 'green');
      log('🚀 You can now start the backend server.\n', 'green');
    }
    
  } catch (error) {
    if (!silent) {
      log('\n❌ Error during database initialization:', 'red');
      log(error.message, 'red');
      
      if (error.code === 'ECONNREFUSED') {
        log('\n💡 Tip: Make sure PostgreSQL is running.', 'yellow');
        log('   If using Docker: docker-compose up -d postgres', 'yellow');
      } else if (error.code === '42P01') {
        log('\n💡 Tip: This looks like a SQL error. Check schema.sql syntax.', 'yellow');
      }
    }
    
    throw error; // Re-throw for caller to handle
  } finally {
    await client.end();
    if (!silent) log('📡 Database connection closed.\n', 'blue');
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { initializeDatabase };
