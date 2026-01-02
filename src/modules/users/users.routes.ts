import { Router } from 'express';
import * as usersController from './users.controller';
import { validate } from '../../middlewares/validation.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import * as usersValidation from './users.validation';

const router = Router();

router.get('/me', authMiddleware, usersController.getProfile);
router.put('/me', authMiddleware, validate(usersValidation.updateProfileSchema), usersController.updateProfile);
router.get('/search', authMiddleware, validate(usersValidation.searchUsersSchema), usersController.searchUsers);
router.get('/:id', authMiddleware, usersController.getUserById);

export default router;

