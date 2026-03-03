# Quix Monorepo Dockerfile
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


# Expose port
EXPOSE 3000

COPY health-check.js ./

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=2s --retries=5 \
    CMD bun ./health-check.js || exit 1

# Start the application with Bun (run TypeScript directly)
CMD ["bun", "run", "src/index.ts"]
