
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable, formSubmissionsTable } from '../db/schema';
import { getFormSubmissions } from '../handlers/get_form_submissions';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  first_name: 'Test',
  last_name: 'User',
  role: 'standard_user' as const
};

const testForm = {
  title: 'Test Form',
  description: 'A test form',
  tags: null,
  created_by: 1
};

const testSubmission1 = {
  form_id: 1,
  task_id: null,
  submitted_by: 1,
  submission_data: JSON.stringify({ field1: 'value1', field2: 'value2' })
};

const testSubmission2 = {
  form_id: 1,
  task_id: null,
  submitted_by: 1,
  submission_data: JSON.stringify({ field1: 'value3', field2: 'value4' })
};

const testSubmission3 = {
  form_id: 2,
  task_id: null,
  submitted_by: 1,
  submission_data: JSON.stringify({ field1: 'value5', field2: 'value6' })
};

describe('getFormSubmissions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all form submissions when no form_id is provided', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [form1] = await db.insert(formsTable).values({
      ...testForm,
      created_by: user.id
    }).returning().execute();
    
    const [form2] = await db.insert(formsTable).values({
      ...testForm,
      title: 'Test Form 2',
      created_by: user.id
    }).returning().execute();
    
    // Create test submissions
    await db.insert(formSubmissionsTable).values([
      { ...testSubmission1, form_id: form1.id, submitted_by: user.id },
      { ...testSubmission2, form_id: form1.id, submitted_by: user.id },
      { ...testSubmission3, form_id: form2.id, submitted_by: user.id }
    ]).execute();

    const result = await getFormSubmissions();

    expect(result).toHaveLength(3);
    expect(result[0].form_id).toEqual(form1.id);
    expect(result[0].submitted_by).toEqual(user.id);
    expect(result[0].submission_data).toEqual(JSON.stringify({ field1: 'value1', field2: 'value2' }));
    expect(result[0].id).toBeDefined();
    expect(result[0].submitted_at).toBeInstanceOf(Date);
  });

  it('should return submissions for specific form when form_id is provided', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [form1] = await db.insert(formsTable).values({
      ...testForm,
      created_by: user.id
    }).returning().execute();
    
    const [form2] = await db.insert(formsTable).values({
      ...testForm,
      title: 'Test Form 2',
      created_by: user.id
    }).returning().execute();
    
    // Create test submissions
    await db.insert(formSubmissionsTable).values([
      { ...testSubmission1, form_id: form1.id, submitted_by: user.id },
      { ...testSubmission2, form_id: form1.id, submitted_by: user.id },
      { ...testSubmission3, form_id: form2.id, submitted_by: user.id }
    ]).execute();

    const result = await getFormSubmissions(form1.id);

    expect(result).toHaveLength(2);
    result.forEach(submission => {
      expect(submission.form_id).toEqual(form1.id);
      expect(submission.submitted_by).toEqual(user.id);
      expect(submission.id).toBeDefined();
      expect(submission.submitted_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when no submissions exist for form', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [form] = await db.insert(formsTable).values({
      ...testForm,
      created_by: user.id
    }).returning().execute();

    const result = await getFormSubmissions(form.id);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array when form_id does not exist', async () => {
    const result = await getFormSubmissions(999);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle task_id field correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [form] = await db.insert(formsTable).values({
      ...testForm,
      created_by: user.id
    }).returning().execute();
    
    // Create submission with task_id
    await db.insert(formSubmissionsTable).values({
      ...testSubmission1,
      form_id: form.id,
      submitted_by: user.id,
      task_id: 123
    }).execute();

    const result = await getFormSubmissions(form.id);

    expect(result).toHaveLength(1);
    expect(result[0].task_id).toEqual(123);
    expect(result[0].form_id).toEqual(form.id);
  });
});
