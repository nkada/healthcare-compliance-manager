
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable, tasksTable } from '../db/schema';
import { getAllTasks } from '../handlers/get_all_tasks';
import { eq, and } from 'drizzle-orm';

describe('getAllTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getAllTasks();
    expect(result).toEqual([]);
  });

  it('should return all tasks with correct structure', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'standard_user'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create test form
    const formResult = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'A test form',
        created_by: adminId
      })
      .returning()
      .execute();
    const formId = formResult[0].id;

    // Create test task
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: adminId,
        title: 'Test Task',
        due_date: futureDate,
        status: 'pending',
        recurrence_type: 'none'
      })
      .execute();

    const result = await getAllTasks();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Test Task');
    expect(result[0].form_id).toEqual(formId);
    expect(result[0].assigned_to).toEqual(userId);
    expect(result[0].assigned_by).toEqual(adminId);
    expect(result[0].status).toEqual('pending');
    expect(result[0].recurrence_type).toEqual('none');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update overdue tasks status', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'standard_user'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create test form
    const formResult = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'A test form',
        created_by: adminId
      })
      .returning()
      .execute();
    const formId = formResult[0].id;

    // Create overdue task (due date in the past)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: adminId,
        title: 'Overdue Task',
        due_date: pastDate,
        status: 'pending',
        recurrence_type: 'none'
      })
      .execute();

    const result = await getAllTasks();

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('overdue');
    expect(result[0].title).toEqual('Overdue Task');

    // Verify the database was actually updated
    const dbTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result[0].id))
      .execute();

    expect(dbTasks[0].status).toEqual('overdue');
  });

  it('should handle multiple tasks with different statuses', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'standard_user'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create test form
    const formResult = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'A test form',
        created_by: adminId
      })
      .returning()
      .execute();
    const formId = formResult[0].id;

    // Create future task (pending)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: adminId,
        title: 'Future Task',
        due_date: futureDate,
        status: 'pending',
        recurrence_type: 'none'
      })
      .execute();

    // Create overdue task
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: adminId,
        title: 'Past Task',
        due_date: pastDate,
        status: 'pending',
        recurrence_type: 'none'
      })
      .execute();

    // Create completed task
    await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: adminId,
        title: 'Completed Task',
        due_date: pastDate,
        status: 'completed',
        recurrence_type: 'none'
      })
      .execute();

    const result = await getAllTasks();

    expect(result).toHaveLength(3);

    const futureTask = result.find(t => t.title === 'Future Task');
    const pastTask = result.find(t => t.title === 'Past Task');
    const completedTask = result.find(t => t.title === 'Completed Task');

    expect(futureTask?.status).toEqual('pending');
    expect(pastTask?.status).toEqual('overdue'); // Should be updated
    expect(completedTask?.status).toEqual('completed'); // Should remain completed
  });

  it('should not update already overdue tasks', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'standard_user'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create test form
    const formResult = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'A test form',
        created_by: adminId
      })
      .returning()
      .execute();
    const formId = formResult[0].id;

    // Create task that's already overdue
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const originalUpdatedAt = new Date();
    originalUpdatedAt.setHours(originalUpdatedAt.getHours() - 2);

    const taskResult = await db.insert(tasksTable)
      .values({
        form_id: formId,
        assigned_to: userId,
        assigned_by: adminId,
        title: 'Already Overdue Task',
        due_date: pastDate,
        status: 'overdue',
        recurrence_type: 'none',
        updated_at: originalUpdatedAt
      })
      .returning()
      .execute();

    await getAllTasks();

    // Check that the updated_at wasn't changed
    const dbTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskResult[0].id))
      .execute();

    expect(dbTask[0].status).toEqual('overdue');
    expect(dbTask[0].updated_at.getTime()).toEqual(originalUpdatedAt.getTime());
  });
});
