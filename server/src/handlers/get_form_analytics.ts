
import { db } from '../db';
import { formsTable, formSubmissionsTable, tasksTable } from '../db/schema';
import { type FormAnalytics, type AnalyticsFilter } from '../schema';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getFormAnalytics(formId: number, filter?: AnalyticsFilter): Promise<FormAnalytics> {
  try {
    // Get form details
    const form = await db.select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .execute();

    if (form.length === 0) {
      throw new Error(`Form with id ${formId} not found`);
    }

    const formData = form[0];

    // Parse tags from JSON string
    let tags: string[] = [];
    if (formData.tags) {
      try {
        tags = JSON.parse(formData.tags);
      } catch {
        tags = [];
      }
    }

    // Filter by tags if provided
    if (filter?.tags && filter.tags.length > 0) {
      const hasMatchingTag = filter.tags.some(filterTag => tags.includes(filterTag));
      if (!hasMatchingTag) {
        return {
          form_id: formId,
          form_title: formData.title,
          total_submissions: 0,
          completion_rate: 0,
          average_completion_time: null,
          tags: tags
        };
      }
    }

    // Build conditions for submissions query
    const submissionConditions: SQL<unknown>[] = [eq(formSubmissionsTable.form_id, formId)];

    if (filter?.date_from) {
      submissionConditions.push(gte(formSubmissionsTable.submitted_at, filter.date_from));
    }

    if (filter?.date_to) {
      submissionConditions.push(lte(formSubmissionsTable.submitted_at, filter.date_to));
    }

    if (filter?.user_id) {
      submissionConditions.push(eq(formSubmissionsTable.submitted_by, filter.user_id));
    }

    // Get total submissions count
    const submissionsQuery = db.select({ count: count() })
      .from(formSubmissionsTable)
      .where(submissionConditions.length === 1 ? submissionConditions[0] : and(...submissionConditions));

    const submissionsResult = await submissionsQuery.execute();
    const totalSubmissions = submissionsResult[0].count;

    // Get total tasks count for completion rate calculation
    const taskConditions: SQL<unknown>[] = [eq(tasksTable.form_id, formId)];

    if (filter?.date_from) {
      taskConditions.push(gte(tasksTable.created_at, filter.date_from));
    }

    if (filter?.date_to) {
      taskConditions.push(lte(tasksTable.created_at, filter.date_to));
    }

    if (filter?.user_id) {
      taskConditions.push(eq(tasksTable.assigned_to, filter.user_id));
    }

    const tasksQuery = db.select({ count: count() })
      .from(tasksTable)
      .where(taskConditions.length === 1 ? taskConditions[0] : and(...taskConditions));

    const tasksResult = await tasksQuery.execute();
    const totalTasks = tasksResult[0].count;

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? (totalSubmissions / totalTasks) * 100 : 0;

    // Calculate average completion time (simplified - using task creation to submission time)
    let averageCompletionTime: number | null = null;

    if (totalSubmissions > 0) {
      const completionTimeQuery = db.select({
        avgTime: sql<string>`AVG(EXTRACT(EPOCH FROM (${formSubmissionsTable.submitted_at} - ${tasksTable.created_at})))`
      })
      .from(formSubmissionsTable)
      .innerJoin(tasksTable, eq(formSubmissionsTable.task_id, tasksTable.id))
      .where(
        and(
          eq(formSubmissionsTable.form_id, formId),
          ...(submissionConditions.length > 1 ? submissionConditions.slice(1) : [])
        )
      );

      const completionTimeResult = await completionTimeQuery.execute();
      const avgTimeString = completionTimeResult[0]?.avgTime;
      
      if (avgTimeString && avgTimeString !== null) {
        averageCompletionTime = parseFloat(avgTimeString);
      }
    }

    return {
      form_id: formId,
      form_title: formData.title,
      total_submissions: totalSubmissions,
      completion_rate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
      average_completion_time: averageCompletionTime,
      tags: tags
    };
  } catch (error) {
    console.error('Form analytics calculation failed:', error);
    throw error;
  }
}
