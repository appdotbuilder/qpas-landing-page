import { db } from '../db';
import { usersTable, institutionsTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // First verify that the institution exists
    const institution = await db.select()
      .from(institutionsTable)
      .where(eq(institutionsTable.id, input.institution_id))
      .execute();

    if (institution.length === 0) {
      throw new Error('Institution not found');
    }

    // Check if user with this email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Insert the new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        name: input.name,
        role: input.role,
        institution_id: input.institution_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};