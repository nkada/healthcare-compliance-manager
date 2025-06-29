
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable, formFieldsTable } from '../db/schema';
import { getFormById } from '../handlers/get_form_by_id';

describe('getFormById', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return form with fields when form exists', async () => {
        // Create a test user first
        const userResults = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashed_password',
                first_name: 'Test',
                last_name: 'User',
                role: 'admin'
            })
            .returning()
            .execute();

        const userId = userResults[0].id;

        // Create a test form
        const formResults = await db.insert(formsTable)
            .values({
                title: 'Test Form',
                description: 'A test form',
                tags: JSON.stringify(['test', 'example']),
                created_by: userId
            })
            .returning()
            .execute();

        const formId = formResults[0].id;

        // Create test form fields with different orders
        await db.insert(formFieldsTable)
            .values([
                {
                    form_id: formId,
                    field_type: 'text_input',
                    field_label: 'First Field',
                    field_key: 'first_field',
                    is_required: true,
                    field_order: 2
                },
                {
                    form_id: formId,
                    field_type: 'number_input',
                    field_label: 'Second Field',
                    field_key: 'second_field',
                    is_required: false,
                    field_order: 1
                },
                {
                    form_id: formId,
                    field_type: 'select_dropdown',
                    field_label: 'Third Field',
                    field_key: 'third_field',
                    is_required: true,
                    field_options: JSON.stringify(['option1', 'option2']),
                    field_order: 3
                }
            ])
            .execute();

        const result = await getFormById(formId);

        // Verify form data
        expect(result).not.toBeNull();
        expect(result!.id).toEqual(formId);
        expect(result!.title).toEqual('Test Form');
        expect(result!.description).toEqual('A test form');
        expect(result!.tags).toEqual(JSON.stringify(['test', 'example']));
        expect(result!.is_active).toBe(true);
        expect(result!.created_by).toEqual(userId);
        expect(result!.created_at).toBeInstanceOf(Date);
        expect(result!.updated_at).toBeInstanceOf(Date);

        // Verify fields are included and ordered correctly
        expect(result!.fields).toHaveLength(3);
        expect(result!.fields[0].field_label).toEqual('Second Field');
        expect(result!.fields[0].field_order).toEqual(1);
        expect(result!.fields[1].field_label).toEqual('First Field');
        expect(result!.fields[1].field_order).toEqual(2);
        expect(result!.fields[2].field_label).toEqual('Third Field');
        expect(result!.fields[2].field_order).toEqual(3);

        // Verify field properties
        expect(result!.fields[0].field_type).toEqual('number_input');
        expect(result!.fields[0].is_required).toBe(false);
        expect(result!.fields[1].field_type).toEqual('text_input');
        expect(result!.fields[1].is_required).toBe(true);
        expect(result!.fields[2].field_options).toEqual(JSON.stringify(['option1', 'option2']));
    });

    it('should return null when form does not exist', async () => {
        const result = await getFormById(999);
        expect(result).toBeNull();
    });

    it('should return form with empty fields array when form has no fields', async () => {
        // Create a test user first
        const userResults = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashed_password',
                first_name: 'Test',
                last_name: 'User',
                role: 'admin'
            })
            .returning()
            .execute();

        const userId = userResults[0].id;

        // Create a form without fields
        const formResults = await db.insert(formsTable)
            .values({
                title: 'Empty Form',
                description: null,
                tags: null,
                created_by: userId
            })
            .returning()
            .execute();

        const formId = formResults[0].id;

        const result = await getFormById(formId);

        expect(result).not.toBeNull();
        expect(result!.title).toEqual('Empty Form');
        expect(result!.description).toBeNull();
        expect(result!.tags).toBeNull();
        expect(result!.fields).toHaveLength(0);
    });

    it('should handle forms with single field correctly', async () => {
        // Create a test user first
        const userResults = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashed_password',
                first_name: 'Test',
                last_name: 'User',
                role: 'admin'
            })
            .returning()
            .execute();

        const userId = userResults[0].id;

        // Create a form with single field
        const formResults = await db.insert(formsTable)
            .values({
                title: 'Single Field Form',
                description: 'Form with one field',
                created_by: userId
            })
            .returning()
            .execute();

        const formId = formResults[0].id;

        await db.insert(formFieldsTable)
            .values({
                form_id: formId,
                field_type: 'text_area',
                field_label: 'Comment Field',
                field_key: 'comment',
                is_required: false,
                field_order: 1
            })
            .execute();

        const result = await getFormById(formId);

        expect(result).not.toBeNull();
        expect(result!.fields).toHaveLength(1);
        expect(result!.fields[0].field_label).toEqual('Comment Field');
        expect(result!.fields[0].field_type).toEqual('text_area');
        expect(result!.fields[0].field_key).toEqual('comment');
    });
});
