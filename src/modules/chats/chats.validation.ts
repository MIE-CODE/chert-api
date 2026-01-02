import { z } from 'zod';

export const createChatSchema = z.object({
  body: z.object({
    participantIds: z.array(z.string()).optional(),
    phoneNumbers: z.array(z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')).optional(),
    isGroup: z.boolean().optional().default(false),
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(200).optional(),
  }).refine((data) => {
    if (data.isGroup) {
      return !!data.name;
    }
    const participantCount = (data.participantIds?.length || 0) + (data.phoneNumbers?.length || 0);
    return participantCount === 1;
  }, {
    message: 'Group chat requires name, one-to-one chat requires exactly one participant (by ID or phone number)',
  }),
});

export const updateChatSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(200).optional(),
    avatar: z.string().url().optional().or(z.literal('')),
  }),
});

export const addParticipantsSchema = z.object({
  body: z.object({
    participantIds: z.array(z.string()).optional(),
    phoneNumbers: z.array(z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')).optional(),
  }).refine((data) => {
    const participantCount = (data.participantIds?.length || 0) + (data.phoneNumbers?.length || 0);
    return participantCount >= 1;
  }, {
    message: 'At least one participant is required (by ID or phone number)',
  }),
});

export const startChatSchema = z.object({
  body: z.object({
    participantId: z.string().optional(),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  }).refine((data) => {
    return !!(data.participantId || data.phoneNumber);
  }, {
    message: 'Either participantId or phoneNumber is required',
  }),
});

