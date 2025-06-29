
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'standard_user'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with valid input', async () => {
    const result = await createUser(testInput);

    // Verify returned user object
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('standard_user');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('standard_user');
    expect(users[0].is_active).toBe(true);
    expect(users[0].password_hash).toBeDefined();
  });

  it('should hash the password', async () => {
    const result = await createUser(testInput);

    // Password should be hashed, not stored in plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(20);
    
    // Verify password can be verified with Bun's password verification
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should create admin user', async () => {
    const adminInput: CreateUserInput = {
      ...testInput,
      email: 'admin@example.com',
      role: 'admin'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('admin');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    const duplicateInput: CreateUserInput = {
      ...testInput,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should set default values correctly', async () => {
    const result = await createUser(testInput);

    // Verify default values are applied
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Timestamps should be recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    expect(result.created_at >= oneMinuteAgo).toBe(true);
    expect(result.updated_at >= oneMinuteAgo).toBe(true);
  });
});
