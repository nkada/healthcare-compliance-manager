
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { formsTable, formFieldsTable, usersTable } from '../db/schema';
import { type CreateFormInput } from '../schema';
import { createForm } from '../handlers/create_form';
import { eq } from 'drizzle-orm';

// Test user for foreign key requirement
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'User',
  role: 'admin' as const
};

// Simple test input
const testInput: CreateFormInput = {
  title: 'Test Form',
  description: 'A form for testing',
  tags: ['test', 'form'],
  fields: [
    {
      field_type: 'text_input',
      field_label: 'Name',
      field_key: 'name',
      is_required: true,
      field_order: 1
    },
    {
      field_type: 'select_dropdown',
      field_label: 'Category',
      field_key: 'category',
      is_required: false,
      field_options: ['Option A', 'Option B', 'Option C'],
      field_order: 2
    }
  ]
};

describe('createForm', () => {
  let userId: number;

  beforeEach(async () => {
    await createDB();
    // Create test user first for foreign key requirement
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a form with basic fields', async () => {
    const result = await createForm(testInput, userId);

    // Basic field validation
    expect(result.title).toEqual('Test Form');
    expect(result.description).toEqual('A form for testing');
    expect(result.tags).toEqual('["test","form"]');
    expect(result.is_active).toBe(true);
    expect(result.created_by).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save form to database', async () => {
    const result = await createForm(testInput, userId);

    // Query form record
    const forms = await db.select()
      .from(formsTable)
      .where(eq(formsTable.id, result.id))
      .execute();

    expect(forms).toHaveLength(1);
    expect(forms[0].title).toEqual('Test Form');
    expect(forms[0].description).toEqual('A form for testing');
    expect(forms[0].tags).toEqual('["test","form"]');
    expect(forms[0].is_active).toBe(true);
    expect(forms[0].created_by).toEqual(userId);
  });

  it('should create form fields', async () => {
    const result = await createForm(testInput, userId);

    // Query form fields
    const fields = await db.select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.form_id, result.id))
      .execute();

    expect(fields).toHaveLength(2);

    const nameField = fields.find(f => f.field_key === 'name');
    expect(nameField).toBeDefined();
    expect(nameField!.field_type).toEqual('text_input');
    expect(nameField!.field_label).toEqual('Name');
    expect(nameField!.is_required).toBe(true);
    expect(nameField!.field_order).toEqual(1);
    expect(nameField!.field_options).toBeNull();

    const categoryField = fields.find(f => f.field_key === 'category');
    expect(categoryField).toBeDefined();
    expect(categoryField!.field_type).toEqual('select_dropdown');
    expect(categoryField!.field_label).toEqual('Category');
    expect(categoryField!.is_required).toBe(false);
    expect(categoryField!.field_order).toEqual(2);
    expect(categoryField!.field_options).toEqual('["Option A","Option B","Option C"]');
  });

  it('should handle form without fields', async () => {
    const inputWithoutFields: CreateFormInput = {
      title: 'Simple Form',
      description: null,
      fields: []
    };

    const result = await createForm(inputWithoutFields, userId);

    expect(result.title).toEqual('Simple Form');
    expect(result.description).toBeNull();
    expect(result.tags).toBeNull();

    // Verify no fields were created
    const fields = await db.select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.form_id, result.id))
      .execute();

    expect(fields).toHaveLength(0);
  });

  it('should handle form without tags', async () => {
    const inputWithoutTags: CreateFormInput = {
      title: 'Tagless Form',
      description: 'Form without tags',
      fields: []
    };

    const result = await createForm(inputWithoutTags, userId);

    expect(result.title).toEqual('Tagless Form');
    expect(result.tags).toBeNull();
  });
});
