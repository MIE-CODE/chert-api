# Docker Setup Guide

## Building the Image

```bash
docker build -t chert-api .
```

## Running with Docker Compose

```bash
docker-compose up -d
```

## Running Standalone

```bash
docker run -d \
  --name chert-api \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://localhost:27017/chert \
  -e JWT_SECRET=your-secret-key \
  -e JWT_REFRESH_SECRET=your-refresh-secret-key \
  -v $(pwd)/uploads:/app/uploads \
  chert-api
```

## Environment Variables

Required:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens

Optional:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: production)
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port (default: 6379)
- `CORS_ORIGIN` - CORS origin (default: *)

## Health Check

The container includes a health check endpoint at `/health`. Docker will automatically monitor this.

## Security Features

- Runs as non-root user (nodejs:nodejs)
- Minimal Alpine Linux base image
- Only production dependencies in final image
- Multi-stage build for smaller image size

