# Stream-Flix Monorepo Dockerfile
# Multi-stage build for production

# Stage 1: Build frontend
FROM oven/bun:1 AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files and lockfile
COPY frontend/package.json frontend/bun.lock* ./

# Install frontend dependencies
RUN bun install --frozen-lockfile

# Copy frontend source files
COPY frontend .

# Build frontend (outputs to /app/frontend/dist)
RUN bun run build

# Stage 2: Install backend dependencies
FROM oven/bun:1 AS backend-deps

WORKDIR /app/backend

COPY backend/package.json backend/bun.lock* ./

RUN bun install --frozen-lockfile --production

# Stage 3: Production runtime
FROM oven/bun:1 AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S streamflix -u 1001 -G nodejs

WORKDIR /app

# Copy backend source files (Bun can run TypeScript directly)
COPY backend/src ./src

# Copy backend package.json (needed by Bun for "type": "module")
COPY backend/package.json ./package.json

# Copy production node_modules
COPY --from=backend-deps /app/backend/node_modules ./node_modules

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
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application with Bun (run TypeScript directly)
CMD ["bun", "run", "src/index.ts"]
