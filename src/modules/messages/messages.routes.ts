import { Router } from 'express';
import * as messagesController from './messages.controller';
import { validate } from '../../middlewares/validation.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import * as messagesValidation from './messages.validation';

const router = Router();

router.post('/', authMiddleware, validate(messagesValidation.sendMessageSchema), messagesController.sendMessage);
router.get('/chat/:chatId', authMiddleware, messagesController.getMessages);
router.get('/search/:chatId', authMiddleware, validate(messagesValidation.searchMessagesSchema), messagesController.searchMessages);
router.get('/:id', authMiddleware, messagesController.getMessageById);
router.put('/:id', authMiddleware, validate(messagesValidation.updateMessageSchema), messagesController.updateMessage);
router.delete('/:id', authMiddleware, messagesController.deleteMessage);
router.post('/:chatId/read', authMiddleware, messagesController.markAsRead);
router.post('/:id/reactions', authMiddleware, validate(messagesValidation.addReactionSchema), messagesController.addReaction);
router.delete('/:id/reactions', authMiddleware, messagesController.removeReaction);

export default router;

