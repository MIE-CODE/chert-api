import { Response, NextFunction } from 'express';
import User from './user.model';
import { AuthRequest } from '../../types';
import { AppError } from '../../utils/errors';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          status: user.status,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { username, phoneNumber, status, avatar } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null; // Allow clearing phone number
    if (status !== undefined) updateData.status = status;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Check if username is already taken
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        throw new AppError('Username already taken', 409);
      }
    }

    // Check if phone number is already taken
    if (phoneNumber) {
      const existingUser = await User.findOne({ phoneNumber, _id: { $ne: userId } });
      if (existingUser) {
        throw new AppError('Phone number already taken', 409);
      }
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          status: user.status,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          status: user.status,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { q } = req.query;
    const currentUserId = req.user?.id;

    if (!q || typeof q !== 'string') {
      throw new AppError('Search query is required', 400);
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
            { phoneNumber: { $regex: q, $options: 'i' } },
          ],
        },
      ],
    })
      .select('-password')
      .limit(20);

    res.json({
      success: true,
      data: {
        users: users.map((user) => ({
          id: user._id,
          username: user.username,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          status: user.status,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

