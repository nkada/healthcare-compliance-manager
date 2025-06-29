
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { formsTable, usersTable } from '../db/schema';
import { type UpdateFormInput } from '../schema';
import { updateForm } from '../handlers/update_form';
import { eq } from 'drizzle-orm';

describe('updateForm', () => {
  let testUserId: number;
  let testFormId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test form
    const formResult = await db.insert(formsTable)
      .values({
        title: 'Original Form',
        description: 'Original description',
        tags: JSON.stringify(['tag1', 'tag2']),
        is_active: true,
        created_by: testUserId
      })
      .returning()
      .execute();
    testFormId = formResult[0].id;
  });

  afterEach(resetDB);

  it('should update form title', async () => {
    const input: UpdateFormInput = {
      id: testFormId,
      title: 'Updated Form Title'
    };

    const result = await updateForm(input);

    expect(result.id).toEqual(testFormId);
    expect(result.title).toEqual('Updated Form Title');
    expect(result.description).toEqual('Original description');
    expect(result.tags).toEqual('["tag1","tag2"]');
    expect(result.is_active).toBe(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update form description', async () => {
    const input: UpdateFormInput = {
      id: testFormId,
      description: 'Updated description'
    };

    const result = await updateForm(input);

    expect(result.title).toEqual('Original Form');
    expect(result.description).toEqual('Updated description');
  });

  it('should update form tags', async () => {
    const input: UpdateFormInput = {
      id: testFormId,
      tags: ['new_tag1', 'new_tag2', 'new_tag3']
    };

    const result = await updateForm(input);

    expect(result.tags).toEqual('["new_tag1","new_tag2","new_tag3"]');
  });

  it('should set tags to null when empty array provided', async () => {
    const input: UpdateFormInput = {
      id: testFormId,
      tags: []
    };

    const result = await updateForm(input);

    expect(result.tags).toBeNull();
  });

  it('should update is_active status', async () => {
    const input: UpdateFormInput = {
      id: testFormId,
      is_active: false
    };

    const result = await updateForm(input);

    expect(result.is_active).toBe(false);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateFormInput = {
      id: testFormId,
      title: 'Multi-Update Form',
      description: 'Multi-update description',
      tags: ['multi', 'update'],
      is_active: false
    };

    const result = await updateForm(input);

    expect(result.title).toEqual('Multi-Update Form');
    expect(result.description).toEqual('Multi-update description');
    expect(result.tags).toEqual('["multi","update"]');
    expect(result.is_active).toBe(false);
  });

  it('should save changes to database', async () => {
    const input: UpdateFormInput = {
      id: testFormId,
      title: 'Database Update Test',
      description: 'Testing database save'
    };

    await updateForm(input);

    const forms = await db.select()
      .from(formsTable)
      .where(eq(formsTable.id, testFormId))
      .execute();

    expect(forms).toHaveLength(1);
    expect(forms[0].title).toEqual('Database Update Test');
    expect(forms[0].description).toEqual('Testing database save');
    expect(forms[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when form does not exist', async () => {
    const input: UpdateFormInput = {
      id: 9999,
      title: 'Non-existent Form'
    };

    expect(updateForm(input)).rejects.toThrow(/form not found/i);
  });

  it('should update updated_at timestamp', async () => {
    const originalForm = await db.select()
      .from(formsTable)
      .where(eq(formsTable.id, testFormId))
      .execute();

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateFormInput = {
      id: testFormId,
      title: 'Timestamp Test'
    };

    const result = await updateForm(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalForm[0].updated_at.getTime());
  });
});
