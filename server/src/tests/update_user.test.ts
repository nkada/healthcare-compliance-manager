
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper to create a test user
const createTestUser = async (): Promise<number> => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password_hash: 'hashed_password_placeholder',
      first_name: 'Test',
      last_name: 'User',
      role: 'standard_user'
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user email', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.first_name).toEqual('Test'); // Should remain unchanged
    expect(result.last_name).toEqual('User'); // Should remain unchanged
    expect(result.role).toEqual('standard_user'); // Should remain unchanged
    expect(result.is_active).toEqual(true); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user name fields', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      first_name: 'Updated',
      last_name: 'Name'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.first_name).toEqual('Updated');
    expect(result.last_name).toEqual('Name');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.role).toEqual('standard_user'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user role and status', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      role: 'admin',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(false);
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.first_name).toEqual('Test'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'multi@example.com',
      first_name: 'Multi',
      last_name: 'Update',
      role: 'admin',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('multi@example.com');
    expect(result.first_name).toEqual('Multi');
    expect(result.last_name).toEqual('Update');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'database@example.com',
      role: 'admin'
    };

    await updateUser(updateInput);

    // Verify changes were saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('database@example.com');
    expect(users[0].role).toEqual('admin');
    expect(users[0].first_name).toEqual('Test'); // Should remain unchanged
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      email: 'nonexistent@example.com'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const userId = await createTestUser();

    // Get original user data
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const updateInput: UpdateUserInput = {
      id: userId
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual(originalUser[0].email);
    expect(result.first_name).toEqual(originalUser[0].first_name);
    expect(result.last_name).toEqual(originalUser[0].last_name);
    expect(result.role).toEqual(originalUser[0].role);
    expect(result.is_active).toEqual(originalUser[0].is_active);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUser[0].updated_at.getTime());
  });
});
