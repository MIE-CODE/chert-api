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
    if (status !== undefined) updateData.status = status;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Check if username is already taken
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        throw new AppError('Username already taken', 409);
      }
    }

    // Check if phone number is already taken by another user
    if (phoneNumber !== undefined) {
      if (phoneNumber && phoneNumber.trim() !== '') {
        // Validate phone number format
        const trimmedPhoneNumber = phoneNumber.trim();
        if (!/^[0-9]{10,11}$/.test(trimmedPhoneNumber)) {
          throw new AppError('Invalid phone number format (must be 10-11 digits)', 400);
        }
        
        // Check if phone number is already taken by another user
        const existingUser = await User.findOne({ 
          phoneNumber: trimmedPhoneNumber, 
          _id: { $ne: userId } 
        });
        if (existingUser) {
          throw new AppError('Phone number is already registered to another user', 409);
        }
        updateData.phoneNumber = trimmedPhoneNumber;
      } else {
        // Allow clearing phone number
        updateData.phoneNumber = null;
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
      data: 
       users.map((user) => ({
          id: user._id,
          username: user.username,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          status: user.status,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
        })),
  
    });
  } catch (error) {
    next(error);
  }
};

