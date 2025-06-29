
import { z } from 'zod';

// Enums
export const userRoleEnum = z.enum(['admin', 'standard_user']);
export const fieldTypeEnum = z.enum(['text_input', 'number_input', 'text_area', 'checkbox', 'radio_button', 'select_dropdown', 'date_picker']);
export const taskStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'overdue']);
export const recurrenceTypeEnum = z.enum(['none', 'daily', 'weekly', 'monthly']);

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleEnum,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: userRoleEnum.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Form schemas
export const formFieldSchema = z.object({
  id: z.number(),
  form_id: z.number(),
  field_type: fieldTypeEnum,
  field_label: z.string(),
  field_key: z.string(),
  is_required: z.boolean(),
  field_options: z.string().nullable(), // JSON string for radio/select options
  field_order: z.number().int(),
  created_at: z.coerce.date()
});

export type FormField = z.infer<typeof formFieldSchema>;

export const formSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  tags: z.string().nullable(), // JSON array string
  is_active: z.boolean(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Form = z.infer<typeof formSchema>;

export const createFormInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  tags: z.array(z.string()).optional(),
  fields: z.array(z.object({
    field_type: fieldTypeEnum,
    field_label: z.string().min(1),
    field_key: z.string().min(1),
    is_required: z.boolean(),
    field_options: z.array(z.string()).optional(), // For radio/select options
    field_order: z.number().int()
  }))
});

export type CreateFormInput = z.infer<typeof createFormInputSchema>;

export const updateFormInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
});

export type UpdateFormInput = z.infer<typeof updateFormInputSchema>;

// Task schemas
export const taskSchema = z.object({
  id: z.number(),
  form_id: z.number(),
  assigned_to: z.number(),
  assigned_by: z.number(),
  title: z.string(),
  due_date: z.coerce.date(),
  status: taskStatusEnum,
  recurrence_type: recurrenceTypeEnum,
  recurrence_interval: z.number().int().nullable(),
  next_due_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  form_id: z.number(),
  assigned_to: z.number(),
  title: z.string().min(1),
  due_date: z.coerce.date(),
  recurrence_type: recurrenceTypeEnum,
  recurrence_interval: z.number().int().nullable()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskStatusInputSchema = z.object({
  id: z.number(),
  status: taskStatusEnum
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusInputSchema>;

// Form submission schemas
export const formSubmissionSchema = z.object({
  id: z.number(),
  form_id: z.number(),
  task_id: z.number().nullable(),
  submitted_by: z.number(),
  submission_data: z.string(), // JSON string of form responses
  submitted_at: z.coerce.date()
});

export type FormSubmission = z.infer<typeof formSubmissionSchema>;

export const createFormSubmissionInputSchema = z.object({
  form_id: z.number(),
  task_id: z.number().nullable(),
  submission_data: z.record(z.string(), z.any()) // Key-value pairs of field responses
});

export type CreateFormSubmissionInput = z.infer<typeof createFormSubmissionInputSchema>;

// Analytics schemas
export const formAnalyticsSchema = z.object({
  form_id: z.number(),
  form_title: z.string(),
  total_submissions: z.number(),
  completion_rate: z.number(),
  average_completion_time: z.number().nullable(),
  tags: z.array(z.string())
});

export type FormAnalytics = z.infer<typeof formAnalyticsSchema>;

export const organizationAnalyticsSchema = z.object({
  total_forms: z.number(),
  total_tasks: z.number(),
  completed_tasks: z.number(),
  overdue_tasks: z.number(),
  overall_completion_rate: z.number(),
  active_users: z.number()
});

export type OrganizationAnalytics = z.infer<typeof organizationAnalyticsSchema>;

export const analyticsFilterSchema = z.object({
  tags: z.array(z.string()).optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  user_id: z.number().optional()
});

export type AnalyticsFilter = z.infer<typeof analyticsFilterSchema>;
