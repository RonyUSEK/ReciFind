---
applyTo: '**'
---

# ReciFind - Recipe Discovery Platform

> **Note to AI:** These are guidelines and project context to help you understand the direction and vision. Feel free to suggest improvements, alternative approaches, or better implementations. This is a living project that can evolve - don't treat these as strict rules. If you have a better idea or see an opportunity for improvement, go for it!

## Project Overview

**ReciFind** is a recipe discovery web application built for a 4th-year Computer Science Final Year Project (FYP). The platform focuses on helping users find recipes based on ingredients they have, with a robust role-based system for chefs and admins.

**Primary Feature:** Recipe search and filtering (ingredient-based, dietary preferences, cuisine types)  
**Secondary Features:** AI recipe generation (backup tool), chef submission system, content moderation

**Flexibility Note:** While search is the main feature, feel free to suggest enhancements or new features that could improve the user experience. The feature priorities can shift based on what works best.

## Project Context

- **Student Level:** 4th year CS undergraduate
- **Timeline:** 3-4 weeks development (flexible)
- **Approach:** Test-Driven Development (TDD) when practical
- **Scope:** Functional, well-structured, not over-engineered
- **Purpose:** University FYP demonstration project

## Technology Stack

### Frontend
- **Framework:** React 18
- **Styling:** Tailwind CSS 3.4
- **Routing:** React Router v6
- **State Management:** React Context API
- **HTTP Client:** Axios
- **Testing:** Jest + React Testing Library
- **Features:** Dark mode support, fully responsive design

### Backend
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **AI Integration:** OpenAI GPT-3.5-turbo (optional feature)
- **Testing:** Jest + Supertest
- **Security:** Helmet, express-rate-limit, express-validator

### Infrastructure
- **Development:** Docker Compose
- **Database Container:** PostgreSQL in Docker
- **Deployment Target:** Railway (backend), Vercel (frontend)

## User Roles & Permissions

### 1. User (Default Role)
- Browse and search recipes
- View recipe details
- Generate AI recipes (limited to 10/day)
- Save recipes to a personal "Saved" collection
- Create and manage recipe collections
- Report inappropriate content
- Chat with AI cooking assistant (30 messages/hour)
- Create and manage profile

### 2. Chef (Approved Role)
- Everything a User can do, PLUS:
- Submit custom recipes (status: pending)
- Edit own recipes (pending/rejected only)
- Delete own recipes
- View own recipe statistics
- Track recipe approval status

**Chef Verification System:**
- New chefs: First 3 recipes require admin approval
- After 3 approved recipes: Reputation score increases (+10 per approval)
- At 50+ reputation: "Verified Chef" badge
- Verified chefs: Recipes auto-approved but still reportable

### 3. Admin (Highest Permission)
- Everything Chef can do, PLUS:
- Approve/reject chef recipes with feedback
- Set featured "Recipe of the Day"
- Review and resolve content reports
- Manage user roles (promote user → chef)
- Track chef reputation scores
- View platform statistics
- Delete any content
- Ban users

## Core Features Priority

### MUST HAVE (Core Requirements)
1. **User Authentication** - Register, login, JWT-based auth
2. **Recipe Search & Filtering** - PRIMARY FEATURE (ingredient matching, dietary filters, cuisine, time, calories)
3. **Chef Submission System** - Submit recipes → admin approval workflow
4. **Content Moderation** - Report system for recipes
5. **User Interactions** - Saved recipes + collections
6. **User Profiles** - Bio, stats, saved/collections
7. **Chef Reputation System** - Track approvals, verified badge

### SHOULD HAVE (Enhancement)
8. Featured recipe on homepage (admin sets)
9. Popular recipes section
10. Recent uploads section
11. Mobile responsive design
12. Dark mode consistency
13. Test coverage 60-70%

### NICE TO HAVE (Optional/Bonus)
14. **AI Recipe Generator** - Generate recipes from ingredients (secondary tool, not main feature)
15. **AI Chatbot** - Cooking tips and advice
16. Recipe collections/groups (like Spotify playlists)
17. Email notifications
18. Print recipe view
19. Social sharing

## Database Schema

### Main Tables
- **users** - email, password_hash, name, role, is_verified, reputation_score, bio, profile_image
- **recipes** - title, description, instructions (JSONB), chef_id, source_type (ai/chef), status (pending/approved/rejected), is_featured, prep_time, cook_time, servings, difficulty, cuisine, spice_level, calories
- **ingredients** - name, category
- **recipe_ingredients** - recipe_id, ingredient_id, quantity, unit
- **recipe_approvals** - recipe_id, admin_id, status, feedback
- **recipe_collections** - user_id, name, description, is_public
- **collection_recipes** - collection_id, recipe_id OR (ai_key + ai_recipe)
- **reports** - content_type, content_id, reporter_id, reason, status
- **chat_sessions** - user_id, messages (JSONB)

### Important Indexes
- recipes: status, chef_id, is_featured, cuisine, difficulty
- reports: status, content_type
- users: email (unique), role

## API Architecture

### Authentication Routes (`/api/auth`)
- `POST /register` - Create new user account
- `POST /login` - Authenticate and return JWT
- `GET /me` - Get current user info (requires auth)
- `POST /logout` - Invalidate token
- `POST /refresh` - Refresh JWT token

### Recipe Routes (`/api/recipes`)
- `GET /` - List all approved recipes (paginated)
- `GET /search` - Search with filters (PRIMARY FEATURE)
- `GET /:id` - Get single recipe with details
- `POST /` - Create recipe (chef/admin only)
- `PUT /:id` - Update own recipe (chef/admin only)
- `DELETE /:id` - Delete own recipe (chef/admin only)
- `GET /my` - Get current user's recipes (chef only)
- `GET /featured` - Get featured recipe
- `GET /popular` - Get most saved recipes
- `POST /generate` - AI generate recipe (optional, auth required)

### Collection Routes (`/api/collections`)
- `GET /my` - List current user's collections (includes "Saved")
- `POST /` - Create a collection
- `PATCH /:id` - Update a collection
- `DELETE /:id` - Delete a collection
- `GET /:id/items` - List collection items
- `POST /:id/items` - Add a recipe to a collection
- `DELETE /:id/items/:itemId` - Remove an item from a collection
- `GET /saved/status` - Check if a recipe (or AI key) is in "Saved"
- `POST /saved/toggle` - Toggle a recipe (or AI key) in "Saved"

### Admin Routes (`/api/admin`)
- `GET /recipes/pending` - List pending recipes
- `POST /recipes/:id/approve` - Approve recipe
- `POST /recipes/:id/reject` - Reject with feedback
- `POST /recipes/:id/feature` - Set as featured
- `GET /users` - List all users
- `PUT /users/:id/role` - Change user role
- `PUT /users/:id/reputation` - Update chef reputation
- `GET /reports` - List all reports
- `PUT /reports/:id/resolve` - Resolve report

### Interaction Routes
- (Handled via `/api/collections` endpoints)

### Report Routes (`/api/reports`)
- `POST /` - Submit report (auth required)
- `GET /my` - Get user's reports
- (Admin routes in /api/admin)

### Chat Routes (`/api/chat`) - Optional
- `POST /` - Send message to AI chatbot
- `GET /sessions` - Get chat history

## Frontend Routes

- `/` - Homepage (search, featured recipe, popular recipes)
- `/login` - Login page
- `/register` - Register page
- `/search` - Search results with filters (PRIMARY PAGE)
- `/recipe/:id` - Recipe detail page
- `/dashboard` - User dashboard (saved/collections, profile)
- `/chef/dashboard` - Chef dashboard (my recipes, stats)
- `/admin/dashboard` - Admin panel (approvals, reports, users)
- `/profile/:id` - User public profile

## Coding Guidelines

> **Important:** These are suggestions and best practices, not strict requirements. Use your judgment - if a different approach makes more sense for a specific situation, feel free to adapt. The goal is clean, working code that solves the problem effectively.

### Test-Driven Development (TDD)
**Recommended TDD approach (adapt as needed):**
1. Write test first (red)
2. Implement minimum code to pass (green)
3. Refactor and optimize (refactor)
4. Commit changes

*Note: TDD is encouraged but not mandatory for every single feature. Use it where it makes sense, especially for critical business logic.*

Example workflow:
```javascript
// 1. Write test first
test('user can save a recipe', async () => {
  const response = await request(app)
    .post('/api/collections/saved/toggle')
    .send({ recipeId: 1 })
    .set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(200);
});

// 2. Implement feature
router.post('/collections/saved/toggle', authenticateToken, async (req, res) => {
  // Implementation
});

// 3. Refactor if needed
// 4. Commit
```

### Code Structure

**Backend Structure:**
```
backend/src/
├── middleware/
│   ├── auth.js          # JWT verification, role checking
│   ├── rateLimiter.js   # Rate limiting
│   └── validation.js    # Request validation
├── routes/
│   ├── auth.js
│   ├── recipes.js
│   ├── admin.js
│   └── chat.js
├── services/
│   ├── openai.js        # AI integration (optional)
│   ├── recipeGenerator.js
│   └── chatbot.js
├── utils/
│   ├── jwt.js
│   ├── validators.js
│   └── errorHandler.js
├── db/
│   ├── schema.sql
│   ├── seed.sql
│   └── index.js
└── index.js
```

**Frontend Structure:**
```
frontend/src/
├── components/
│   ├── Auth/
│   ├── Recipe/
│   ├── Chef/
│   ├── Admin/
│   ├── Chat/
│   └── Common/
├── pages/
│   ├── HomePage.js
│   ├── SearchPage.js
│   ├── RecipeDetailPage.js
│   ├── ChefDashboard.js
│   └── AdminDashboard.js
├── contexts/
│   └── AuthContext.js
├── utils/
│   └── api.js
└── App.js
```

### Naming Conventions

**Preferred conventions (but not rigid rules):**

**Variables & Functions:**
- Prefer camelCase: `getUserById`, `recipeList`, `isAuthenticated`
- Boolean variables: consider prefixes `is`, `has`, `should`: `isApproved`, `hasPermission`
- Event handlers: typically prefix with `handle`: `handleSubmit`, `handleDelete`

**Components:**
- Prefer PascalCase: `RecipeCard`, `SearchBar`, `AdminDashboard`
- Use descriptive names: `RecipeIngredientList` over `List`

**API Routes:**
- Generally follow RESTful conventions: GET, POST, PUT, DELETE
- Prefer plural nouns: `/recipes`, `/users`, `/collections`
- Consider kebab-case for multi-word: `/pending-recipes`

**Database:**
- Currently using snake_case for columns: `user_id`, `created_at`, `is_featured`
- Plural table names: `users`, `recipes`, `recipe_collections`

*Feel free to deviate from these conventions if there's a good reason or better alternative for a specific case.*

### Security Best Practices

**Core security measures (prioritize these, but suggest improvements if you know better approaches):**

1. **Authentication:**
   - Use JWT for protected routes (or suggest alternatives if better)
   - Store JWT in localStorage (open to other approaches like httpOnly cookies)
   - Attach token in Authorization header: `Bearer <token>`
   - Token expiry: ~7 days (adjustable)
   - Hash passwords with bcrypt (salt rounds: 10+)

2. **Authorization:**
   - Check user role before allowing actions
   - Use middleware: `requireRole(['admin'])`, `requireRole(['chef', 'admin'])`
   - Validate user owns resource before allowing edits/deletes

3. **Input Validation:**
   - Validate all user inputs (express-validator or alternatives)
   - Sanitize inputs to prevent XSS
   - Use parameterized queries to prevent SQL injection
   - Validate file uploads (if implemented)

4. **Rate Limiting (suggested limits, adjust as needed):**
   - Login attempts: ~5 per 15 minutes
   - AI generation: ~10 per day per user
   - Chat messages: ~30 per hour per user
  - Saving (collection updates): ~30 per hour
   - Recipe creation: ~5 per hour (chef)

5. **Security Headers:**
   - Use Helmet middleware
   - CORS configured properly
   - HTTPS enforced in production

*These are baseline security practices. If you know of better security patterns or libraries, please suggest them.*

### Performance Optimization

1. **Database:**
   - Create indexes on frequently queried columns
   - Use pagination (LIMIT/OFFSET) for large result sets
   - Avoid N+1 queries (use JOINs appropriately)
   - Default page size: 12-20 items

2. **Frontend:**
   - Lazy load routes with React.lazy()
   - Memoize expensive components (React.memo)
   - Use useCallback/useMemo for performance
   - Lazy load images
   - Implement infinite scroll or pagination

3. **API:**
   - Cache frequently accessed data (featured recipe, popular recipes)
   - Debounce search inputs (500ms)
   - Compress responses

### Error Handling

**Backend:**
```javascript
// Always use try-catch
router.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Frontend:**
```javascript
// Use error boundaries for React errors
// Show user-friendly error messages
// Use toast notifications for feedback
```

### UI/UX Guidelines

1. **Responsive Design:**
   - Mobile-first approach
   - Test on 320px width (iPhone SE)
   - Touch targets minimum 44x44px
   - Collapsible sidebars on mobile

2. **Dark Mode:**
   - Respect user's dark mode preference
   - Use Tailwind's dark: classes
   - Consistent across all pages

3. **Loading States:**
   - Show loading spinners during API calls
   - Use skeleton screens for better UX
   - Disable buttons during submission

4. **Feedback:**
   - Toast notifications for actions (success/error)
   - Inline validation errors on forms
   - Confirmation dialogs for destructive actions

5. **Empty States:**
   - "No recipes found" with suggestions
  - "No saved recipes yet" with CTA
  - "No collections yet" with CTA

## Important Implementation Notes

> **Design Philosophy:** These notes reflect the current vision, but they're not set in stone. If you see a better way to implement these features or think the user flow could be improved, suggest it! We're open to iterating.

### Recipe Search (PRIMARY FEATURE)
The main feature is searching existing recipes, NOT AI generation.

**Suggested Search Flow:**
1. User enters ingredients/text on homepage
2. Clicks "Search" → navigates to `/search` page
3. Results displayed with advanced filters
4. If no results: Show "Generate with AI" as backup option

**Current guideline:** Search button should navigate to search page, not directly trigger AI generation. However, if you think there's a better UX flow, feel free to propose it.

### AI Features (SECONDARY/OPTIONAL)
- AI recipe generator is currently planned as a backup tool, not the main feature
- Display "Generate with AI" as separate button
- Show AI option when search returns zero results
- Implement based on priority (Week 3-4 or later)

*These priorities can shift - if AI features become more important or if we want to pivot, that's fine.*

### Recipe Status Flow
```
Chef creates recipe → status: "pending"
Admin reviews → Approve OR Reject
If approved → status: "approved" (visible to all)
If rejected → status: "rejected" (chef can edit & resubmit)
```

### Chef Reputation Logic
```javascript
// Pseudo-code
newChef.reputation = 0;

onRecipeApproval() {
  chef.reputation += 10;
  if (chef.reputation >= 50) {
    chef.isVerified = true;
    // Future recipes auto-approved
  }
}

// First 3 recipes always need approval
if (chef.approvedRecipesCount < 3 || !chef.isVerified) {
  recipe.status = 'pending';
} else {
  recipe.status = 'approved'; // Auto-approve verified chefs
}
```

## Testing Requirements

### Target Coverage
- Backend: 70%+
- Frontend: 60%+

### Test Priorities
1. Authentication (register, login, token verification)
2. Recipe CRUD operations
3. Search and filtering logic
4. Admin approval workflow
5. Report system
6. User interactions (saved/collections)

### Example Test Structure
```javascript
describe('Recipe Search', () => {
  test('returns recipes matching ingredient filter', async () => {
    // Arrange
    const ingredients = ['chicken', 'garlic'];
    
    // Act
    const response = await request(app)
      .get('/api/recipes/search')
      .query({ ingredients: ingredients.join(',') });
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body.recipes).toBeInstanceOf(Array);
    expect(response.body.recipes.length).toBeGreaterThan(0);
  });
});
```

## Git Workflow

### Commit Message Format
```
feat: add recipe search filtering
fix: resolve login token expiration bug
test: add tests for chef approval system
docs: update API documentation
refactor: optimize search query performance
```

### Branch Strategy (Optional)
```bash
main - production-ready code
develop - integration branch
feature/* - individual features
```

For FYP, committing directly to main is acceptable.

## Environment Variables

### Backend (.env)
```
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/recifind
JWT_SECRET=your-long-secret-key-here
OPENAI_API_KEY=sk-... (optional, for AI features)
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
```

## Common Pitfalls to Watch For

**Things to be mindful of (but use judgment):**

1. **Feature priorities** - Currently search is main, AI is bonus (but this can evolve)
2. **Testing** - Try to write tests when practical, especially for critical logic
3. **SQL injection** - Use parameterized queries (or an ORM if that works better)
4. **Password security** - Hash passwords (bcrypt or better alternatives)
5. **Rate limiting** - Prevent API abuse where it matters
6. **Mobile responsiveness** - Test on mobile early, but don't stress about pixel-perfection
7. **Keep it simple** - FYP level, not production at scale (but well-structured)
8. **Environment variables** - Keep secrets out of code
9. **Input validation** - Validate user inputs where important
10. **Error handling** - Handle errors gracefully, especially user-facing ones

*These are suggestions based on common issues, not strict rules. If you have better solutions, use them!*

## Success Criteria

A successful FYP submission should have:
- ✅ Working authentication with 3 roles
- ✅ Functional recipe search with multiple filters
- ✅ Chef can submit, admin can approve
- ✅ Report system working
- ✅ User can save recipes to collections
- ✅ 60%+ test coverage
- ✅ Mobile responsive
- ✅ Dark mode working
- ✅ Deployed and accessible online
- ✅ Documentation (README, API docs, ER diagram)

## Development Timeline Reference

**Rough timeline (very flexible):**

Week 1: Database + Auth + Search (PRIMARY)
Week 2: Chef/Admin systems + Moderation
Week 3: User interactions + Polish
Week 4: Testing + Optional AI + Deploy

Total: ~3-4 weeks for complete FYP-ready application

*This timeline is a guide, not a deadline. We can adjust based on what features end up being most important or interesting.*

---

## Final Notes for AI Assistants

**Please remember:**
- These instructions are **guidelines and context**, not rigid requirements
- **Suggest improvements** if you see better ways to do things
- **Ask questions** if something doesn't make sense
- **Adapt approaches** based on the specific situation
- **Propose new features** or modifications if they'd improve the project
- **Challenge assumptions** if you think there's a better direction

The goal is to build a functional, well-structured FYP project that demonstrates good software engineering practices. How we get there can evolve!

---

**Last Updated:** November 19, 2025  
**Project Type:** University Final Year Project (FYP)  
**Development Approach:** TDD when practical, pragmatic engineering
**Complexity Level:** Appropriate for 4th year CS student  
**Philosophy:** Guidelines over rules, evolution over rigidity