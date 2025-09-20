import { db } from '../db';
import { questionPapersTable, usersTable, subjectsTable, institutionsTable } from '../db/schema';
import { type CreateQuestionPaperInput, type QuestionPaper } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createQuestionPaper = async (input: CreateQuestionPaperInput): Promise<QuestionPaper> => {
  try {
    // Validate that the institution exists first
    const institution = await db.select()
      .from(institutionsTable)
      .where(eq(institutionsTable.id, input.institution_id))
      .execute();

    if (institution.length === 0) {
      throw new Error(`Institution with id ${input.institution_id} not found`);
    }

    // Validate that the user exists and belongs to the institution
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.uploaded_by))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.uploaded_by} not found`);
    }

    if (user[0].institution_id !== input.institution_id) {
      throw new Error('User does not belong to the specified institution');
    }

    // Validate that the subject exists and belongs to the institution
    const subject = await db.select()
      .from(subjectsTable)
      .where(and(
        eq(subjectsTable.id, input.subject_id),
        eq(subjectsTable.institution_id, input.institution_id)
      ))
      .execute();

    if (subject.length === 0) {
      throw new Error('Subject not found or does not belong to the specified institution');
    }

    // Insert the question paper record
    const result = await db.insert(questionPapersTable)
      .values({
        title: input.title,
        subject_id: input.subject_id,
        institution_id: input.institution_id,
        uploaded_by: input.uploaded_by,
        exam_year: input.exam_year,
        exam_type: input.exam_type,
        difficulty_level: input.difficulty_level,
        file_url: input.file_url,
        file_size: input.file_size,
        download_count: 0, // New papers start with 0 downloads
        is_public: input.is_public,
        tags: input.tags as string[] | null
      })
      .returning()
      .execute();

    const paper = result[0];
    return {
      ...paper,
      tags: paper.tags as string[] | null
    };
  } catch (error) {
    console.error('Question paper creation failed:', error);
    throw error;
  }
};