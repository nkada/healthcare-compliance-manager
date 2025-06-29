
import { db } from '../db';
import { tasksTable, usersTable, formsTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTask(input: CreateTaskInput, assignedById: number): Promise<Task> {
  try {
    // Validate that the form exists
    const forms = await db.select()
      .from(formsTable)
      .where(eq(formsTable.id, input.form_id))
      .execute();
    
    if (forms.length === 0) {
      throw new Error(`Form with id ${input.form_id} not found`);
    }

    // Validate that the assigned user exists
    const assignedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.assigned_to))
      .execute();
    
    if (assignedUsers.length === 0) {
      throw new Error(`User with id ${input.assigned_to} not found`);
    }

    // Validate that the assigning user exists
    const assigningUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, assignedById))
      .execute();
    
    if (assigningUsers.length === 0) {
      throw new Error(`Assigning user with id ${assignedById} not found`);
    }

    // Calculate next_due_date based on recurrence settings
    let nextDueDate: Date | null = null;
    if (input.recurrence_type !== 'none' && input.recurrence_interval) {
      nextDueDate = new Date(input.due_date);
      
      switch (input.recurrence_type) {
        case 'daily':
          nextDueDate.setDate(nextDueDate.getDate() + input.recurrence_interval);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + (input.recurrence_interval * 7));
          break;
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + input.recurrence_interval);
          break;
      }
    }

    // Insert task record
    const result = await db.insert(tasksTable)
      .values({
        form_id: input.form_id,
        assigned_to: input.assigned_to,
        assigned_by: assignedById,
        title: input.title,
        due_date: input.due_date,
        status: 'pending',
        recurrence_type: input.recurrence_type,
        recurrence_interval: input.recurrence_interval,
        next_due_date: nextDueDate
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
}
