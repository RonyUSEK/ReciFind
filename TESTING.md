# 🎯 Testing Your Fullstack Boilerplate

This guide helps you test that everything works correctly.

## ✅ Pre-Flight Check

Run the verification script:

```bash
./verify-setup.sh
```

You should see all green checkmarks. If any checks fail, follow the instructions provided.

---

## 🧪 Test 1: Quick Demo Mode

**What we're testing:** Production deployment with one command

```bash
./docker/scripts/demo.sh
```

**Expected results:**
- ✅ Script builds production image (first time)
- ✅ PostgreSQL container starts
- ✅ Application container starts
- ✅ Health checks pass
- ✅ Success message shows
- ✅ Access http://localhost:5000 works

**In the browser:**
- ✅ Todo app loads
- ✅ "Database Connected" badge shows
- ✅ Can add a todo
- ✅ Todo appears in the list
- ✅ Can delete the todo
- ✅ Todo is removed from the list

**Clean up:**
```bash
docker-compose -f docker/deploy/docker-compose.yml down
```

---

## 🧪 Test 2: Development Mode

**What we're testing:** Development container with hot reload

### Step 1: Build and Run Dev Container

```bash
./docker/dev/build_image.sh
```

**Expected:**
- ✅ Docker build runs successfully
- ✅ Image `fullstack_dev:latest` is created
- ✅ Success message shows

```bash
./docker/dev/run_docker.sh
```

**Expected:**
- ✅ PostgreSQL starts
- ✅ Dev container starts
- ✅ You're dropped into a bash shell
- ✅ Prompt shows `[fullstack-dev] dev@...`
- ✅ Welcome message appears

### Step 2: Install Dependencies

Inside the container:

```bash
cd backend && npm install
```

**Expected:**
- ✅ npm installs packages successfully
- ✅ `node_modules` folder created
- ✅ No errors

```bash
cd ../frontend && npm install
```

**Expected:**
- ✅ npm installs packages successfully
- ✅ `node_modules` folder created
- ✅ No errors

### Step 3: Start Backend

In the container (or new terminal):

```bash
cd /workspace/backend
npm run dev
```

**Expected:**
- ✅ Nodemon starts
- ✅ "Backend server running on port 5000" message
- ✅ "Database: localhost:5432" message
- ✅ No errors

**Test the API:**

In another terminal on your host:

```bash
# Health check
curl http://localhost:5000/api/health

# Should return: {"status":"healthy","database":"connected",...}

# Get todos
curl http://localhost:5000/api/todos

# Should return: []
```

### Step 4: Start Frontend

Open a new terminal, attach to the container:

```bash
docker exec -it fullstack_dev_container bash
```

Then:

```bash
cd /workspace/frontend
npm start
```

**Expected:**
- ✅ React dev server starts
- ✅ "Compiled successfully!" message
- ✅ Runs on http://0.0.0.0:3000
- ✅ No errors

**In browser (http://localhost:3000):**
- ✅ Todo app loads
- ✅ "Database Connected" badge shows
- ✅ Can add and delete todos
- ✅ Changes persist (refresh page, todos still there)

### Step 5: Test Hot Reload

**Backend hot reload:**

1. Keep backend running
2. Edit `backend/index.js` - change the console.log message
3. Save the file
4. **Expected:** Nodemon detects change and restarts server

**Frontend hot reload:**

1. Keep frontend running
2. Edit `frontend/src/App.js` - change the title text
3. Save the file
4. **Expected:** Browser automatically refreshes with new content

### Clean Up

```bash
# Exit container
exit

# Stop containers
docker stop fullstack_dev_container fullstack_postgres
docker rm fullstack_dev_container fullstack_postgres
```

---

## 🧪 Test 3: VS Code Attach

**What we're testing:** VS Code integration with dev container

### Step 1: Start Dev Container

```bash
./docker/dev/run_docker.sh
```

Leave this running. Don't close it.

### Step 2: Attach VS Code

1. Open VS Code
2. Click the **green icon** in the bottom-left corner
3. Select **"Attach to Running Container"**
4. Choose `fullstack_dev_container`
5. When VS Code opens, click **"Open Folder"**
6. Select `/workspace`

**Expected:**
- ✅ VS Code opens with container file system
- ✅ Can see project files
- ✅ Terminal opens inside container
- ✅ Extensions can be installed

### Step 3: Work in VS Code

1. Open integrated terminal (Ctrl + `)
2. Run: `cd backend && npm run dev`
3. Open another terminal (Ctrl + Shift + `)
4. Run: `cd frontend && npm start`

**Expected:**
- ✅ Both servers start
- ✅ Can edit files
- ✅ IntelliSense works
- ✅ Can see file changes

### Step 4: Test IntelliSense

1. Open `backend/index.js`
2. Type `app.` somewhere in the code
3. **Expected:** Autocomplete suggestions appear

1. Open `frontend/src/App.js`
2. Type `React.` somewhere
3. **Expected:** Autocomplete suggestions appear

---

## 🧪 Test 4: Database Persistence

**What we're testing:** Data persists across restarts

### Step 1: Add Data in Demo Mode

```bash
./docker/scripts/demo.sh
```

1. Visit http://localhost:5000
2. Add 3 todos: "Task 1", "Task 2", "Task 3"
3. Verify they appear

### Step 2: Restart Containers

```bash
docker-compose -f docker/deploy/docker-compose.yml restart
```

### Step 3: Check Data

1. Visit http://localhost:5000
2. **Expected:** All 3 todos are still there

### Step 4: Full Stop and Start

```bash
docker-compose -f docker/deploy/docker-compose.yml down
./docker/scripts/demo.sh
```

1. Visit http://localhost:5000
2. **Expected:** All 3 todos are still there (data persisted in volume)

### Clean Up

```bash
docker-compose -f docker/deploy/docker-compose.yml down -v  # -v removes volumes
```

---

## 🧪 Test 5: Production Build Optimization

**What we're testing:** Multi-stage build creates small image

```bash
./docker/deploy/build_image.sh
```

Check image size:

```bash
docker images | grep fullstack
```

**Expected:**
- ✅ Image is created
- ✅ Image size is reasonable (< 500MB)
- ✅ Two images shown: `fullstack_app` and intermediate builder

Check what's inside:

```bash
docker run --rm fullstack_app:latest ls -la /app
```

**Expected:**
- ✅ Only `backend/` and `frontend/build/` directories
- ✅ No source code in `frontend/src/`
- ✅ No dev dependencies

---

## 🧪 Test 6: Error Handling

**What we're testing:** App handles database failures

### Step 1: Start Demo

```bash
./docker/scripts/demo.sh
```

### Step 2: Stop Database

```bash
docker stop fullstack_db
```

### Step 3: Check App

1. Visit http://localhost:5000
2. Try to add a todo
3. **Expected:** Error message appears
4. Database status badge shows "disconnected"

### Step 4: Restart Database

```bash
docker start fullstack_db
```

Wait a few seconds, then refresh the page.

**Expected:**
- ✅ Database reconnects
- ✅ App works again
- ✅ Badge shows "connected"

---

## 📊 Success Criteria Summary

All tests should pass:

- ✅ **Test 1:** Demo mode works with one command
- ✅ **Test 2:** Dev mode with hot reload works
- ✅ **Test 3:** VS Code attach works
- ✅ **Test 4:** Data persists across restarts
- ✅ **Test 5:** Production build is optimized
- ✅ **Test 6:** Error handling works

---

## 🐛 Common Issues

### Port Already in Use

```bash
# Find what's using the port
lsof -i :5000

# Kill it or stop the container
docker stop <container_name>
```

### Container Won't Start

```bash
# Clean up everything
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)

# Try again
./docker/dev/run_docker.sh
```

### npm install Fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and try again
rm -rf node_modules
npm install
```

### Can't Access Application

```bash
# Check if containers are running
docker ps

# Check logs
docker logs fullstack_app
docker logs fullstack_db

# Check if ports are bound
netstat -tuln | grep 5000
```

---

## ✅ Final Verification

If all tests pass, your boilerplate is working perfectly! You can now:

1. Commit to Git
2. Share with teammates
3. Use as a starting point for projects
4. Modify for your specific needs

**🎉 Congratulations!**
