
import { db } from '../db';
import { formsTable, formFieldsTable } from '../db/schema';
import { type CreateFormInput, type Form } from '../schema';

export async function createForm(input: CreateFormInput, userId: number): Promise<Form> {
  try {
    // Start a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Insert form record
      const formResult = await tx.insert(formsTable)
        .values({
          title: input.title,
          description: input.description,
          tags: input.tags ? JSON.stringify(input.tags) : null,
          is_active: true,
          created_by: userId
        })
        .returning()
        .execute();

      const form = formResult[0];

      // Insert form fields if provided
      if (input.fields && input.fields.length > 0) {
        await tx.insert(formFieldsTable)
          .values(
            input.fields.map(field => ({
              form_id: form.id,
              field_type: field.field_type,
              field_label: field.field_label,
              field_key: field.field_key,
              is_required: field.is_required,
              field_options: field.field_options ? JSON.stringify(field.field_options) : null,
              field_order: field.field_order
            }))
          )
          .execute();
      }

      return form;
    });

    return result;
  } catch (error) {
    console.error('Form creation failed:', error);
    throw error;
  }
}
