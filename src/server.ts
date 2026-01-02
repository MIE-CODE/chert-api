import http from 'http';
import app from './app';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { initializeSocket } from './sockets/socket.handler';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = http.createServer(app);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis (optional)
    await connectRedis();

    // Initialize Socket.IO
    const io = await initializeSocket(httpServer);
    app.set('io', io);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Chert API server running on port ${PORT}`);
      logger.info(`📡 Socket.IO server initialized`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

startServer();

