import { Router } from 'express';
import { uploadFile } from './upload.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/upload', authMiddleware, uploadFile);

export default router;

