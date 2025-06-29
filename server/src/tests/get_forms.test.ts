
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, formsTable } from '../db/schema';
import { getForms } from '../handlers/get_forms';

describe('getForms', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no forms exist', async () => {
    const result = await getForms();
    expect(result).toEqual([]);
  });

  it('should return active forms only', async () => {
    // Create a user first (required for foreign key)
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create active and inactive forms
    await db.insert(formsTable)
      .values([
        {
          title: 'Active Form 1',
          description: 'First active form',
          tags: '["tag1", "tag2"]',
          is_active: true,
          created_by: user.id
        },
        {
          title: 'Inactive Form',
          description: 'This form is inactive',
          tags: null,
          is_active: false,
          created_by: user.id
        },
        {
          title: 'Active Form 2',
          description: null,
          tags: '["tag3"]',
          is_active: true,
          created_by: user.id
        }
      ])
      .execute();

    const result = await getForms();

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Active Form 1');
    expect(result[0].description).toEqual('First active form');
    expect(result[0].tags).toEqual('["tag1", "tag2"]');
    expect(result[0].is_active).toBe(true);
    expect(result[0].created_by).toEqual(user.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].title).toEqual('Active Form 2');
    expect(result[1].description).toBeNull();
    expect(result[1].tags).toEqual('["tag3"]');
    expect(result[1].is_active).toBe(true);
    expect(result[1].created_by).toEqual(user.id);
  });

  it('should handle forms with null descriptions and tags', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'standard_user'
      })
      .returning()
      .execute();

    // Create form with null optional fields
    await db.insert(formsTable)
      .values({
        title: 'Minimal Form',
        description: null,
        tags: null,
        is_active: true,
        created_by: user.id
      })
      .execute();

    const result = await getForms();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Minimal Form');
    expect(result[0].description).toBeNull();
    expect(result[0].tags).toBeNull();
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
  });

  it('should return forms created by different users', async () => {
    // Create multiple users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'One',
        role: 'admin'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        first_name: 'User',
        last_name: 'Two',
        role: 'standard_user'
      })
      .returning()
      .execute();

    // Create forms by different users
    await db.insert(formsTable)
      .values([
        {
          title: 'Form by User 1',
          description: 'Created by first user',
          tags: null,
          is_active: true,
          created_by: user1.id
        },
        {
          title: 'Form by User 2',
          description: 'Created by second user',
          tags: '["different"]',
          is_active: true,
          created_by: user2.id
        }
      ])
      .execute();

    const result = await getForms();

    expect(result).toHaveLength(2);
    
    const form1 = result.find(f => f.title === 'Form by User 1');
    const form2 = result.find(f => f.title === 'Form by User 2');
    
    expect(form1).toBeDefined();
    expect(form1!.created_by).toEqual(user1.id);
    
    expect(form2).toBeDefined();
    expect(form2!.created_by).toEqual(user2.id);
  });
});
