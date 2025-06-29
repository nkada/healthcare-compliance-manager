
import { serial, text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'standard_user']);
export const fieldTypeEnum = pgEnum('field_type', ['text_input', 'number_input', 'text_area', 'checkbox', 'radio_button', 'select_dropdown', 'date_picker']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'overdue']);
export const recurrenceTypeEnum = pgEnum('recurrence_type', ['none', 'daily', 'weekly', 'monthly']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Forms table
export const formsTable = pgTable('forms', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  tags: text('tags'), // JSON array string
  is_active: boolean('is_active').notNull().default(true),
  created_by: integer('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Form fields table
export const formFieldsTable = pgTable('form_fields', {
  id: serial('id').primaryKey(),
  form_id: integer('form_id').notNull(),
  field_type: fieldTypeEnum('field_type').notNull(),
  field_label: text('field_label').notNull(),
  field_key: text('field_key').notNull(),
  is_required: boolean('is_required').notNull().default(false),
  field_options: text('field_options'), // JSON string for radio/select options
  field_order: integer('field_order').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Tasks table
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  form_id: integer('form_id').notNull(),
  assigned_to: integer('assigned_to').notNull(),
  assigned_by: integer('assigned_by').notNull(),
  title: text('title').notNull(),
  due_date: timestamp('due_date').notNull(),
  status: taskStatusEnum('status').notNull().default('pending'),
  recurrence_type: recurrenceTypeEnum('recurrence_type').notNull().default('none'),
  recurrence_interval: integer('recurrence_interval'),
  next_due_date: timestamp('next_due_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Form submissions table
export const formSubmissionsTable = pgTable('form_submissions', {
  id: serial('id').primaryKey(),
  form_id: integer('form_id').notNull(),
  task_id: integer('task_id'),
  submitted_by: integer('submitted_by').notNull(),
  submission_data: text('submission_data').notNull(), // JSON string of form responses
  submitted_at: timestamp('submitted_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdForms: many(formsTable),
  assignedTasks: many(tasksTable, { relationName: 'assignedTasks' }),
  createdTasks: many(tasksTable, { relationName: 'createdTasks' }),
  submissions: many(formSubmissionsTable),
}));

export const formsRelations = relations(formsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [formsTable.created_by],
    references: [usersTable.id],
  }),
  fields: many(formFieldsTable),
  tasks: many(tasksTable),
  submissions: many(formSubmissionsTable),
}));

export const formFieldsRelations = relations(formFieldsTable, ({ one }) => ({
  form: one(formsTable, {
    fields: [formFieldsTable.form_id],
    references: [formsTable.id],
  }),
}));

export const tasksRelations = relations(tasksTable, ({ one, many }) => ({
  form: one(formsTable, {
    fields: [tasksTable.form_id],
    references: [formsTable.id],
  }),
  assignedUser: one(usersTable, {
    fields: [tasksTable.assigned_to],
    references: [usersTable.id],
    relationName: 'assignedTasks',
  }),
  assignedByUser: one(usersTable, {
    fields: [tasksTable.assigned_by],
    references: [usersTable.id],
    relationName: 'createdTasks',
  }),
  submissions: many(formSubmissionsTable),
}));

export const formSubmissionsRelations = relations(formSubmissionsTable, ({ one }) => ({
  form: one(formsTable, {
    fields: [formSubmissionsTable.form_id],
    references: [formsTable.id],
  }),
  task: one(tasksTable, {
    fields: [formSubmissionsTable.task_id],
    references: [tasksTable.id],
  }),
  submittedBy: one(usersTable, {
    fields: [formSubmissionsTable.submitted_by],
    references: [usersTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  forms: formsTable,
  formFields: formFieldsTable,
  tasks: tasksTable,
  formSubmissions: formSubmissionsTable,
};
