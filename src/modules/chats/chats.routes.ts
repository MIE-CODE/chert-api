import { Router } from 'express';
import * as chatsController from './chats.controller';
import { validate } from '../../middlewares/validation.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import * as chatsValidation from './chats.validation';

const router = Router();

router.post('/start', authMiddleware, validate(chatsValidation.startChatSchema), chatsController.startChat);
router.post('/', authMiddleware, validate(chatsValidation.createChatSchema), chatsController.createChat);
router.get('/', authMiddleware, chatsController.getChats);
router.get('/:id', authMiddleware, chatsController.getChatById);
router.put('/:id', authMiddleware, validate(chatsValidation.updateChatSchema), chatsController.updateChat);
router.post('/:id/participants', authMiddleware, validate(chatsValidation.addParticipantsSchema), chatsController.addParticipants);
router.delete('/:id/participants/:participantId', authMiddleware, chatsController.removeParticipant);
router.delete('/:id', authMiddleware, chatsController.deleteChat);

export default router;

