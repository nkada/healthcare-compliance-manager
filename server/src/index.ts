
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createFormInputSchema,
  updateFormInputSchema,
  createTaskInputSchema,
  updateTaskStatusInputSchema,
  createFormSubmissionInputSchema,
  analyticsFilterSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createForm } from './handlers/create_form';
import { getForms } from './handlers/get_forms';
import { getFormById } from './handlers/get_form_by_id';
import { updateForm } from './handlers/update_form';
import { createTask } from './handlers/create_task';
import { getTasksByUser } from './handlers/get_tasks_by_user';
import { getAllTasks } from './handlers/get_all_tasks';
import { updateTaskStatus } from './handlers/update_task_status';
import { createFormSubmission } from './handlers/create_form_submission';
import { getFormSubmissions } from './handlers/get_form_submissions';
import { getFormAnalytics } from './handlers/get_form_analytics';
import { getOrganizationAnalytics } from './handlers/get_organization_analytics';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Form management routes
  createForm: publicProcedure
    .input(createFormInputSchema)
    .mutation(({ input }) => createForm(input, 1)), // TODO: Get user ID from auth context

  getForms: publicProcedure
    .query(() => getForms()),

  getFormById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getFormById(input.id)),

  updateForm: publicProcedure
    .input(updateFormInputSchema)
    .mutation(({ input }) => updateForm(input)),

  // Task management routes
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input, 1)), // TODO: Get user ID from auth context

  getTasksByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getTasksByUser(input.userId)),

  getAllTasks: publicProcedure
    .query(() => getAllTasks()),

  updateTaskStatus: publicProcedure
    .input(updateTaskStatusInputSchema)
    .mutation(({ input }) => updateTaskStatus(input)),

  // Form submission routes
  createFormSubmission: publicProcedure
    .input(createFormSubmissionInputSchema)
    .mutation(({ input }) => createFormSubmission(input, 1)), // TODO: Get user ID from auth context

  getFormSubmissions: publicProcedure
    .input(z.object({ formId: z.number().optional() }))
    .query(({ input }) => getFormSubmissions(input.formId)),

  // Analytics routes
  getFormAnalytics: publicProcedure
    .input(z.object({ 
      formId: z.number(),
      filter: analyticsFilterSchema.optional()
    }))
    .query(({ input }) => getFormAnalytics(input.formId, input.filter)),

  getOrganizationAnalytics: publicProcedure
    .input(z.object({ filter: analyticsFilterSchema.optional() }))
    .query(({ input }) => getOrganizationAnalytics(input.filter)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
