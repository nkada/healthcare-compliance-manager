
import { db } from '../db';
import { formsTable, usersTable } from '../db/schema';
import { type Form } from '../schema';
import { eq } from 'drizzle-orm';

export async function getForms(): Promise<Form[]> {
  try {
    // Get all active forms with creator information
    const results = await db.select()
      .from(formsTable)
      .innerJoin(usersTable, eq(formsTable.created_by, usersTable.id))
      .where(eq(formsTable.is_active, true))
      .execute();

    // Transform results to Form type
    return results.map(result => ({
      id: result.forms.id,
      title: result.forms.title,
      description: result.forms.description,
      tags: result.forms.tags,
      is_active: result.forms.is_active,
      created_by: result.forms.created_by,
      created_at: result.forms.created_at,
      updated_at: result.forms.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch forms:', error);
    throw error;
  }
}
