
import { db } from '../db';
import { tasksTable, usersTable, formsTable } from '../db/schema';
import { type Task } from '../schema';
import { eq, lt, and } from 'drizzle-orm';

export async function getAllTasks(): Promise<Task[]> {
  try {
    // First, update overdue tasks
    const now = new Date();
    await db.update(tasksTable)
      .set({ 
        status: 'overdue',
        updated_at: now
      })
      .where(
        and(
          lt(tasksTable.due_date, now),
          eq(tasksTable.status, 'pending')
        )
      )
      .execute();

    // Fetch all tasks with user and form information
    const results = await db.select()
      .from(tasksTable)
      .innerJoin(usersTable, eq(tasksTable.assigned_to, usersTable.id))
      .innerJoin(formsTable, eq(tasksTable.form_id, formsTable.id))
      .execute();

    // Transform results to match Task schema
    return results.map(result => ({
      id: result.tasks.id,
      form_id: result.tasks.form_id,
      assigned_to: result.tasks.assigned_to,
      assigned_by: result.tasks.assigned_by,
      title: result.tasks.title,
      due_date: result.tasks.due_date,
      status: result.tasks.status,
      recurrence_type: result.tasks.recurrence_type,
      recurrence_interval: result.tasks.recurrence_interval,
      next_due_date: result.tasks.next_due_date,
      created_at: result.tasks.created_at,
      updated_at: result.tasks.updated_at
    }));
  } catch (error) {
    console.error('Failed to get all tasks:', error);
    throw error;
  }
}
