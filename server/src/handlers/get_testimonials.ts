import { db } from '../db';
import { testimonialsTable } from '../db/schema';
import { type Testimonial } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getTestimonials = async (institutionId?: number): Promise<Testimonial[]> => {
  try {
    // Build the query with proper conditional logic
    const results = institutionId !== undefined
      ? await db.select()
          .from(testimonialsTable)
          .where(eq(testimonialsTable.institution_id, institutionId))
          .orderBy(
            desc(testimonialsTable.is_featured),
            desc(testimonialsTable.created_at)
          )
          .execute()
      : await db.select()
          .from(testimonialsTable)
          .orderBy(
            desc(testimonialsTable.is_featured),
            desc(testimonialsTable.created_at)
          )
          .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch testimonials:', error);
    throw error;
  }
};