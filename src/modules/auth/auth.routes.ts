import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middlewares/validation.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import * as authValidation from './auth.validation';

const router = Router();

router.post('/signup', validate(authValidation.signupSchema), authController.signup);
router.post('/login', validate(authValidation.loginSchema), authController.login);
router.post('/refresh-token', validate(authValidation.refreshTokenSchema), authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);

export default router;

