import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).optional(),
    phoneNumber: z.string().regex(/^[0-9]{10,11}$/, 'Invalid phone number (10-11 digits)').optional().or(z.literal('')),
    status: z.string().max(100).optional(),
    avatar: z.string().url().optional().or(z.literal('')),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
  }),
});

