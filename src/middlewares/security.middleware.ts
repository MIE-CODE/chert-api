import { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
// import rateLimit from 'express-rate-limit'; // Disabled - no rate limiting

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

  // Rate limiting disabled - no request limits
  // Rate limiting can be re-enabled if needed for production security
};

