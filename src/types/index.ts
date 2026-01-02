import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export interface JWTPayload extends JwtPayload {
  id: string;
  email: string;
  username: string;
}

export interface SocketUser {
  userId: string;
  socketId: string;
  lastSeen?: Date;
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
}

export interface TypingData {
  chatId: string;
  userId: string;
  username: string;
}

