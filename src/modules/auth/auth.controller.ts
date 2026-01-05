import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../users/user.model';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../utils/errors';
import { AuthRequest } from '../../types';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, phoneNumber, password } = req.body;

    // Trim and validate phoneNumber if provided
    const trimmedPhoneNumber = phoneNumber && typeof phoneNumber === 'string' 
      ? phoneNumber.trim() 
      : undefined;

    // Validate phone number format if provided
    if (trimmedPhoneNumber && trimmedPhoneNumber !== '') {
      if (!/^[0-9]{10,11}$/.test(trimmedPhoneNumber)) {
        throw new AppError('Invalid phone number format (must be 10-11 digits)', 400);
      }
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      throw new AppError('User with this email already exists', 409);
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      throw new AppError('Username already taken', 409);
    }

    // Check if phone number already exists (only if provided)
    if (trimmedPhoneNumber && trimmedPhoneNumber !== '') {
      const existingPhoneNumber = await User.findOne({ phoneNumber: trimmedPhoneNumber });
      if (existingPhoneNumber) {
        throw new AppError('Phone number is already registered to another user', 409);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Prepare user data
    const userData: any = {
      username,
      email,
      password: hashedPassword,
    };

    // Add phoneNumber to userData if provided and valid
    if (trimmedPhoneNumber && trimmedPhoneNumber !== '') {
      userData.phoneNumber = trimmedPhoneNumber;
    }

    // Create user - phoneNumber will be stored if provided
    const user = await User.create(userData);

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

