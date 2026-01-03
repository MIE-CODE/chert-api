import { Response, NextFunction } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import Chat from './chat.model';
import Message from '../messages/message.model';
import User from '../users/user.model';
import { AuthRequest } from '../../types';
import { AppError } from '../../utils/errors';
import { MessageStatus, MessageType } from '../../types';

// Helper function to resolve phone numbers to user IDs
const resolvePhoneNumbersToUserIds = async (phoneNumbers: string[]): Promise<string[]> => {
  if (!phoneNumbers || phoneNumbers.length === 0) {
    return [];
  }

  const users = await User.find({ phoneNumber: { $in: phoneNumbers } }).select('_id phoneNumber');
  
  if (users.length !== phoneNumbers.length) {
    const foundPhoneNumbers = users.map(u => u.phoneNumber).filter(Boolean);
    const missingPhoneNumbers = phoneNumbers.filter(phone => !foundPhoneNumbers.includes(phone));
    throw new AppError(`Users not found for phone numbers: ${missingPhoneNumbers.join(', ')}`, 404);
  }

  return users.map(user => user._id.toString());
};

// Helper function to format chat response - filter out current user from participants in one-to-one chats
const formatChatResponse = (chat: any, currentUserId: string) => {
  const chatObj = chat.toObject ? chat.toObject() : { ...chat };
  
  // For one-to-one chats, only show the other participant (not the current user)
  if (!chatObj.isGroup && chatObj.participants && Array.isArray(chatObj.participants)) {
    chatObj.participants = chatObj.participants.filter(
      (participant: any) => {
        // Handle both populated objects and plain IDs
        const participantId = participant._id?.toString() || 
                              participant.toString() || 
                              (typeof participant === 'string' ? participant : null);
        return participantId && participantId !== currentUserId;
      }
    );
  }
  
  return chatObj;
};

// Helper function to send notification message when a new chat is created
const sendChatNotification = async (
  chatId: string,
  senderId: string,
  recipientId: string,
  io?: SocketIOServer
): Promise<void> => {
  try {
    // Get sender info
    const sender = await User.findById(senderId).select('username avatar');
    if (!sender) return;

    // Create a welcome message
    const message = await Message.create({
      chatId,
      senderId,
      content: `${sender.username} started a conversation with you`,
      type: MessageType.TEXT,
      status: MessageStatus.SENT,
    });

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    // Populate message
    await message.populate('senderId', 'username avatar');

    // Emit message to the recipient via Socket.IO if available
    if (io) {
      // Emit to the chat room (both users will receive it if they're in the room)
      io.to(`chat:${chatId}`).emit('new_message', {
        message,
      });

      // Also try to emit directly to recipient's socket if they're online
      // This ensures immediate notification even if they haven't joined the chat room yet
      const sockets = await io.fetchSockets();
      for (const socket of sockets) {
        const socketUser = (socket as any).data?.user as { id?: string } | undefined;
        if (socketUser?.id === recipientId) {
          // Emit new chat notification to the recipient
          socket.emit('new_chat', {
            chatId,
            message,
            sender: {
              id: sender._id,
              username: sender.username,
              avatar: sender.avatar,
            },
          });
          break; // Found the recipient, no need to continue
        }
      }
    }
  } catch (error) {
    // Silently fail - notification is not critical
    console.error('Error sending chat notification:', error);
  }
};

export const createChat = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { participantIds, phoneNumbers, isGroup, name, description } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Resolve phone numbers to user IDs
    const phoneNumberUserIds = phoneNumbers ? await resolvePhoneNumbersToUserIds(phoneNumbers) : [];
    
    // Combine participant IDs from both sources
    const allParticipantIds = [
      ...(participantIds || []),
      ...phoneNumberUserIds,
    ];

    if (isGroup) {
      // Create group chat
      if (!name) {
        throw new AppError('Group name is required', 400);
      }

      const participants = [userId, ...allParticipantIds];
      const uniqueParticipants = [...new Set(participants.map((id) => id.toString()))];

      if (uniqueParticipants.length < 2) {
        throw new AppError('Group chat must have at least 2 participants', 400);
      }

      const chat = await Chat.create({
        isGroup: true,
        name,
        description,
        participants: uniqueParticipants,
        admin: userId,
      });

      await chat.populate('participants', 'username avatar isOnline phoneNumber');
      await chat.populate('admin', 'username avatar phoneNumber');

      const formattedChat = formatChatResponse(chat, userId);

      res.status(201).json({
        success: true,
        message: 'Group chat created successfully',
        data: { chat: formattedChat },
      });
    } else {
      // Create one-to-one chat
      if (allParticipantIds.length !== 1) {
        throw new AppError('One-to-one chat requires exactly one participant', 400);
      }

      const otherUserId = allParticipantIds[0];

      // Check if chat already exists
      const existingChat = await Chat.findOne({
        isGroup: false,
        participants: { $all: [userId, otherUserId], $size: 2 },
      });

      if (existingChat) {
        await existingChat.populate('participants', 'username avatar isOnline phoneNumber');
        const formattedChat = formatChatResponse(existingChat, userId);
        res.json({
          success: true,
          message: 'Chat already exists',
          data: { chat: formattedChat },
        });
        return;
      }

      const chat = await Chat.create({
        isGroup: false,
        participants: [userId, otherUserId],
      });

      await chat.populate('participants', 'username avatar isOnline phoneNumber');

      const formattedChat = formatChatResponse(chat, userId);

      // Send notification message to the second user
      const io = req.app.get('io') as SocketIOServer | undefined;
      await sendChatNotification(chat._id.toString(), userId, otherUserId, io);

      res.status(201).json({
        success: true,
        message: 'Chat created successfully',
        data: { chat: formattedChat },
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const chats = await Chat.find({
      participants: userId,
    })
      .populate('participants', 'username avatar isOnline phoneNumber')
      .populate('admin', 'username avatar phoneNumber')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    // Format chats - filter out current user from one-to-one chat participants
    const formattedChats = chats.map(chat => formatChatResponse(chat, userId));

    res.json({
      success: true,
      data: { chats: formattedChats },
    });
  } catch (error) {
    next(error);
  }
};

export const getChatById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const chat = await Chat.findOne({
      _id: id,
      participants: userId,
    })
      .populate('participants', 'username avatar isOnline phoneNumber')
      .populate('admin', 'username avatar phoneNumber')
      .populate('lastMessage');

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    const formattedChat = formatChatResponse(chat, userId);

    res.json({
      success: true,
      data: { chat: formattedChat },
    });
  } catch (error) {
    next(error);
  }
};

export const updateChat = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, description, avatar } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const chat = await Chat.findOne({
      _id: id,
      participants: userId,
      isGroup: true,
    });

    if (!chat) {
      throw new AppError('Group chat not found', 404);
    }

    // Check if user is admin
    if (chat.admin?.toString() !== userId) {
      throw new AppError('Only admin can update group chat', 403);
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedChat = await Chat.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('participants', 'username avatar isOnline phoneNumber')
      .populate('admin', 'username avatar phoneNumber');

    const formattedChat = formatChatResponse(updatedChat, userId);

    res.json({
      success: true,
      message: 'Chat updated successfully',
      data: { chat: formattedChat },
    });
  } catch (error) {
    next(error);
  }
};

export const addParticipants = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { participantIds, phoneNumbers } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Resolve phone numbers to user IDs
    const phoneNumberUserIds = phoneNumbers ? await resolvePhoneNumbersToUserIds(phoneNumbers) : [];
    
    // Combine participant IDs from both sources
    const allParticipantIds = [
      ...(participantIds || []),
      ...phoneNumberUserIds,
    ];

    if (allParticipantIds.length === 0) {
      throw new AppError('At least one participant is required (by ID or phone number)', 400);
    }

    const chat = await Chat.findOne({
      _id: id,
      participants: userId,
      isGroup: true,
    });

    if (!chat) {
      throw new AppError('Group chat not found', 404);
    }

    // Check if user is admin
    if (chat.admin?.toString() !== userId) {
      throw new AppError('Only admin can add participants', 403);
    }

    // Add new participants (avoid duplicates)
    const existingParticipants = chat.participants.map((p) => p.toString());
    const newParticipants = allParticipantIds.filter((id) => !existingParticipants.includes(id.toString()));

    if (newParticipants.length === 0) {
      throw new AppError('All users are already participants', 400);
    }

    chat.participants.push(...newParticipants);
    await chat.save();

    await chat.populate('participants', 'username avatar isOnline phoneNumber');
    await chat.populate('admin', 'username avatar phoneNumber');

    const formattedChat = formatChatResponse(chat, userId);

    res.json({
      success: true,
      message: 'Participants added successfully',
      data: { chat: formattedChat },
    });
  } catch (error) {
    next(error);
  }
};

export const removeParticipant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, participantId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const chat = await Chat.findOne({
      _id: id,
      participants: userId,
      isGroup: true,
    });

    if (!chat) {
      throw new AppError('Group chat not found', 404);
    }

    // Check if user is admin or removing themselves
    if (chat.admin?.toString() !== userId && participantId !== userId) {
      throw new AppError('Only admin can remove other participants', 403);
    }

    chat.participants = chat.participants.filter(
      (p) => p.toString() !== participantId
    );

    // If admin is removed, assign new admin or delete chat
    if (chat.admin?.toString() === participantId) {
      if (chat.participants.length > 0) {
        chat.admin = chat.participants[0];
      } else {
        await Chat.findByIdAndDelete(id);
        res.json({
          success: true,
          message: 'Chat deleted as no participants remain',
        });
        return;
      }
    }

    await chat.save();

    await chat.populate('participants', 'username avatar isOnline phoneNumber');
    await chat.populate('admin', 'username avatar phoneNumber');

    const formattedChat = formatChatResponse(chat, userId);

    res.json({
      success: true,
      message: 'Participant removed successfully',
      data: { chat: formattedChat },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChat = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const chat = await Chat.findOne({
      _id: id,
      participants: userId,
    });

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    // For group chats, only admin can delete
    if (chat.isGroup && chat.admin?.toString() !== userId) {
      throw new AppError('Only admin can delete group chat', 403);
    }

    // Delete all messages
    await Message.deleteMany({ chatId: id });

    // Delete chat
    await Chat.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const startChat = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { participantId, phoneNumber } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    // Resolve phone number to user ID if phone number is provided
    let otherUserId: string;
    
    if (phoneNumber) {
      const user = await User.findOne({ phoneNumber }).select('_id');
      if (!user) {
        throw new AppError('User not found with the provided phone number', 404);
      }
      otherUserId = user._id.toString();
    } else if (participantId) {
      otherUserId = participantId;
    } else {
      throw new AppError('Either participantId or phoneNumber is required', 400);
    }

    // Check if user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      throw new AppError('User not found', 404);
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [userId, otherUserId], $size: 2 },
    });

    if (existingChat) {
      await existingChat.populate('participants', 'username avatar isOnline phoneNumber');
      const formattedChat = formatChatResponse(existingChat, userId);
      res.json({
        success: true,
        message: 'Chat already exists',
        data: { chat: formattedChat },
      });
      return;
    }

    // Create new one-to-one chat
    const chat = await Chat.create({
      isGroup: false,
      participants: [userId, otherUserId],
    });

    await chat.populate('participants', 'username avatar isOnline phoneNumber');

    const formattedChat = formatChatResponse(chat, userId);

    // Send notification message to the second user
    const io = req.app.get('io') as SocketIOServer | undefined;
    await sendChatNotification(chat._id.toString(), userId, otherUserId, io);

    res.status(201).json({
      success: true,
      message: 'Chat started successfully',
      data: { chat: formattedChat },
    });
  } catch (error) {
    next(error);
  }
};

