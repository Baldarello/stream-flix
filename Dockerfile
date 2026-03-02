# Stream-Flix Monorepo Dockerfile
# Multi-stage build for production

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Setup backend dependencies
FROM node:20-alpine AS backend-deps

WORKDIR /app/backend

# Copy backend package files
COPY backend/package.json backend/package-lock.json* ./

# Install backend dependencies
RUN npm ci --only=production

# Stage 3: Production runtime
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S streamflix -u 1001

WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy backend
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Change to non-root user
USER streamflix

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
