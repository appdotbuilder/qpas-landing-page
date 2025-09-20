import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User, type UserRole } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export const getUsers = async (institutionId?: number, role?: UserRole): Promise<User[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    if (institutionId !== undefined) {
      conditions.push(eq(usersTable.institution_id, institutionId));
    }

    if (role !== undefined) {
      conditions.push(eq(usersTable.role, role));
    }

    // Build query based on whether we have conditions
    const results = conditions.length === 0
      ? await db.select().from(usersTable).execute()
      : await db.select()
          .from(usersTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .execute();

    // Return results - no numeric conversions needed for users table
    return results;
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
};