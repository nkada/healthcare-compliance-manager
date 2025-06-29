import { initTRPC, TRPCError } from '@trpc/server';
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
  analyticsFilterSchema,
  loginInputSchema
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
import { loginUser } from './handlers/login_user';

// Create context type
interface Context {
  user: {
    id: number;
    email: string;
    role: 'admin' | 'standard_user';
  } | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Protected procedure that requires authentication
const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }
  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is guaranteed to be non-null here
    },
  });
});

// Admin-only procedure
const adminProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return opts.next();
});

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // User management routes
  createUser: adminProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: adminProcedure
    .query(() => getUsers()),

  updateUser: adminProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Form management routes
  createForm: protectedProcedure
    .input(createFormInputSchema)
    .mutation(({ input, ctx }) => createForm(input, ctx.user.id)),

  getForms: protectedProcedure
    .query(() => getForms()),

  getFormById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getFormById(input.id)),

  updateForm: protectedProcedure
    .input(updateFormInputSchema)
    .mutation(({ input }) => updateForm(input)),

  // Task management routes
  createTask: adminProcedure
    .input(createTaskInputSchema)
    .mutation(({ input, ctx }) => createTask(input, ctx.user.id)),

  getTasksByUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getTasksByUser(input.userId)),

  getAllTasks: adminProcedure
    .query(() => getAllTasks()),

  updateTaskStatus: protectedProcedure
    .input(updateTaskStatusInputSchema)
    .mutation(({ input }) => updateTaskStatus(input)),

  // Form submission routes
  createFormSubmission: protectedProcedure
    .input(createFormSubmissionInputSchema)
    .mutation(({ input, ctx }) => createFormSubmission(input, ctx.user.id)),

  getFormSubmissions: protectedProcedure
    .input(z.object({ formId: z.number().optional() }))
    .query(({ input }) => getFormSubmissions(input.formId)),

  // Analytics routes
  getFormAnalytics: protectedProcedure
    .input(z.object({ 
      formId: z.number(),
      filter: analyticsFilterSchema.optional()
    }))
    .query(({ input }) => getFormAnalytics(input.formId, input.filter)),

  getOrganizationAnalytics: adminProcedure
    .input(z.object({ filter: analyticsFilterSchema.optional() }))
    .query(({ input }) => getOrganizationAnalytics(input.filter)),
});

export type AppRouter = typeof appRouter;

// Create context function
const createContext = async (opts: { req: any; res: any }): Promise<Context> => {
  const { req } = opts;
  
  // Extract token from Authorization header
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null };
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  try {
    // Decode the simple base64 token (NOT secure for production!)
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Basic validation
    if (!decoded.id || !decoded.email || !decoded.role || !decoded.timestamp) {
      return { user: null };
    }
    
    // Check if token is not too old (24 hours)
    const tokenAge = Date.now() - decoded.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (tokenAge > maxAge) {
      return { user: null };
    }
    
    return {
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      }
    };
  } catch (error) {
    // Invalid token
    return { user: null };
  }
};

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext,
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();