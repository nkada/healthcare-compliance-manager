
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable, tasksTable } from '../db/schema';
import { type AnalyticsFilter } from '../schema';
import { getOrganizationAnalytics } from '../handlers/get_organization_analytics';

describe('getOrganizationAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return basic analytics with no data', async () => {
    const result = await getOrganizationAnalytics();

    expect(result.total_forms).toEqual(0);
    expect(result.total_tasks).toEqual(0);
    expect(result.completed_tasks).toEqual(0);
    expect(result.overdue_tasks).toEqual(0);
    expect(result.overall_completion_rate).toEqual(0);
    expect(result.active_users).toEqual(0);
  });

  it('should calculate analytics with test data', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'admin@test.com',
          password_hash: 'hash1',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          is_active: true
        },
        {
          email: 'user@test.com',
          password_hash: 'hash2',
          first_name: 'Standard',
          last_name: 'User',
          role: 'standard_user',
          is_active: true
        },
        {
          email: 'inactive@test.com',
          password_hash: 'hash3',
          first_name: 'Inactive',
          last_name: 'User',
          role: 'standard_user',
          is_active: false
        }
      ])
      .returning()
      .execute();

    // Create test forms
    const forms = await db.insert(formsTable)
      .values([
        {
          title: 'Form 1',
          description: 'Test form 1',
          tags: JSON.stringify(['tag1']),
          created_by: users[0].id
        },
        {
          title: 'Form 2',
          description: 'Test form 2',
          tags: JSON.stringify(['tag2']),
          created_by: users[0].id
        }
      ])
      .returning()
      .execute();

    // Create test tasks
    await db.insert(tasksTable)
      .values([
        {
          form_id: forms[0].id,
          assigned_to: users[1].id,
          assigned_by: users[0].id,
          title: 'Task 1',
          due_date: new Date('2024-01-15'),
          status: 'completed'
        },
        {
          form_id: forms[0].id,
          assigned_to: users[1].id,
          assigned_by: users[0].id,
          title: 'Task 2',
          due_date: new Date('2024-01-16'),
          status: 'pending'
        },
        {
          form_id: forms[1].id,
          assigned_to: users[1].id,
          assigned_by: users[0].id,
          title: 'Task 3',
          due_date: new Date('2024-01-17'),
          status: 'overdue'
        }
      ])
      .execute();

    const result = await getOrganizationAnalytics();

    expect(result.total_forms).toEqual(2);
    expect(result.total_tasks).toEqual(3);
    expect(result.completed_tasks).toEqual(1);
    expect(result.overdue_tasks).toEqual(1);
    expect(result.overall_completion_rate).toEqual(33.33); // 1/3 * 100 rounded to 2 decimal places
    expect(result.active_users).toEqual(2); // Only active users counted
  });

  it('should filter analytics by date range', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'admin@test.com',
          password_hash: 'hash1',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          is_active: true
        }
      ])
      .returning()
      .execute();

    // Create forms with different dates
    const oldDate = new Date('2023-01-01');
    const newDate = new Date('2024-01-01');

    const oldForm = await db.insert(formsTable)
      .values({
        title: 'Old Form',
        description: 'Old form',
        created_by: users[0].id,
        created_at: oldDate
      })
      .returning()
      .execute();

    const newForm = await db.insert(formsTable)
      .values({
        title: 'New Form',
        description: 'New form',
        created_by: users[0].id,
        created_at: newDate
      })
      .returning()
      .execute();

    // Create tasks with different dates
    await db.insert(tasksTable)
      .values([
        {
          form_id: oldForm[0].id,
          assigned_to: users[0].id,
          assigned_by: users[0].id,
          title: 'Old Task',
          due_date: new Date('2023-01-15'),
          status: 'completed',
          created_at: oldDate
        },
        {
          form_id: newForm[0].id,
          assigned_to: users[0].id,
          assigned_by: users[0].id,
          title: 'New Task',
          due_date: new Date('2024-01-15'),
          status: 'pending',
          created_at: newDate
        }
      ])
      .execute();

    const filter: AnalyticsFilter = {
      date_from: new Date('2024-01-01'),
      date_to: new Date('2024-12-31')
    };

    const result = await getOrganizationAnalytics(filter);

    expect(result.total_forms).toEqual(1); // Only new form
    expect(result.total_tasks).toEqual(1); // Only new task
    expect(result.completed_tasks).toEqual(0); // New task is pending
    expect(result.overall_completion_rate).toEqual(0);
    expect(result.active_users).toEqual(1); // User count not affected by date filter
  });

  it('should filter analytics by user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'admin@test.com',
          password_hash: 'hash1',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          is_active: true
        },
        {
          email: 'user1@test.com',
          password_hash: 'hash2',
          first_name: 'User',
          last_name: 'One',
          role: 'standard_user',
          is_active: true
        },
        {
          email: 'user2@test.com',
          password_hash: 'hash3',
          first_name: 'User',
          last_name: 'Two',
          role: 'standard_user',
          is_active: true
        }
      ])
      .returning()
      .execute();

    // Create test form
    const forms = await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'Test form',
        created_by: users[0].id
      })
      .returning()
      .execute();

    // Create tasks for different users
    await db.insert(tasksTable)
      .values([
        {
          form_id: forms[0].id,
          assigned_to: users[1].id,
          assigned_by: users[0].id,
          title: 'Task for User 1',
          due_date: new Date('2024-01-15'),
          status: 'completed'
        },
        {
          form_id: forms[0].id,
          assigned_to: users[2].id,
          assigned_by: users[0].id,
          title: 'Task for User 2',
          due_date: new Date('2024-01-16'),
          status: 'pending'
        }
      ])
      .execute();

    const filter: AnalyticsFilter = {
      user_id: users[1].id
    };

    const result = await getOrganizationAnalytics(filter);

    expect(result.total_forms).toEqual(1); // Form count not affected by user filter - only 1 form created
    expect(result.total_tasks).toEqual(1); // Only tasks assigned to user 1
    expect(result.completed_tasks).toEqual(1); // User 1's task is completed
    expect(result.overall_completion_rate).toEqual(100); // 1/1 * 100
    expect(result.active_users).toEqual(3); // User count not affected by user filter
  });

  it('should handle empty completion rate calculation', async () => {
    // Create test user and form but no tasks
    const users = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hash1',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: true
      })
      .returning()
      .execute();

    await db.insert(formsTable)
      .values({
        title: 'Test Form',
        description: 'Test form',
        created_by: users[0].id
      })
      .execute();

    const result = await getOrganizationAnalytics();

    expect(result.total_forms).toEqual(1);
    expect(result.total_tasks).toEqual(0);
    expect(result.completed_tasks).toEqual(0);
    expect(result.overall_completion_rate).toEqual(0); // Should handle division by zero
    expect(result.active_users).toEqual(1);
  });
});
