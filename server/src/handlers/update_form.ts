
import { db } from '../db';
import { formsTable } from '../db/schema';
import { type UpdateFormInput, type Form } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateForm(input: UpdateFormInput): Promise<Form> {
  try {
    // Check if form exists
    const existingForm = await db.select()
      .from(formsTable)
      .where(eq(formsTable.id, input.id))
      .execute();

    if (existingForm.length === 0) {
      throw new Error('Form not found');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.tags !== undefined) {
      updateData.tags = (input.tags && input.tags.length > 0) ? JSON.stringify(input.tags) : null;
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Update the form
    const result = await db.update(formsTable)
      .set(updateData)
      .where(eq(formsTable.id, input.id))
      .returning()
      .execute();

    const updatedForm = result[0];

    // Parse tags back to array for return type
    return {
      ...updatedForm,
      tags: updatedForm.tags ? updatedForm.tags : null
    };
  } catch (error) {
    console.error('Form update failed:', error);
    throw error;
  }
}
