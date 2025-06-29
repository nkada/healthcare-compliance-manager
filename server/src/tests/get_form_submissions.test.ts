
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable, formSubmissionsTable } from '../db/schema';
import { getFormSubmissions } from '../handlers/get_form_submissions';
import type { FormSubmissionWithDetails } from '../schema';

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
  tags: JSON.stringify(['test', 'form']),
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
    expect(result[0].submission_data).toEqual({ field1: 'value1', field2: 'value2' }); // Now parsed
    expect(result[0].id).toBeDefined();
    expect(result[0].submitted_at).toBeInstanceOf(Date);
    
    // Verify submittedByUser is populated
    expect(result[0].submittedByUser).toBeDefined();
    expect(result[0].submittedByUser.id).toEqual(user.id);
    expect(result[0].submittedByUser.first_name).toEqual('Test');
    expect(result[0].submittedByUser.last_name).toEqual('User');
    expect(result[0].submittedByUser.email).toEqual('test@example.com');
    
    // Verify formDetails is populated
    expect(result[0].formDetails).toBeDefined();
    expect(result[0].formDetails.id).toEqual(form1.id);
    expect(result[0].formDetails.title).toEqual('Test Form');
    expect(result[0].formDetails.tags).toEqual(['test', 'form']); // Now parsed array
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
    result.forEach((submission: FormSubmissionWithDetails) => {
      expect(submission.form_id).toEqual(form1.id);
      expect(submission.submitted_by).toEqual(user.id);
      expect(submission.id).toBeDefined();
      expect(submission.submitted_at).toBeInstanceOf(Date);
      expect(submission.submittedByUser).toBeDefined();
      expect(submission.formDetails).toBeDefined();
      expect(typeof submission.submission_data).toBe('object'); // Parsed from JSON
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
    expect(result[0].submittedByUser).toBeDefined();
    expect(result[0].formDetails).toBeDefined();
    expect(typeof result[0].submission_data).toBe('object'); // Parsed from JSON
  });

  it('should order results by submitted_at in descending order', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [form] = await db.insert(formsTable).values({
      ...testForm,
      created_by: user.id
    }).returning().execute();
    
    // Create multiple submissions with different timestamps
    const submission1 = await db.insert(formSubmissionsTable).values({
      ...testSubmission1,
      form_id: form.id,
      submitted_by: user.id
    }).returning().execute();
    
    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const submission2 = await db.insert(formSubmissionsTable).values({
      ...testSubmission2,
      form_id: form.id,
      submitted_by: user.id
    }).returning().execute();

    const result = await getFormSubmissions(form.id);

    expect(result).toHaveLength(2);
    // Most recent should be first
    expect(result[0].submitted_at.getTime()).toBeGreaterThanOrEqual(result[1].submitted_at.getTime());
  });

  it('should handle forms with null tags', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [form] = await db.insert(formsTable).values({
      ...testForm,
      tags: null, // Test null tags
      created_by: user.id
    }).returning().execute();
    
    await db.insert(formSubmissionsTable).values({
      ...testSubmission1,
      form_id: form.id,
      submitted_by: user.id
    }).execute();

    const result = await getFormSubmissions(form.id);

    expect(result).toHaveLength(1);
    expect(result[0].formDetails.tags).toEqual([]); // Should be empty array
  });
});
