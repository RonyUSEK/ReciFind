# Stage 1: Build stage - Install dependencies and build the application
FROM node:18-bookworm AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend dependencies (production only)
RUN cd backend && npm install --only=production

# Install frontend dependencies and build
RUN cd frontend && npm install

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend for production
RUN cd frontend && npm run build

# Stage 2: Production image - Only include built artifacts
FROM node:18-slim

WORKDIR /app

# Copy backend and its dependencies from builder
COPY --from=builder /app/backend ./backend

# Copy built frontend from builder
COPY --from=builder /app/frontend/build ./frontend/build

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Change to backend directory
WORKDIR /app/backend

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "index.js"]
