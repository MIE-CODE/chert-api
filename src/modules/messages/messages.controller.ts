import { Response, NextFunction } from 'express';
import Message from './message.model';
import Chat from '../chats/chat.model';
import { AuthRequest } from '../../types';
import { AppError } from '../../utils/errors';
import { MessageStatus, MessageType } from '../../types';

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { chatId, content, type, fileUrl, fileName, fileSize, replyTo } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      throw new AppError('Chat not found or access denied', 404);
    }

    // Validate content for text messages
    if (type === MessageType.TEXT && !content) {
      throw new AppError('Content is required for text messages', 400);
    }

    // Validate file for file/image messages
    if ((type === MessageType.IMAGE || type === MessageType.FILE) && !fileUrl) {
      throw new AppError('File URL is required for file/image messages', 400);
    }

    const message = await Message.create({
      chatId,
      senderId: userId,
      content: content || '',
      type: type || MessageType.TEXT,
      status: MessageStatus.SENT,
      fileUrl,
      fileName,
      fileSize,
      replyTo,
    });

    // Update chat's last message
    chat.lastMessage = message._id;
    await chat.save();

    await message.populate('senderId', 'username avatar');
    await message.populate('replyTo');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      throw new AppError('Chat not found or access denied', 404);
    }

    const messages = await Message.find({ chatId })
      .populate('senderId', 'username avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Message.countDocuments({ chatId });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMessageById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const message = await Message.findById(id).populate('senderId', 'username avatar').populate('replyTo');

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: message.chatId,
      participants: userId,
    });

    if (!chat) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { content } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const message = await Message.findById(id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Only sender can update
    if (message.senderId.toString() !== userId) {
      throw new AppError('Only sender can update message', 403);
    }

    // Only text messages can be updated
    if (message.type !== MessageType.TEXT) {
      throw new AppError('Only text messages can be updated', 400);
    }

    message.content = content;
    await message.save();

    await message.populate('senderId', 'username avatar');
    await message.populate('replyTo');

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const message = await Message.findById(id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: message.chatId,
      participants: userId,
    });

    if (!chat) {
      throw new AppError('Access denied', 403);
    }

    // Only sender can delete (or admin in group chats)
    if (message.senderId.toString() !== userId && chat.admin?.toString() !== userId) {
      throw new AppError('Only sender or admin can delete message', 403);
    }

    await Message.findByIdAndDelete(id);

    // Update chat's last message if needed
    if (chat.lastMessage?.toString() === id) {
      const lastMessage = await Message.findOne({ chatId: message.chatId })
        .sort({ createdAt: -1 });
      chat.lastMessage = lastMessage?._id;
      await chat.save();
    }

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      throw new AppError('Chat not found or access denied', 404);
    }

    // Mark all unread messages in this chat as read
    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: userId },
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
        $set: { status: MessageStatus.READ },
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const searchMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { q } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    if (!q || typeof q !== 'string') {
      throw new AppError('Search query is required', 400);
    }

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId,
    });

    if (!chat) {
      throw new AppError('Chat not found or access denied', 404);
    }

    const messages = await Message.find({
      chatId,
      content: { $regex: q, $options: 'i' },
    })
      .populate('senderId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: {
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addReaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { emoji } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    if (!emoji) {
      throw new AppError('Emoji is required', 400);
    }

    const message = await Message.findById(id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: message.chatId,
      participants: userId,
    });

    if (!chat) {
      throw new AppError('Access denied', 403);
    }

    // Remove existing reaction from this user, then add new one
    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId
    );
    message.reactions.push({ userId: userId as any, emoji });
    await message.save();

    await message.populate('senderId', 'username avatar');
    await message.populate('reactions.userId', 'username avatar');

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

export const removeReaction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const message = await Message.findById(id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Verify user is participant in chat
    const chat = await Chat.findOne({
      _id: message.chatId,
      participants: userId,
    });

    if (!chat) {
      throw new AppError('Access denied', 403);
    }

    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId
    );
    await message.save();

    await message.populate('senderId', 'username avatar');
    await message.populate('reactions.userId', 'username avatar');

    res.json({
      success: true,
      message: 'Reaction removed successfully',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

