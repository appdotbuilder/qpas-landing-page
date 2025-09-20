import { db } from '../db';
import { testimonialsTable, usersTable, institutionsTable } from '../db/schema';
import { type CreateTestimonialInput, type Testimonial } from '../schema';
import { eq } from 'drizzle-orm';

export const createTestimonial = async (input: CreateTestimonialInput): Promise<Testimonial> => {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Verify that the institution exists
    const institution = await db.select()
      .from(institutionsTable)
      .where(eq(institutionsTable.id, input.institution_id))
      .limit(1)
      .execute();

    if (institution.length === 0) {
      throw new Error(`Institution with id ${input.institution_id} does not exist`);
    }

    // Insert testimonial record
    const result = await db.insert(testimonialsTable)
      .values({
        user_id: input.user_id,
        institution_id: input.institution_id,
        content: input.content,
        rating: input.rating,
        is_featured: false, // New testimonials start as not featured
        video_url: input.video_url || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Testimonial creation failed:', error);
    throw error;
  }
};