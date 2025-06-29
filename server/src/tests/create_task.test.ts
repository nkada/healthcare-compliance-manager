
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable, usersTable, formsTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

describe('createTask', () => {
  let testUserId: number;
  let testAssignedUserId: number;
  let testFormId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'admin@test.com',
          password_hash: 'hashed_password',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin'
        },
        {
          email: 'user@test.com',
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: 'User',
          role: 'standard_user'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    testAssignedUserId = users[1].id;

    // Create test form
    const forms = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'A test form',
        created_by: testUserId
      })
      .returning()
      .execute();

    testFormId = forms[0].id;
  });

  afterEach(resetDB);

  const createTestInput = (overrides: Partial<CreateTaskInput> = {}): CreateTaskInput => ({
    form_id: testFormId,
    assigned_to: testAssignedUserId,
    title: 'Test Task',
    due_date: new Date('2024-12-31T10:00:00Z'),
    recurrence_type: 'none',
    recurrence_interval: null,
    ...overrides
  });

  it('should create a task with basic fields', async () => {
    const input = createTestInput();
    const result = await createTask(input, testUserId);

    expect(result.form_id).toEqual(testFormId);
    expect(result.assigned_to).toEqual(testAssignedUserId);
    expect(result.assigned_by).toEqual(testUserId);
    expect(result.title).toEqual('Test Task');
    expect(result.due_date).toEqual(input.due_date);
    expect(result.status).toEqual('pending');
    expect(result.recurrence_type).toEqual('none');
    expect(result.recurrence_interval).toBeNull();
    expect(result.next_due_date).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save task to database', async () => {
    const input = createTestInput();
    const result = await createTask(input, testUserId);

    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].form_id).toEqual(testFormId);
    expect(tasks[0].assigned_to).toEqual(testAssignedUserId);
    expect(tasks[0].assigned_by).toEqual(testUserId);
    expect(tasks[0].status).toEqual('pending');
  });

  it('should calculate next_due_date for daily recurrence', async () => {
    const dueDate = new Date('2024-01-01T10:00:00Z');
    const input = createTestInput({
      due_date: dueDate,
      recurrence_type: 'daily',
      recurrence_interval: 3
    });

    const result = await createTask(input, testUserId);

    expect(result.next_due_date).toBeInstanceOf(Date);
    expect(result.next_due_date?.toISOString()).toEqual('2024-01-04T10:00:00.000Z');
  });

  it('should calculate next_due_date for weekly recurrence', async () => {
    const dueDate = new Date('2024-01-01T10:00:00Z');
    const input = createTestInput({
      due_date: dueDate,
      recurrence_type: 'weekly',
      recurrence_interval: 2
    });

    const result = await createTask(input, testUserId);

    expect(result.next_due_date).toBeInstanceOf(Date);
    expect(result.next_due_date?.toISOString()).toEqual('2024-01-15T10:00:00.000Z');
  });

  it('should calculate next_due_date for monthly recurrence', async () => {
    const dueDate = new Date('2024-01-01T10:00:00Z');
    const input = createTestInput({
      due_date: dueDate,
      recurrence_type: 'monthly',
      recurrence_interval: 1
    });

    const result = await createTask(input, testUserId);

    expect(result.next_due_date).toBeInstanceOf(Date);
    expect(result.next_due_date?.toISOString()).toEqual('2024-02-01T10:00:00.000Z');
  });

  it('should not set next_due_date for none recurrence', async () => {
    const input = createTestInput({
      recurrence_type: 'none',
      recurrence_interval: null
    });

    const result = await createTask(input, testUserId);

    expect(result.next_due_date).toBeNull();
  });

  it('should throw error when form does not exist', async () => {
    const input = createTestInput({
      form_id: 99999
    });

    await expect(createTask(input, testUserId)).rejects.toThrow(/Form with id 99999 not found/i);
  });

  it('should throw error when assigned user does not exist', async () => {
    const input = createTestInput({
      assigned_to: 99999
    });

    await expect(createTask(input, testUserId)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should throw error when assigning user does not exist', async () => {
    const input = createTestInput();

    await expect(createTask(input, 99999)).rejects.toThrow(/Assigning user with id 99999 not found/i);
  });
});
