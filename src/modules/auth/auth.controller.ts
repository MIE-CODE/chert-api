import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../users/user.model';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../utils/errors';
import { AuthRequest } from '../../types';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, phoneNumber, password } = req.body;

    // Check if user already exists
    const existingUserQuery: any = {
      $or: [{ email }, { username }],
    };
    if (phoneNumber) {
      existingUserQuery.$or.push({ phoneNumber });
    }

    const existingUser = await User.findOne(existingUserQuery);

    if (existingUser) {
      throw new AppError('User with this email, username, or phone number already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      username,
      email,
      phoneNumber,
      password: hashedPassword,
    });

    // Generate tokens
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          status: user.status,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Update last seen and online status
    user.lastSeen = new Date();
    user.isOnline = true;
    await user.save();

    // Generate tokens
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          status: user.status,
          isOnline: user.isOnline,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const newToken = generateToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    res.json({
      success: true,
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

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

