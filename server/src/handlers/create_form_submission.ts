
import { db } from '../db';
import { formSubmissionsTable, formsTable, tasksTable } from '../db/schema';
import { type CreateFormSubmissionInput, type FormSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export async function createFormSubmission(input: CreateFormSubmissionInput, userId: number): Promise<FormSubmission> {
  try {
    // Validate form exists
    const formExists = await db.select({ id: formsTable.id })
      .from(formsTable)
      .where(eq(formsTable.id, input.form_id))
      .limit(1)
      .execute();

    if (formExists.length === 0) {
      throw new Error(`Form with id ${input.form_id} does not exist`);
    }

    // If task_id is provided, validate task exists
    if (input.task_id) {
      const taskExists = await db.select({ id: tasksTable.id })
        .from(tasksTable)
        .where(eq(tasksTable.id, input.task_id))
        .limit(1)
        .execute();

      if (taskExists.length === 0) {
        throw new Error(`Task with id ${input.task_id} does not exist`);
      }
    }

    // Create form submission
    const result = await db.insert(formSubmissionsTable)
      .values({
        form_id: input.form_id,
        task_id: input.task_id,
        submitted_by: userId,
        submission_data: JSON.stringify(input.submission_data)
      })
      .returning()
      .execute();

    // Update associated task status to completed if task_id is provided
    if (input.task_id) {
      await db.update(tasksTable)
        .set({ 
          status: 'completed',
          updated_at: new Date()
        })
        .where(eq(tasksTable.id, input.task_id))
        .execute();
    }

    return result[0];
  } catch (error) {
    console.error('Form submission creation failed:', error);
    throw error;
  }
}
