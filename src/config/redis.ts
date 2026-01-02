import { createClient } from 'redis';
import logger from '../utils/logger';

let redisClient: ReturnType<typeof createClient> | null = null;

export const connectRedis = async () => {
  try {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    
    redisClient = createClient({
      socket: {
        host,
        port,
      },
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });
    
    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });
    
    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    logger.warn('Redis connection failed, continuing without Redis:', error);
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

