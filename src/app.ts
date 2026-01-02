import express, { Express } from 'express';
import dotenv from 'dotenv';
import { setupSecurity } from './middlewares/security.middleware';
import { errorHandler } from './utils/errors';
import logger from './utils/logger';
import path from 'path';
import { setupSwagger } from './config/swagger';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import chatsRoutes from './modules/chats/chats.routes';
import messagesRoutes from './modules/messages/messages.routes';
import uploadRoutes from './modules/messages/upload.routes';

const app: Express = express();

// Security middleware
setupSecurity(app);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Swagger documentation
setupSwagger(app);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Chert API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/files', uploadRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;

