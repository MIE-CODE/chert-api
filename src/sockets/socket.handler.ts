import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { verifyToken } from '../utils/jwt';
import { JWTPayload } from '../types';
import Chat from '../modules/chats/chat.model';
import Message from '../modules/messages/message.model';
import User from '../modules/users/user.model';
import { MessageStatus, MessageType } from '../types';
import logger from '../utils/logger';
import { getRedisClient } from '../config/redis';

interface SocketUser {
  userId: string;
  socketId: string;
  username: string;
}

const connectedUsers = new Map<string, SocketUser[]>();

export const initializeSocket = async (httpServer: HTTPServer): Promise<SocketIOServer> => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (_origin, callback) => {
        // Allow all origins for frontend flexibility
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Authorization', 'Content-Type'],
    },
    // Allow both websocket and polling transports for better compatibility
    transports: ['websocket', 'polling'],
    // Enable reconnection for better user experience
    allowEIO3: true, // Support Socket.IO v3 clients if needed
  });

  // Use Redis adapter if available (for scaling)
  // Only attempt if Redis client is connected
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      const { createClient } = await import('redis');
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      
      const pubClient = createClient({ 
        socket: { 
          host, 
          port,
          connectTimeout: 5000,
          reconnectStrategy: false,
        } 
      });
      const subClient = createClient({ 
        socket: { 
          host, 
          port,
          connectTimeout: 5000,
          reconnectStrategy: false,
        } 
      });
      
      await Promise.race([
        Promise.all([pubClient.connect(), subClient.connect()]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis adapter connection timeout')), 5000)
        )
      ]);
      
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('✅ Socket.IO Redis adapter enabled');
    } catch (error: any) {
      logger.info('ℹ️  Socket.IO Redis adapter not available (optional for single-instance deployments)');
    }
  } else {
    logger.info('ℹ️  Socket.IO running without Redis adapter (single-instance mode)');
  }

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token) as JWTPayload;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user as JWTPayload;
    const userId = user.id;
    const username = user.username;

    logger.info(`User connected: ${username} (${userId})`);

    // Add user to connected users
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, []);
    }
    connectedUsers.get(userId)!.push({
      userId,
      socketId: socket.id,
      username,
    });

    // Update user online status
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Get user's chats and join their rooms
    const chats = await Chat.find({ participants: userId });
    chats.forEach((chat) => {
      socket.join(`chat:${chat._id}`);
    });

    // Emit online status to all user's chats
    chats.forEach((chat) => {
      io.to(`chat:${chat._id}`).emit('user_online', {
        userId,
        username,
        chatId: chat._id,
      });
    });

    // Handle join chat
    socket.on('join_chat', async (data: { chatId: string }) => {
      try {
        const { chatId } = data;

        // Verify user is participant
        const chat = await Chat.findOne({
          _id: chatId,
          participants: userId,
        });

        if (chat) {
          socket.join(`chat:${chatId}`);
          socket.emit('joined_chat', { chatId });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle leave chat
    socket.on('leave_chat', (data: { chatId: string }) => {
      const { chatId } = data;
      socket.leave(`chat:${chatId}`);
      socket.emit('left_chat', { chatId });
    });

    // Handle send message
    socket.on('send_message', async (data: {
      chatId: string;
      content?: string;
      type?: MessageType;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      replyTo?: string;
    }) => {
      try {
        const { chatId, content, type, fileUrl, fileName, fileSize, replyTo } = data;

        // Verify user is participant
        const chat = await Chat.findOne({
          _id: chatId,
          participants: userId,
        });

        if (!chat) {
          socket.emit('error', { message: 'Chat not found or access denied' });
          return;
        }

        // Validate message
        if (type === MessageType.TEXT && !content) {
          socket.emit('error', { message: 'Content is required for text messages' });
          return;
        }

        if ((type === MessageType.IMAGE || type === MessageType.FILE) && !fileUrl) {
          socket.emit('error', { message: 'File URL is required for file/image messages' });
          return;
        }

        // Create message
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

        // Populate message
        await message.populate('senderId', 'username avatar');
        await message.populate('replyTo');

        // Ensure all participants are in the chat room before emitting
        const chatParticipants = chat.participants.map((p: any) => 
          p.toString ? p.toString() : p
        );
        
        // Get all connected sockets and add participants to the room
        const sockets = await io.fetchSockets();
        for (const socket of sockets) {
          const socketUser = (socket as any).data?.user as { id?: string } | undefined;
          if (socketUser?.id && chatParticipants.includes(socketUser.id)) {
            socket.join(`chat:${chatId}`);
          }
        }

        // Emit to all participants in the chat
        io.to(`chat:${chatId}`).emit('new_message', {
          message,
        });

        // Emit confirmation to sender
        socket.emit('message_sent', {
          messageId: message._id,
          chatId,
        });
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', async (data: { chatId: string }) => {
      const { chatId } = data;

      // Verify user is participant
      const chat = await Chat.findOne({
        _id: chatId,
        participants: userId,
      });

      if (chat) {
        socket.to(`chat:${chatId}`).emit('user_typing', {
          chatId,
          userId,
          username,
        });
      }
    });

    // Handle stop typing
    socket.on('stop_typing', (data: { chatId: string }) => {
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('user_stop_typing', {
        chatId,
        userId,
        username,
      });
    });

    // Handle read receipt
    socket.on('read_message', async (data: { chatId: string; messageIds?: string[] }) => {
      try {
        const { chatId, messageIds } = data;

        // Verify user is participant
        const chat = await Chat.findOne({
          _id: chatId,
          participants: userId,
        });

        if (!chat) {
          socket.emit('error', { message: 'Chat not found or access denied' });
          return;
        }

        if (messageIds && messageIds.length > 0) {
          // Mark specific messages as read
          await Message.updateMany(
            {
              _id: { $in: messageIds },
              chatId,
              senderId: { $ne: userId },
              readBy: { $ne: userId },
            },
            {
              $addToSet: { readBy: userId },
              $set: { status: MessageStatus.READ },
            }
          );
        } else {
          // Mark all unread messages in chat as read
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
        }

        // Notify other participants
        socket.to(`chat:${chatId}`).emit('messages_read', {
          chatId,
          userId,
          username,
        });
      } catch (error) {
        logger.error('Error marking messages as read:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle presence update
    socket.on('presence_update', (data: { status: string }) => {
      const { status } = data;
      // Broadcast presence to all user's chats
      chats.forEach((chat) => {
        io.to(`chat:${chat._id}`).emit('user_presence', {
          userId,
          username,
          status,
          chatId: chat._id,
        });
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${username} (${userId})`);

      // Remove user from connected users
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        const filtered = userSockets.filter((u) => u.socketId !== socket.id);
        if (filtered.length === 0) {
          connectedUsers.delete(userId);
          // Update user offline status
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          // Emit offline status to all user's chats
          chats.forEach((chat) => {
            io.to(`chat:${chat._id}`).emit('user_offline', {
              userId,
              username,
              chatId: chat._id,
            });
          });
        } else {
          connectedUsers.set(userId, filtered);
        }
      }
    });
  });

  return io;
};

