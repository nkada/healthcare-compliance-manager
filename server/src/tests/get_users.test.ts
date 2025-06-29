
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';
import { userRoleEnum } from '../schema';

const testUser1 = {
  email: 'john.doe@example.com',
  password_hash: 'hashed_password_123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'admin' as const,
  is_active: true
};

const testUser2 = {
  email: 'jane.smith@example.com',
  password_hash: 'hashed_password_456',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'standard_user' as const,
  is_active: true
};

const inactiveUser = {
  email: 'inactive@example.com',
  password_hash: 'hashed_password_789',
  first_name: 'Inactive',
  last_name: 'User',
  role: 'standard_user' as const,
  is_active: false
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active users', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Check first user
    const user1 = result.find(u => u.email === 'john.doe@example.com');
    expect(user1).toBeDefined();
    expect(user1!.first_name).toEqual('John');
    expect(user1!.last_name).toEqual('Doe');
    expect(user1!.role).toEqual('admin');
    expect(user1!.is_active).toBe(true);
    expect(user1!.id).toBeDefined();
    expect(user1!.created_at).toBeInstanceOf(Date);
    expect(user1!.updated_at).toBeInstanceOf(Date);

    // Check second user
    const user2 = result.find(u => u.email === 'jane.smith@example.com');
    expect(user2).toBeDefined();
    expect(user2!.first_name).toEqual('Jane');
    expect(user2!.last_name).toEqual('Smith');
    expect(user2!.role).toEqual('standard_user');
    expect(user2!.is_active).toBe(true);
  });

  it('should exclude inactive users', async () => {
    // Create active and inactive users
    await db.insert(usersTable)
      .values([testUser1, inactiveUser])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].email).toEqual('john.doe@example.com');
    expect(result[0].is_active).toBe(true);
  });

  it('should return empty array when no active users exist', async () => {
    // Create only inactive user
    await db.insert(usersTable)
      .values([inactiveUser])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(0);
  });

  it('should include password_hash in response', async () => {
    // Create test user
    await db.insert(usersTable)
      .values([testUser1])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    expect(result[0].password_hash).toEqual('hashed_password_123');
  });
});
