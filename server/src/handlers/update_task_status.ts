
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskStatusInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTaskStatus = async (input: UpdateTaskStatusInput): Promise<Task> => {
  try {
    // First, get the current task to check if it exists and get recurrence info
    const existingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (existingTasks.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    const existingTask = existingTasks[0];

    // Update the task status and updated_at timestamp
    const updatedTasks = await db.update(tasksTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    const updatedTask = updatedTasks[0];

    // If task is completed and has recurrence, create next recurring task
    if (input.status === 'completed' && 
        existingTask.recurrence_type !== 'none' && 
        existingTask.recurrence_interval) {
      
      // Calculate next due date based on recurrence type and interval
      const nextDueDate = new Date(existingTask.due_date);
      
      switch (existingTask.recurrence_type) {
        case 'daily':
          nextDueDate.setDate(nextDueDate.getDate() + existingTask.recurrence_interval);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + (existingTask.recurrence_interval * 7));
          break;
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + existingTask.recurrence_interval);
          break;
      }

      // Create the next recurring task
      await db.insert(tasksTable)
        .values({
          form_id: existingTask.form_id,
          assigned_to: existingTask.assigned_to,
          assigned_by: existingTask.assigned_by,
          title: existingTask.title,
          due_date: nextDueDate,
          status: 'pending',
          recurrence_type: existingTask.recurrence_type,
          recurrence_interval: existingTask.recurrence_interval,
          next_due_date: null
        })
        .execute();
    }

    return updatedTask;
  } catch (error) {
    console.error('Task status update failed:', error);
    throw error;
  }
};
