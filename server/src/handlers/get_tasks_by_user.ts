
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Task } from '../schema';

export const getTasksByUser = async (userId: number): Promise<Task[]> => {
  try {
    const results = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.assigned_to, userId))
      .execute();

    return results.map(task => ({
      ...task,
      due_date: task.due_date,
      next_due_date: task.next_due_date,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));
  } catch (error) {
    console.error('Failed to get tasks by user:', error);
    throw error;
  }
};
