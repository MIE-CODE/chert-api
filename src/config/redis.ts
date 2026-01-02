import { createClient } from 'redis';
import logger from '../utils/logger';

let redisClient: ReturnType<typeof createClient> | null = null;
let connectionAttempted = false;

export const connectRedis = async () => {
  // Skip if Redis is explicitly disabled
  if (process.env.REDIS_ENABLED === 'false') {
    logger.info('Redis is disabled via REDIS_ENABLED=false');
    return null;
  }

  // Only attempt connection once
  if (connectionAttempted) {
    return redisClient;
  }

  connectionAttempted = true;

  try {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    
    redisClient = createClient({
      socket: {
        host,
        port,
        connectTimeout: 5000, // 5 second timeout
        reconnectStrategy: false, // Don't auto-reconnect if connection fails
      },
    });
    
    // Only log errors once, not repeatedly
    let errorLogged = false;
    redisClient.on('error', (err) => {
      if (!errorLogged) {
        logger.warn('Redis connection error (Redis is optional, continuing without it):', err.message || err);
        errorLogged = true;
      }
    });
    
    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });
    
    // Attempt connection with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      )
    ]);
    
    return redisClient;
  } catch (error: any) {
    // Silently fail - Redis is optional
    logger.info('ℹ️  Redis not available, continuing without it (optional for single-instance deployments)');
    redisClient = null;
    return null;
  }
};

export const getRedisClient = () => redisClient;

export const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis disconnected');
  }
};

