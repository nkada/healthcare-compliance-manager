
import { db } from '../db';
import { formsTable, formFieldsTable } from '../db/schema';
import { type Form, type FormField } from '../schema';
import { eq, asc } from 'drizzle-orm';

export interface FormWithFields extends Form {
    fields: FormField[];
}

export async function getFormById(id: number): Promise<FormWithFields | null> {
    try {
        // Get the form data
        const formResults = await db.select()
            .from(formsTable)
            .where(eq(formsTable.id, id))
            .execute();

        if (formResults.length === 0) {
            return null;
        }

        const form = formResults[0];

        // Get the form fields ordered by field_order
        const fieldResults = await db.select()
            .from(formFieldsTable)
            .where(eq(formFieldsTable.form_id, id))
            .orderBy(asc(formFieldsTable.field_order))
            .execute();

        return {
            ...form,
            fields: fieldResults
        };
    } catch (error) {
        console.error('Failed to get form by ID:', error);
        throw error;
    }
}
