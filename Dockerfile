# Stream-Flix Monorepo Dockerfile
# Multi-stage build for production

# Stage 1: Build frontend
FROM oven/bun:1.2-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files and lockfile
COPY frontend/package.json frontend/bun.lock* ./

# Install frontend dependencies
RUN bun install --frozen-lockfile

# Copy frontend source files
COPY frontend .

# Build frontend (outputs to /app/frontend/dist)
RUN bun run build

# Stage 2: Build backend (compile TypeScript)
FROM oven/bun:1.2-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files and lockfile
COPY backend/package.json backend/bun.lock* ./

# Install all dependencies (including devDependencies for tsc)
RUN bun install --frozen-lockfile

# Copy backend source files
COPY backend .

# Compile TypeScript → outputs to /app/backend/dist
RUN bun run build

# Stage 3: Install production-only backend dependencies
FROM oven/bun:1.2-alpine AS backend-deps

WORKDIR /app/backend

COPY backend/package.json backend/bun.lock* ./

RUN bun install --frozen-lockfile --production

# Stage 4: Production runtime
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S streamflix -u 1001 -G nodejs

WORKDIR /app

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy production node_modules
COPY --from=backend-deps /app/backend/node_modules ./node_modules

# Copy backend package.json (needed by Node.js for "type": "module")
COPY backend/package.json ./package.json

# Copy built frontend static assets (served by @elysiajs/static)
COPY --from=frontend-builder /app/frontend/dist ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user before exposing ports
USER streamflix

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
