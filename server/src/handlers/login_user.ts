import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginInput, type LoginOutput } from '../schema';

export const loginUser = async (input: LoginInput): Promise<LoginOutput> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await Bun.password.verify(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Generate a simple token (in production, use proper JWT)
    const tokenData = {
      id: user.id,
      email: user.email,
      role: user.role,
      timestamp: Date.now()
    };
    
    // Simple base64 encoding for demo purposes (NOT secure for production!)
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};