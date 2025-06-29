
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUsers(): Promise<User[]> {
  try {
    // Fetch all active users from the database
    const results = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      password_hash: usersTable.password_hash,
      first_name: usersTable.first_name,
      last_name: usersTable.last_name,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
      .from(usersTable)
      .where(eq(usersTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}
