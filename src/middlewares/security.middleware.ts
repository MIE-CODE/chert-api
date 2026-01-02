import { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

export const setupSecurity = (app: Express): void => {
  // Helmet for security headers
  app.use(helmet());

  // CORS configuration - allow all origins
  const corsOptions = {
    origin: (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow all origins
      callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
  app.use(cors(corsOptions));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', limiter);

  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);
};

