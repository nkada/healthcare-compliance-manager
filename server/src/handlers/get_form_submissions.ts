
import { db } from '../db';
import { formSubmissionsTable, usersTable, formsTable } from '../db/schema';
import { type FormSubmissionWithDetails } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getFormSubmissions(formId?: number): Promise<FormSubmissionWithDetails[]> {
  try {
    // Separate queries for different conditions to avoid TypeScript issues
    let results: any[];

    if (formId !== undefined) {
      results = await db.select()
        .from(formSubmissionsTable)
        .leftJoin(usersTable, eq(formSubmissionsTable.submitted_by, usersTable.id))
        .leftJoin(formsTable, eq(formSubmissionsTable.form_id, formsTable.id))
        .where(eq(formSubmissionsTable.form_id, formId))
        .orderBy(desc(formSubmissionsTable.submitted_at))
        .execute();
    } else {
      results = await db.select()
        .from(formSubmissionsTable)
        .leftJoin(usersTable, eq(formSubmissionsTable.submitted_by, usersTable.id))
        .leftJoin(formsTable, eq(formSubmissionsTable.form_id, formsTable.id))
        .orderBy(desc(formSubmissionsTable.submitted_at))
        .execute();
    }

    // Map results to FormSubmissionWithDetails format
    return results.map(result => {
      // Handle null values from left joins
      if (!result.users || !result.forms) {
        throw new Error('Missing required user or form data');
      }

      return {
        id: result.form_submissions.id,
        form_id: result.form_submissions.form_id,
        task_id: result.form_submissions.task_id,
        submitted_by: result.form_submissions.submitted_by,
        submission_data: JSON.parse(result.form_submissions.submission_data), // Parse JSON string to object
        submitted_at: result.form_submissions.submitted_at,
        submittedByUser: {
          id: result.users.id,
          email: result.users.email,
          password_hash: result.users.password_hash,
          first_name: result.users.first_name,
          last_name: result.users.last_name,
          role: result.users.role,
          is_active: result.users.is_active,
          created_at: result.users.created_at,
          updated_at: result.users.updated_at
        },
        formDetails: {
          id: result.forms.id,
          title: result.forms.title,
          description: result.forms.description,
          tags: result.forms.tags ? JSON.parse(result.forms.tags) : [], // Parse tags array
          is_active: result.forms.is_active,
          created_by: result.forms.created_by,
          created_at: result.forms.created_at,
          updated_at: result.forms.updated_at
        }
      };
    });
  } catch (error) {
    console.error('Failed to fetch form submissions:', error);
    throw error;
  }
}
