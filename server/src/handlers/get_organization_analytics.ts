
import { db } from '../db';
import { formsTable, tasksTable, usersTable } from '../db/schema';
import { type OrganizationAnalytics, type AnalyticsFilter } from '../schema';
import { count, and, eq, gte, lte, type SQL } from 'drizzle-orm';

export async function getOrganizationAnalytics(filter?: AnalyticsFilter): Promise<OrganizationAnalytics> {
  try {
    // Build base conditions array for filtering forms
    const formConditions: SQL<unknown>[] = [];
    
    if (filter?.date_from) {
      formConditions.push(gte(formsTable.created_at, filter.date_from));
    }
    
    if (filter?.date_to) {
      formConditions.push(lte(formsTable.created_at, filter.date_to));
    }

    // Get total forms count
    const formsResult = await (formConditions.length > 0
      ? db.select({ count: count() }).from(formsTable).where(and(...formConditions))
      : db.select({ count: count() }).from(formsTable)
    ).execute();
    const totalForms = formsResult[0].count;

    // Build task conditions
    const taskConditions: SQL<unknown>[] = [];
    
    if (filter?.date_from) {
      taskConditions.push(gte(tasksTable.created_at, filter.date_from));
    }
    
    if (filter?.date_to) {
      taskConditions.push(lte(tasksTable.created_at, filter.date_to));
    }

    if (filter?.user_id) {
      taskConditions.push(eq(tasksTable.assigned_to, filter.user_id));
    }

    // Get total tasks count
    const tasksResult = await (taskConditions.length > 0
      ? db.select({ count: count() }).from(tasksTable).where(and(...taskConditions))
      : db.select({ count: count() }).from(tasksTable)
    ).execute();
    const totalTasks = tasksResult[0].count;

    // Get completed tasks count
    const completedTaskConditions = [...taskConditions, eq(tasksTable.status, 'completed')];
    const completedTasksResult = await (completedTaskConditions.length > 0
      ? db.select({ count: count() }).from(tasksTable).where(and(...completedTaskConditions))
      : db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, 'completed'))
    ).execute();
    const completedTasks = completedTasksResult[0].count;

    // Get overdue tasks count
    const overdueTaskConditions = [...taskConditions, eq(tasksTable.status, 'overdue')];
    const overdueTasksResult = await (overdueTaskConditions.length > 0
      ? db.select({ count: count() }).from(tasksTable).where(and(...overdueTaskConditions))
      : db.select({ count: count() }).from(tasksTable).where(eq(tasksTable.status, 'overdue'))
    ).execute();
    const overdueTasks = overdueTasksResult[0].count;

    // Calculate completion rate
    const overallCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Get active users count
    const activeUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.is_active, true))
      .execute();
    const activeUsers = activeUsersResult[0].count;

    return {
      total_forms: totalForms,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      overdue_tasks: overdueTasks,
      overall_completion_rate: Math.round(overallCompletionRate * 100) / 100, // Round to 2 decimal places
      active_users: activeUsers
    };
  } catch (error) {
    console.error('Organization analytics calculation failed:', error);
    throw error;
  }
}
