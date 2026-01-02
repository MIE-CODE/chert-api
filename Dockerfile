FROM node:20-alpine AS builder

WORKDIR /app

# Install yarn
RUN corepack enable && corepack prepare yarn@stable --activate

# Copy package files
COPY package.json yarn.lock ./
COPY tsconfig.json ./

# Install dependencies (allow lockfile updates in builder stage)
RUN yarn install

# Copy source code
COPY src ./src

# Build TypeScript
RUN yarn build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install yarn
RUN corepack enable && corepack prepare yarn@stable --activate

# Copy package.json from build context
COPY package.json ./

# Copy updated yarn.lock from builder stage (where it was updated)
COPY --from=builder /app/yarn.lock ./

# Install only production dependencies
RUN NODE_ENV=production yarn install --immutable

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]

