
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable, tasksTable, formSubmissionsTable } from '../db/schema';
import { type CreateFormSubmissionInput } from '../schema';
import { createFormSubmission } from '../handlers/create_form_submission';
import { eq } from 'drizzle-orm';

describe('createFormSubmission', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let formId: number;
  let taskId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'standard_user'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test form
    const formResult = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'A test form',
        created_by: userId
      })
      .returning()
      .execute();
    formId = formResult[0].id;

    // Create test task
    const taskResult = await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: userId,
        title: 'Test Task',
        due_date: new Date()
      })
      .returning()
      .execute();
    taskId = taskResult[0].id;
  });

  const testInput: CreateFormSubmissionInput = {
    form_id: 0, // Will be set in tests
    task_id: null,
    submission_data: {
      name: 'John Doe',
      email: 'john@example.com',
      rating: 5
    }
  };

  it('should create a form submission without task', async () => {
    const input = { ...testInput, form_id: formId };
    const result = await createFormSubmission(input, userId);

    expect(result.form_id).toEqual(formId);
    expect(result.task_id).toBeNull();
    expect(result.submitted_by).toEqual(userId);
    expect(result.submission_data).toEqual(JSON.stringify(input.submission_data));
    expect(result.id).toBeDefined();
    expect(result.submitted_at).toBeInstanceOf(Date);
  });

  it('should create a form submission with task and update task status', async () => {
    const input = { ...testInput, form_id: formId, task_id: taskId };
    const result = await createFormSubmission(input, userId);

    expect(result.form_id).toEqual(formId);
    expect(result.task_id).toEqual(taskId);
    expect(result.submitted_by).toEqual(userId);
    expect(result.submission_data).toEqual(JSON.stringify(input.submission_data));

    // Check that task status was updated to completed
    const updatedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(updatedTask[0].status).toEqual('completed');
    expect(updatedTask[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save submission to database', async () => {
    const input = { ...testInput, form_id: formId };
    const result = await createFormSubmission(input, userId);

    const submissions = await db.select()
      .from(formSubmissionsTable)
      .where(eq(formSubmissionsTable.id, result.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].form_id).toEqual(formId);
    expect(submissions[0].submitted_by).toEqual(userId);
    expect(submissions[0].submission_data).toEqual(JSON.stringify(input.submission_data));
  });

  it('should throw error for non-existent form', async () => {
    const input = { ...testInput, form_id: 99999 };

    await expect(createFormSubmission(input, userId)).rejects.toThrow(/Form with id 99999 does not exist/i);
  });

  it('should throw error for non-existent task', async () => {
    const input = { ...testInput, form_id: formId, task_id: 99999 };

    await expect(createFormSubmission(input, userId)).rejects.toThrow(/Task with id 99999 does not exist/i);
  });

  it('should handle complex submission data', async () => {
    const complexData = {
      personal_info: {
        name: 'Jane Smith',
        age: 30
      },
      preferences: ['option1', 'option2'],
      notes: 'This is a test submission with complex data'
    };

    const input = { ...testInput, form_id: formId, submission_data: complexData };
    const result = await createFormSubmission(input, userId);

    expect(result.submission_data).toEqual(JSON.stringify(complexData));

    // Verify we can parse it back
    const parsedData = JSON.parse(result.submission_data);
    expect(parsedData.personal_info.name).toEqual('Jane Smith');
    expect(parsedData.preferences).toHaveLength(2);
  });
});
