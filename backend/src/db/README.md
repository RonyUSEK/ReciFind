# ReciFind Database

PostgreSQL database schema, seed data, and initialization scripts for the ReciFind recipe platform.

---

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `schema.sql` | Complete database schema with all tables, indexes, constraints, and triggers |
| `seed.sql` | Demo data for development/testing (9 users, 12 recipes, 40+ ingredients) |
| `init.js` | Node.js script to initialize database (runs schema + seed) |
| `init.sh` | Bash wrapper script for easy initialization |
| `ER_DIAGRAM.md` | Complete entity-relationship diagram and documentation |

---

## 🚀 Quick Start

### Option 1: Using the Shell Script (Recommended)

```bash
cd backend
./src/db/init.sh
```

### Option 2: Using Node.js Directly

```bash
cd backend
node src/db/init.js
```

### Option 3: Manual SQL Execution

```bash
cd backend/src/db
psql -U recifind_user -d recifind -f schema.sql
psql -U recifind_user -d recifind -f seed.sql
```

---

## 📋 Prerequisites

1. **PostgreSQL 15+** must be installed and running
2. **Node.js 18+** (for init.js script)
3. **Database must exist** (see below for creation)

### Create Database

If the database doesn't exist yet:

```bash
# Using psql
psql -U postgres
CREATE DATABASE recifind;
CREATE USER recifind_user WITH PASSWORD 'recifind_password';
GRANT ALL PRIVILEGES ON DATABASE recifind TO recifind_user;
\q

# Or using Docker Compose (recommended for development)
cd docker/dev
docker-compose up -d postgres
```

---

## 🔧 Configuration

Database connection settings are read from environment variables or use these defaults:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recifind
DB_USER=recifind_user
DB_PASSWORD=recifind_password
```

### Setting Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recifind
DB_USER=recifind_user
DB_PASSWORD=recifind_password
```

---

## 📊 Database Schema

### Core Tables (12 total):

**User Management:**
- `users` - User accounts with role-based access (user, chef, admin)

**Recipe System:**
- `recipes` - Recipe content and metadata
- `ingredients` - Master ingredient list
- `recipe_ingredients` - Junction table linking recipes to ingredients
- `recipe_approvals` - Chef recipe approval history

**User Interactions:**
- `favorites` - User bookmarked recipes
- `likes` - Recipe likes/dislikes
- `comments` - User comments on recipes

**Moderation & Features:**
- `reports` - Content moderation reports
- `chat_sessions` - AI chatbot conversation history

**Collections (Optional/Low Priority):**
- `recipe_collections` - User-created recipe collections
- `collection_recipes` - Junction table for collections

### Key Features:
- ✅ Foreign key constraints with cascading deletes
- ✅ Indexes on frequently queried columns
- ✅ Automatic `updated_at` triggers
- ✅ JSONB for flexible data (instructions, chat messages)
- ✅ Enums for constrained values (role, status, difficulty)

See `ER_DIAGRAM.md` for complete documentation.

---

## 🧪 Demo Data

The seed data includes:

### Users (9 total):
- **3 Regular Users:** john.doe@example.com, sarah.smith@example.com, mike.johnson@example.com
- **3 Chefs:** 
  - chef.maria@example.com (Verified, 60 reputation)
  - chef.david@example.com (Not verified, 20 reputation)
  - chef.emma@example.com (Verified, 55 reputation)
- **3 Admins:** admin@recifind.com, moderator@recifind.com, supervisor@recifind.com

**All demo users use password:** `password123`

### Recipes (12 total):
- 10 Approved recipes (various cuisines)
- 1 Pending approval (Thai Green Curry)
- 1 Rejected (Quick Fried Rice - needs improvement)

### Other Data:
- 40+ common cooking ingredients
- 10 user favorites
- 15 recipe likes/dislikes
- 9 user comments
- 2 content reports
- 2 AI chat sessions
- 3 recipe collections

---

## 🔍 Verifying Installation

After running initialization, verify with these queries:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Count records
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM recipes) as recipes,
  (SELECT COUNT(*) FROM ingredients) as ingredients,
  (SELECT COUNT(*) FROM favorites) as favorites,
  (SELECT COUNT(*) FROM comments) as comments;

-- View sample recipes
SELECT id, title, status, chef_id, cuisine, difficulty 
FROM recipes 
ORDER BY created_at DESC 
LIMIT 5;

-- View user roles
SELECT id, name, email, role, reputation_score, is_verified 
FROM users 
ORDER BY role, id;
```

---

## 🔄 Reinitializing Database

⚠️ **Warning:** This will DELETE ALL DATA and recreate tables!

The init scripts automatically drop existing tables and recreate them with fresh seed data. This is useful for:
- Resetting to clean state during development
- Recovering from schema errors
- Testing with fresh data

```bash
# Just run initialization again
./src/db/init.sh
```

---

## 🛠️ Common Tasks

### Adding New Ingredients

```sql
INSERT INTO ingredients (name, category) VALUES 
('avocado', 'fruits'),
('quinoa', 'grains');
```

### Creating a New User

```sql
-- Password: "password123" hashed with bcrypt
INSERT INTO users (email, password_hash, name, role) VALUES 
('newuser@example.com', '$2b$10$rKXwYvVqN2H0VzN7qvHXKO5YGmz5lPpXCvZjCw1DmGX0jzN2qvHXK', 'New User', 'user');
```

### Approving a Pending Recipe

```sql
-- Update recipe status
UPDATE recipes SET status = 'approved' WHERE id = 7;

-- Add approval record
INSERT INTO recipe_approvals (recipe_id, admin_id, status, feedback) 
VALUES (7, 7, 'approved', 'Great recipe! Approved.');

-- Update chef reputation
UPDATE users SET reputation_score = reputation_score + 10 WHERE id = 5;
```

### Finding Recipes by Ingredient

```sql
SELECT r.id, r.title, r.cuisine 
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN ingredients i ON ri.ingredient_id = i.id
WHERE i.name IN ('chicken', 'garlic')
AND r.status = 'approved'
GROUP BY r.id
HAVING COUNT(DISTINCT i.name) = 2;  -- Must have both ingredients
```

---

## 📝 Schema Modifications

When adding new tables or modifying the schema:

1. **Update `schema.sql`** with your changes
2. **Update `seed.sql`** to include sample data for new tables
3. **Update `ER_DIAGRAM.md`** to document the changes
4. **Run initialization** to apply changes: `./init.sh`

### Best Practices:
- Always include indexes on foreign keys
- Add constraints for data validation
- Use meaningful table/column names
- Document complex relationships
- Test with various data scenarios

---

## 🔐 Security Notes

### Password Hashing
- All user passwords are hashed with **bcrypt** (salt rounds: 10)
- Never store plain text passwords
- Demo data uses placeholder hash - **replace in production!**

### SQL Injection Prevention
- Always use **parameterized queries** in application code
- Never concatenate user input into SQL strings
- Use the `pg` library's query parameters

Example (Node.js):
```javascript
// ✅ GOOD - Parameterized query
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
);

// ❌ BAD - SQL injection vulnerable!
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${userEmail}'`
);
```

---

## 🐛 Troubleshooting

### "Connection refused" Error

**Problem:** PostgreSQL is not running

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps  # If using Docker

# Start PostgreSQL with Docker Compose
cd docker/dev
docker-compose up -d postgres

# Or start system PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

### "Database does not exist" Error

**Problem:** Database hasn't been created yet

**Solution:**
```bash
psql -U postgres
CREATE DATABASE recifind;
\q
```

### "Permission denied" Error

**Problem:** User doesn't have database privileges

**Solution:**
```bash
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE recifind TO recifind_user;
GRANT ALL ON SCHEMA public TO recifind_user;
\q
```

### "Module not found" Error (Node.js)

**Problem:** Dependencies not installed

**Solution:**
```bash
cd backend
npm install
```

---

## 📚 Additional Resources

- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **pg (Node.js library):** https://node-postgres.com/
- **bcrypt:** https://www.npmjs.com/package/bcrypt
- **ER Diagram Tool:** https://dbdiagram.io/

---

## ✅ Next Steps

After initializing the database:

1. ✅ Verify tables and data were created
2. ✅ Test database connection from backend
3. ✅ Implement authentication routes (Step 1.2)
4. ✅ Create API endpoints for recipes
5. ✅ Begin frontend integration

See `docs/BUILD_PIPELINE.md` for the complete development roadmap.

---

**Database Version:** 1.0  
**Last Updated:** November 19, 2025  
**PostgreSQL Version:** 15+
