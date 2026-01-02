import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).optional(),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number in E.164 format').optional().or(z.literal('')),
    status: z.string().max(100).optional(),
    avatar: z.string().url().optional().or(z.literal('')),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
  }),
});

