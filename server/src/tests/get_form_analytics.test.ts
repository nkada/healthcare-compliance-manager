
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable, tasksTable, formSubmissionsTable } from '../db/schema';
import { type AnalyticsFilter } from '../schema';
import { getFormAnalytics } from '../handlers/get_form_analytics';

describe('getFormAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testFormId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test form with tags
    const formResult = await db.insert(formsTable)
      .values({
        title: 'Analytics Test Form',
        description: 'Form for testing analytics',
        tags: JSON.stringify(['test', 'analytics']),
        created_by: testUserId
      })
      .returning()
      .execute();
    testFormId = formResult[0].id;
  });

  it('should return analytics for form with no submissions', async () => {
    const result = await getFormAnalytics(testFormId);

    expect(result.form_id).toEqual(testFormId);
    expect(result.form_title).toEqual('Analytics Test Form');
    expect(result.total_submissions).toEqual(0);
    expect(result.completion_rate).toEqual(0);
    expect(result.average_completion_time).toBeNull();
    expect(result.tags).toEqual(['test', 'analytics']);
  });

  it('should calculate analytics with submissions and tasks', async () => {
    // Create task
    const taskResult = await db.insert(tasksTable)
      .values({
        form_id: testFormId,
        assigned_to: testUserId,
        assigned_by: testUserId,
        title: 'Test Task',
        due_date: new Date()
      })
      .returning()
      .execute();
    const taskId = taskResult[0].id;

    // Create submission
    await db.insert(formSubmissionsTable)
      .values({
        form_id: testFormId,
        task_id: taskId,
        submitted_by: testUserId,
        submission_data: JSON.stringify({ field1: 'value1' })
      })
      .execute();

    const result = await getFormAnalytics(testFormId);

    expect(result.form_id).toEqual(testFormId);
    expect(result.form_title).toEqual('Analytics Test Form');
    expect(result.total_submissions).toEqual(1);
    expect(result.completion_rate).toEqual(100); // 1 submission / 1 task = 100%
    expect(result.tags).toEqual(['test', 'analytics']);
  });

  it('should filter by date range', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create task and submission
    const taskResult = await db.insert(tasksTable)
      .values({
        form_id: testFormId,
        assigned_to: testUserId,
        assigned_by: testUserId,
        title: 'Test Task',
        due_date: new Date()
      })
      .returning()
      .execute();

    await db.insert(formSubmissionsTable)
      .values({
        form_id: testFormId,
        task_id: taskResult[0].id,
        submitted_by: testUserId,
        submission_data: JSON.stringify({ field1: 'value1' })
      })
      .execute();

    // Test with date range that includes today
    const filter: AnalyticsFilter = {
      date_from: yesterday,
      date_to: tomorrow
    };

    const result = await getFormAnalytics(testFormId, filter);
    expect(result.total_submissions).toEqual(1);

    // Test with date range that excludes today
    const excludeFilter: AnalyticsFilter = {
      date_from: yesterday,
      date_to: yesterday
    };

    const excludeResult = await getFormAnalytics(testFormId, excludeFilter);
    expect(excludeResult.total_submissions).toEqual(0);
  });

  it('should filter by user_id', async () => {
    // Create another user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'Two',
        role: 'standard_user'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create tasks for both users
    const task1Result = await db.insert(tasksTable)
      .values({
        form_id: testFormId,
        assigned_to: testUserId,
        assigned_by: testUserId,
        title: 'Task 1',
        due_date: new Date()
      })
      .returning()
      .execute();

    const task2Result = await db.insert(tasksTable)
      .values({
        form_id: testFormId,
        assigned_to: user2Id,
        assigned_by: testUserId,
        title: 'Task 2',
        due_date: new Date()
      })
      .returning()
      .execute();

    // Create submissions for both users
    await db.insert(formSubmissionsTable)
      .values([
        {
          form_id: testFormId,
          task_id: task1Result[0].id,
          submitted_by: testUserId,
          submission_data: JSON.stringify({ field1: 'value1' })
        },
        {
          form_id: testFormId,
          task_id: task2Result[0].id,
          submitted_by: user2Id,
          submission_data: JSON.stringify({ field1: 'value2' })
        }
      ])
      .execute();

    // Filter by first user
    const filter: AnalyticsFilter = { user_id: testUserId };
    const result = await getFormAnalytics(testFormId, filter);
    expect(result.total_submissions).toEqual(1);
    expect(result.completion_rate).toEqual(100); // 1 submission / 1 task for this user
  });

  it('should filter by tags', async () => {
    // Test with matching tags
    const matchingFilter: AnalyticsFilter = { tags: ['test'] };
    const matchingResult = await getFormAnalytics(testFormId, matchingFilter);
    expect(matchingResult.total_submissions).toEqual(0); // No submissions, but form matches tag

    // Test with non-matching tags
    const nonMatchingFilter: AnalyticsFilter = { tags: ['nonexistent'] };
    const nonMatchingResult = await getFormAnalytics(testFormId, nonMatchingFilter);
    expect(nonMatchingResult.total_submissions).toEqual(0);
    expect(nonMatchingResult.completion_rate).toEqual(0);
  });

  it('should handle form with no tags', async () => {
    // Create form without tags
    const noTagsFormResult = await db.insert(formsTable)
      .values({
        title: 'No Tags Form',
        description: 'Form without tags',
        tags: null,
        created_by: testUserId
      })
      .returning()
      .execute();

    const result = await getFormAnalytics(noTagsFormResult[0].id);
    expect(result.tags).toEqual([]);
  });

  it('should throw error for non-existent form', async () => {
    await expect(getFormAnalytics(99999)).rejects.toThrow(/Form with id 99999 not found/i);
  });

  it('should calculate completion rate correctly with multiple tasks and submissions', async () => {
    // Create 3 tasks
    const tasks = await db.insert(tasksTable)
      .values([
        {
          form_id: testFormId,
          assigned_to: testUserId,
          assigned_by: testUserId,
          title: 'Task 1',
          due_date: new Date()
        },
        {
          form_id: testFormId,
          assigned_to: testUserId,
          assigned_by: testUserId,
          title: 'Task 2',
          due_date: new Date()
        },
        {
          form_id: testFormId,
          assigned_to: testUserId,
          assigned_by: testUserId,
          title: 'Task 3',
          due_date: new Date()
        }
      ])
      .returning()
      .execute();

    // Create 2 submissions (2/3 = 66.67% completion rate)
    await db.insert(formSubmissionsTable)
      .values([
        {
          form_id: testFormId,
          task_id: tasks[0].id,
          submitted_by: testUserId,
          submission_data: JSON.stringify({ field1: 'value1' })
        },
        {
          form_id: testFormId,
          task_id: tasks[1].id,
          submitted_by: testUserId,
          submission_data: JSON.stringify({ field1: 'value2' })
        }
      ])
      .execute();

    const result = await getFormAnalytics(testFormId);
    expect(result.total_submissions).toEqual(2);
    expect(result.completion_rate).toBeCloseTo(66.67, 2);
  });
});
