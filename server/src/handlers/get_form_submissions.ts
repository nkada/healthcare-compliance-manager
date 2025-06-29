
import { db } from '../db';
import { formSubmissionsTable } from '../db/schema';
import { type FormSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export async function getFormSubmissions(formId?: number): Promise<FormSubmission[]> {
  try {
    // Execute query directly without intermediate variable assignment
    if (formId !== undefined) {
      const results = await db.select()
        .from(formSubmissionsTable)
        .where(eq(formSubmissionsTable.form_id, formId))
        .execute();
      return results;
    } else {
      const results = await db.select()
        .from(formSubmissionsTable)
        .execute();
      return results;
    }
  } catch (error) {
    console.error('Failed to fetch form submissions:', error);
    throw error;
  }
}
