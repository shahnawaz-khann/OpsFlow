import { z } from 'zod';

export const createWorkItemSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description is required')
    .max(5000, 'Description cannot exceed 5000 characters'),
  teamId: z.string({ required_error: 'Team is required' }).uuid('Invalid team ID format'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().uuid('Invalid assignee ID format').nullable().optional(),
  requiresApproval: z.boolean().default(false),
});

export const updateWorkItemSchema = z
  .object({
    version: z.number({ required_error: 'Version number is required for concurrency protection' }).int().positive(),
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120).optional(),
    description: z.string().trim().min(1, 'Description is required').max(5000).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  })
  .strict(); // Rejects forbidden fields like teamId, createdById, id

export const assignWorkItemSchema = z.object({
  assigneeId: z.string().uuid('Invalid assignee ID format').nullable(),
  version: z.number().int().positive().optional(),
  note: z.string().trim().max(500).optional(),
});

export const transitionWorkItemSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED'], {
    required_error: 'Status is required',
  }),
  version: z.number({ required_error: 'Version is required' }).int().positive(),
  note: z.string().trim().max(500).optional(),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED'], { required_error: 'Decision must be APPROVED or REJECTED' }),
  note: z.string().trim().max(1000).optional(),
});

export const listWorkItemsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  teamId: z.string().uuid().optional(),
  assigneeId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z.enum(['updatedAt', 'createdAt', 'priority', 'status', 'referenceNumber']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const commentSchema = z.object({
  comment: z
    .string({ required_error: 'Comment is required' })
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment cannot exceed 2000 characters'),
});

export const createTeamSchema = z.object({
  name: z
    .string({ required_error: 'Team name is required' })
    .trim()
    .min(2, 'Team name must be at least 2 characters')
    .max(60, 'Team name cannot exceed 60 characters'),
  description: z.string().trim().max(300, 'Description cannot exceed 300 characters').optional().nullable(),
});

export const updateTeamSchema = z.object({
  name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(60).optional(),
  description: z.string().trim().max(300).optional().nullable(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string({ required_error: 'User ID is required' }).uuid('Invalid user ID format'),
  role: z.enum(['ADMIN', 'LEAD', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export const updateTeamMemberSchema = z.object({
  role: z.enum(['ADMIN', 'LEAD', 'MEMBER', 'VIEWER'], { required_error: 'Role is required' }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const devLoginSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

