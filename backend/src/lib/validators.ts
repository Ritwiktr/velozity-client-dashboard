import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER"]),
});

export const createClientSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  company: z.string().max(120).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(1).max(2000),
  clientId: z.string().uuid(),
});

export const createTaskSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().min(1).max(4000),
  assignedToId: z.string().uuid().nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  dueDate: z.string().datetime(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(2).max(160).optional(),
    description: z.string().min(1).max(4000).optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    dueDate: z.string().datetime().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });

export const taskFilterSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
  projectId: z.string().uuid().optional(),
  overdue: z.enum(["true", "false"]).optional(),
});
