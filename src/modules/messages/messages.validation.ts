import { z } from 'zod';
import { MessageType } from '../../types';

export const sendMessageSchema = z.object({
  body: z.object({
    chatId: z.string().min(1, 'Chat ID is required'),
    content: z.string().optional(),
    type: z.nativeEnum(MessageType).optional().default(MessageType.TEXT),
    fileUrl: z.string().url().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().positive().optional(),
    replyTo: z.string().optional(),
  }).refine((data) => {
    if (data.type === MessageType.TEXT) {
      return !!data.content;
    }
    if (data.type === MessageType.IMAGE || data.type === MessageType.FILE) {
      return !!data.fileUrl;
    }
    return true;
  }, {
    message: 'Content is required for text messages, fileUrl is required for file/image messages',
  }),
});

export const updateMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Content is required'),
  }),
});

export const searchMessagesSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
  }),
});

export const addReactionSchema = z.object({
  body: z.object({
    emoji: z.string().min(1, 'Emoji is required'),
  }),
});

