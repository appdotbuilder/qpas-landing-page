import { db } from '../db';
import { questionPapersTable } from '../db/schema';
import { type QuestionPaper, type GetQuestionPapersQuery } from '../schema';
import { eq, and, ilike, SQL } from 'drizzle-orm';

export const getQuestionPapers = async (input: GetQuestionPapersQuery): Promise<QuestionPaper[]> => {
  try {
    // Build conditions array for filters
    const conditions: SQL<unknown>[] = [];

    // Filter by institution
    if (input.institution_id !== undefined) {
      conditions.push(eq(questionPapersTable.institution_id, input.institution_id));
    }

    // Filter by subject
    if (input.subject_id !== undefined) {
      conditions.push(eq(questionPapersTable.subject_id, input.subject_id));
    }

    // Filter by exam year
    if (input.exam_year !== undefined) {
      conditions.push(eq(questionPapersTable.exam_year, input.exam_year));
    }

    // Filter by exam type
    if (input.exam_type !== undefined) {
      conditions.push(eq(questionPapersTable.exam_type, input.exam_type));
    }

    // Filter by public status
    if (input.is_public !== undefined) {
      conditions.push(eq(questionPapersTable.is_public, input.is_public));
    }

    // Text search in title (case-insensitive)
    if (input.search !== undefined && input.search.trim() !== '') {
      conditions.push(ilike(questionPapersTable.title, `%${input.search.trim()}%`));
    }

    // Execute query with proper typing
    const results = conditions.length > 0
      ? await db.select()
          .from(questionPapersTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .limit(input.limit)
          .offset(input.offset)
          .execute()
      : await db.select()
          .from(questionPapersTable)
          .limit(input.limit)
          .offset(input.offset)
          .execute();

    // Convert tags from JSONB to array and ensure proper typing
    return results.map(paper => ({
      ...paper,
      tags: paper.tags as string[] | null
    }));
  } catch (error) {
    console.error('Failed to get question papers:', error);
    throw error;
  }
};