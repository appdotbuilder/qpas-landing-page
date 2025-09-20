import { db } from '../db';
import { institutionsTable } from '../db/schema';
import { type CreateInstitutionInput, type Institution } from '../schema';

export const createInstitution = async (input: CreateInstitutionInput): Promise<Institution> => {
  try {
    // Insert institution record
    const result = await db.insert(institutionsTable)
      .values({
        name: input.name,
        type: input.type,
        location: input.location,
        established_year: input.established_year,
        total_students: input.total_students,
        total_faculty: input.total_faculty
      })
      .returning()
      .execute();

    // Return the created institution
    return result[0];
  } catch (error) {
    console.error('Institution creation failed:', error);
    throw error;
  }
};