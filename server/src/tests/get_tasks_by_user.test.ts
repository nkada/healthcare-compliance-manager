
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable, tasksTable } from '../db/schema';
import { getTasksByUser } from '../handlers/get_tasks_by_user';

describe('getTasksByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return tasks assigned to a specific user', async () => {
    // Create test users
    const [assignedUser, assigningUser] = await db.insert(usersTable)
      .values([
        {
          email: 'assigned@test.com',
          password_hash: 'hash123',
          first_name: 'John',
          last_name: 'Doe',
          role: 'standard_user'
        },
        {
          email: 'assigning@test.com',
          password_hash: 'hash456',
          first_name: 'Jane',
          last_name: 'Smith',
          role: 'admin'
        }
      ])
      .returning()
      .execute();

    // Create test form
    const [form] = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'A test form',
        created_by: assigningUser.id
      })
      .returning()
      .execute();

    // Create test tasks
    await db.insert(tasksTable)
      .values([
        {
          form_id: form.id,
          assigned_to: assignedUser.id,
          assigned_by: assigningUser.id,
          title: 'Task 1',
          due_date: new Date('2024-01-15'),
          status: 'pending',
          recurrence_type: 'none'
        },
        {
          form_id: form.id,
          assigned_to: assignedUser.id,
          assigned_by: assigningUser.id,
          title: 'Task 2',
          due_date: new Date('2024-01-20'),
          status: 'completed',
          recurrence_type: 'weekly',
          recurrence_interval: 1
        }
      ])
      .execute();

    const result = await getTasksByUser(assignedUser.id);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Task 1');
    expect(result[0].assigned_to).toEqual(assignedUser.id);
    expect(result[0].status).toEqual('pending');
    expect(result[0].due_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[1].title).toEqual('Task 2');
    expect(result[1].status).toEqual('completed');
    expect(result[1].recurrence_type).toEqual('weekly');
  });

  it('should return empty array when user has no tasks', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password_hash: 'hash123',
        first_name: 'Test',
        last_name: 'User',
        role: 'standard_user'
      })
      .returning()
      .execute();

    const result = await getTasksByUser(user.id);

    expect(result).toHaveLength(0);
  });

  it('should only return tasks assigned to the specified user', async () => {
    // Create test users
    const [user1, user2, assigningUser] = await db.insert(usersTable)
      .values([
        {
          email: 'user1@test.com',
          password_hash: 'hash123',
          first_name: 'User',
          last_name: 'One',
          role: 'standard_user'
        },
        {
          email: 'user2@test.com',
          password_hash: 'hash456',
          first_name: 'User',
          last_name: 'Two',
          role: 'standard_user'
        },
        {
          email: 'admin@test.com',
          password_hash: 'hash789',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin'
        }
      ])
      .returning()
      .execute();

    // Create test form
    const [form] = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'A test form',
        created_by: assigningUser.id
      })
      .returning()
      .execute();

    // Create tasks for different users
    await db.insert(tasksTable)
      .values([
        {
          form_id: form.id,
          assigned_to: user1.id,
          assigned_by: assigningUser.id,
          title: 'Task for User 1',
          due_date: new Date('2024-01-15'),
          status: 'pending',
          recurrence_type: 'none'
        },
        {
          form_id: form.id,
          assigned_to: user2.id,
          assigned_by: assigningUser.id,
          title: 'Task for User 2',
          due_date: new Date('2024-01-20'),
          status: 'pending',
          recurrence_type: 'none'
        }
      ])
      .execute();

    const result = await getTasksByUser(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Task for User 1');
    expect(result[0].assigned_to).toEqual(user1.id);
  });

  it('should handle different task statuses and recurrence types', async () => {
    // Create test users
    const [assignedUser, assigningUser] = await db.insert(usersTable)
      .values([
        {
          email: 'assigned@test.com',
          password_hash: 'hash123',
          first_name: 'John',
          last_name: 'Doe',
          role: 'standard_user'
        },
        {
          email: 'assigning@test.com',
          password_hash: 'hash456',
          first_name: 'Jane',
          last_name: 'Smith',
          role: 'admin'
        }
      ])
      .returning()
      .execute();

    // Create test form
    const [form] = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'A test form',
        created_by: assigningUser.id
      })
      .returning()
      .execute();

    // Create tasks with different statuses
    await db.insert(tasksTable)
      .values([
        {
          form_id: form.id,
          assigned_to: assignedUser.id,
          assigned_by: assigningUser.id,
          title: 'Pending Task',
          due_date: new Date('2024-01-15'),
          status: 'pending',
          recurrence_type: 'none'
        },
        {
          form_id: form.id,
          assigned_to: assignedUser.id,
          assigned_by: assigningUser.id,
          title: 'In Progress Task',
          due_date: new Date('2024-01-20'),
          status: 'in_progress',
          recurrence_type: 'daily',
          recurrence_interval: 1,
          next_due_date: new Date('2024-01-21')
        },
        {
          form_id: form.id,
          assigned_to: assignedUser.id,
          assigned_by: assigningUser.id,
          title: 'Overdue Task',
          due_date: new Date('2024-01-10'),
          status: 'overdue',
          recurrence_type: 'monthly',
          recurrence_interval: 2
        }
      ])
      .execute();

    const result = await getTasksByUser(assignedUser.id);

    expect(result).toHaveLength(3);
    
    const pendingTask = result.find(t => t.status === 'pending');
    expect(pendingTask?.title).toEqual('Pending Task');
    expect(pendingTask?.recurrence_type).toEqual('none');
    
    const inProgressTask = result.find(t => t.status === 'in_progress');
    expect(inProgressTask?.title).toEqual('In Progress Task');
    expect(inProgressTask?.recurrence_type).toEqual('daily');
    expect(inProgressTask?.recurrence_interval).toEqual(1);
    expect(inProgressTask?.next_due_date).toBeInstanceOf(Date);
    
    const overdueTask = result.find(t => t.status === 'overdue');
    expect(overdueTask?.title).toEqual('Overdue Task');
    expect(overdueTask?.recurrence_type).toEqual('monthly');
    expect(overdueTask?.recurrence_interval).toEqual(2);
  });
});
