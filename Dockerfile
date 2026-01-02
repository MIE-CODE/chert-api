# ============================================
# Builder Stage - Build TypeScript and dependencies
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack and use yarn v1 (classic) to avoid v4 migration issues
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Copy package files for dependency installation
COPY package.json yarn.lock ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for building)
RUN yarn install --frozen-lockfile

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN yarn build

# Verify build output exists
RUN test -d dist && test -f dist/server.js || (echo "Build failed: dist/server.js not found" && exit 1)

# ============================================
# Production Stage - Minimal runtime image
# ============================================
FROM node:20-alpine

WORKDIR /app

# Enable corepack and use yarn v1 (classic) to avoid v4 migration issues
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package.json yarn.lock ./

# Install only production dependencies
# Using yarn v1 classic, --production flag works
RUN yarn install --frozen-lockfile --production && \
    yarn cache clean

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory with proper permissions
RUN mkdir -p uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/server.js"]
