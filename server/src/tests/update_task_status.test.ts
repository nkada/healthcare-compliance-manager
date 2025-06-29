
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable, tasksTable } from '../db/schema';
import { type UpdateTaskStatusInput } from '../schema';
import { updateTaskStatus } from '../handlers/update_task_status';
import { eq } from 'drizzle-orm';

describe('updateTaskStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let formId: number;
  let taskId: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'standard_user'
      })
      .returning()
      .execute();
    userId = users[0].id;

    // Create test form
    const forms = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'Test form for task testing',
        created_by: userId
      })
      .returning()
      .execute();
    formId = forms[0].id;

    // Create test task
    const tasks = await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: userId,
        title: 'Test Task',
        due_date: new Date('2024-01-15'),
        status: 'pending',
        recurrence_type: 'none',
        recurrence_interval: null
      })
      .returning()
      .execute();
    taskId = tasks[0].id;
  });

  it('should update task status successfully', async () => {
    const input: UpdateTaskStatusInput = {
      id: taskId,
      status: 'completed'
    };

    const result = await updateTaskStatus(input);

    expect(result.id).toEqual(taskId);
    expect(result.status).toEqual('completed');
    expect(result.title).toEqual('Test Task');
    expect(result.form_id).toEqual(formId);
    expect(result.assigned_to).toEqual(userId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated status to database', async () => {
    const input: UpdateTaskStatusInput = {
      id: taskId,
      status: 'in_progress'
    };

    await updateTaskStatus(input);

    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toEqual('in_progress');
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent task', async () => {
    const input: UpdateTaskStatusInput = {
      id: 99999,
      status: 'completed'
    };

    expect(updateTaskStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should create next recurring task when completing daily recurring task', async () => {
    // Create daily recurring task
    const recurringTasks = await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: userId,
        title: 'Daily Task',
        due_date: new Date('2024-01-15'),
        status: 'pending',
        recurrence_type: 'daily',
        recurrence_interval: 2 // Every 2 days
      })
      .returning()
      .execute();
    
    const recurringTaskId = recurringTasks[0].id;

    const input: UpdateTaskStatusInput = {
      id: recurringTaskId,
      status: 'completed'
    };

    await updateTaskStatus(input);

    // Check that a new task was created
    const allTasks = await db.select()
      .from(tasksTable)
      .execute();

    // Should have original task + new recurring task (plus the initial test task)
    expect(allTasks.length).toEqual(3);

    // Find the new recurring task
    const newRecurringTask = allTasks.find(task => 
      task.id !== taskId && task.id !== recurringTaskId
    );

    expect(newRecurringTask).toBeDefined();
    expect(newRecurringTask!.title).toEqual('Daily Task');
    expect(newRecurringTask!.status).toEqual('pending');
    expect(newRecurringTask!.recurrence_type).toEqual('daily');
    expect(newRecurringTask!.recurrence_interval).toEqual(2);
    
    // Due date should be 2 days after original
    const expectedDueDate = new Date('2024-01-17');
    expect(newRecurringTask!.due_date.getTime()).toEqual(expectedDueDate.getTime());
  });

  it('should create next recurring task when completing weekly recurring task', async () => {
    // Create weekly recurring task
    const recurringTasks = await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: userId,
        title: 'Weekly Task',
        due_date: new Date('2024-01-15'),
        status: 'pending',
        recurrence_type: 'weekly',
        recurrence_interval: 1 // Every week
      })
      .returning()
      .execute();
    
    const recurringTaskId = recurringTasks[0].id;

    const input: UpdateTaskStatusInput = {
      id: recurringTaskId,
      status: 'completed'
    };

    await updateTaskStatus(input);

    // Find the new recurring task
    const allTasks = await db.select()
      .from(tasksTable)
      .execute();

    const newRecurringTask = allTasks.find(task => 
      task.id !== taskId && task.id !== recurringTaskId
    );

    expect(newRecurringTask).toBeDefined();
    
    // Due date should be 7 days after original
    const expectedDueDate = new Date('2024-01-22');
    expect(newRecurringTask!.due_date.getTime()).toEqual(expectedDueDate.getTime());
  });

  it('should create next recurring task when completing monthly recurring task', async () => {
    // Create monthly recurring task
    const recurringTasks = await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: userId,
        title: 'Monthly Task',
        due_date: new Date('2024-01-15'),
        status: 'pending',
        recurrence_type: 'monthly',
        recurrence_interval: 1 // Every month
      })
      .returning()
      .execute();
    
    const recurringTaskId = recurringTasks[0].id;

    const input: UpdateTaskStatusInput = {
      id: recurringTaskId,
      status: 'completed'
    };

    await updateTaskStatus(input);

    // Find the new recurring task
    const allTasks = await db.select()
      .from(tasksTable)
      .execute();

    const newRecurringTask = allTasks.find(task => 
      task.id !== taskId && task.id !== recurringTaskId
    );

    expect(newRecurringTask).toBeDefined();
    
    // Due date should be 1 month after original
    const expectedDueDate = new Date('2024-02-15');
    expect(newRecurringTask!.due_date.getTime()).toEqual(expectedDueDate.getTime());
  });

  it('should not create recurring task when completing non-recurring task', async () => {
    const input: UpdateTaskStatusInput = {
      id: taskId,
      status: 'completed'
    };

    await updateTaskStatus(input);

    // Should only have the original task (no new recurring task created)
    const allTasks = await db.select()
      .from(tasksTable)
      .execute();

    expect(allTasks.length).toEqual(1);
    expect(allTasks[0].id).toEqual(taskId);
    expect(allTasks[0].status).toEqual('completed');
  });

  it('should not create recurring task when status is not completed', async () => {
    // Create daily recurring task
    const recurringTasks = await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: userId,
        title: 'Daily Task',
        due_date: new Date('2024-01-15'),
        status: 'pending',
        recurrence_type: 'daily',
        recurrence_interval: 1
      })
      .returning()
      .execute();
    
    const recurringTaskId = recurringTasks[0].id;

    const input: UpdateTaskStatusInput = {
      id: recurringTaskId,
      status: 'in_progress'
    };

    await updateTaskStatus(input);

    // Should not create new task since status is not 'completed'
    const allTasks = await db.select()
      .from(tasksTable)
      .execute();

    expect(allTasks.length).toEqual(2); // Original test task + recurring task
  });
});
