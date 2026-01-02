import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  phoneNumber?: string;
  password: string;
  avatar?: string;
  status?: string;
  lastSeen?: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
      trim: true,
      default: undefined,
      validate: {
        validator: function(v: string | undefined | null) {
          // Allow undefined/null/empty, but if provided, must match format
          if (!v || v.trim() === '') return true;
          return /^[0-9]{10,11}$/.test(v);
        },
        message: 'Invalid phone number (10-11 digits)',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: '',
      maxlength: [100, 'Status cannot exceed 100 characters'],
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes are automatically created by unique: true on email and username fields
// No need for explicit index() calls

export default mongoose.model<IUser>('User', userSchema);

