import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { institutionsTable, usersTable, subjectsTable, questionPapersTable } from '../db/schema';
import { type CreateQuestionPaperInput } from '../schema';
import { createQuestionPaper } from '../handlers/create_question_paper';
import { eq } from 'drizzle-orm';

describe('createQuestionPaper', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let institutionId: number;
  let userId: number;
  let subjectId: number;

  beforeEach(async () => {
    // Create test institution
    const institution = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City',
        established_year: 2000,
        total_students: 10000,
        total_faculty: 500
      })
      .returning()
      .execute();
    institutionId = institution[0].id;

    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'teacher@test.edu',
        name: 'Test Teacher',
        role: 'teacher',
        institution_id: institutionId
      })
      .returning()
      .execute();
    userId = user[0].id;

    // Create test subject
    const subject = await db.insert(subjectsTable)
      .values({
        name: 'Computer Science',
        code: 'CS101',
        institution_id: institutionId
      })
      .returning()
      .execute();
    subjectId = subject[0].id;
  });

  const testInput: CreateQuestionPaperInput = {
    title: 'Final Exam 2023',
    subject_id: 0, // Will be set in beforeEach
    institution_id: 0, // Will be set in beforeEach
    uploaded_by: 0, // Will be set in beforeEach
    exam_year: 2023,
    exam_type: 'final',
    difficulty_level: 'intermediate',
    file_url: 'https://example.com/papers/cs101-final-2023.pdf',
    file_size: 2048576,
    is_public: true,
    tags: ['algorithms', 'data-structures']
  };

  it('should create a question paper with all fields', async () => {
    const input = {
      ...testInput,
      subject_id: subjectId,
      institution_id: institutionId,
      uploaded_by: userId
    };

    const result = await createQuestionPaper(input);

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.title).toEqual('Final Exam 2023');
    expect(result.subject_id).toEqual(subjectId);
    expect(result.institution_id).toEqual(institutionId);
    expect(result.uploaded_by).toEqual(userId);
    expect(result.exam_year).toEqual(2023);
    expect(result.exam_type).toEqual('final');
    expect(result.difficulty_level).toEqual('intermediate');
    expect(result.file_url).toEqual('https://example.com/papers/cs101-final-2023.pdf');
    expect(result.file_size).toEqual(2048576);
    expect(result.download_count).toEqual(0);
    expect(result.is_public).toEqual(true);
    expect(result.tags).toEqual(['algorithms', 'data-structures']);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a question paper with minimal fields', async () => {
    const input: CreateQuestionPaperInput = {
      title: 'Midterm Exam',
      subject_id: subjectId,
      institution_id: institutionId,
      uploaded_by: userId,
      exam_year: 2023,
      exam_type: 'midterm',
      difficulty_level: null,
      file_url: 'https://example.com/papers/midterm.pdf',
      file_size: 1024000,
      is_public: false,
      tags: null
    };

    const result = await createQuestionPaper(input);

    expect(result.id).toBeDefined();
    expect(result.title).toEqual('Midterm Exam');
    expect(result.difficulty_level).toBeNull();
    expect(result.is_public).toEqual(false);
    expect(result.tags).toBeNull();
    expect(result.download_count).toEqual(0);
  });

  it('should save question paper to database', async () => {
    const input = {
      ...testInput,
      subject_id: subjectId,
      institution_id: institutionId,
      uploaded_by: userId
    };

    const result = await createQuestionPaper(input);

    const savedPaper = await db.select()
      .from(questionPapersTable)
      .where(eq(questionPapersTable.id, result.id))
      .execute();

    expect(savedPaper).toHaveLength(1);
    expect(savedPaper[0].title).toEqual('Final Exam 2023');
    expect(savedPaper[0].subject_id).toEqual(subjectId);
    expect(savedPaper[0].institution_id).toEqual(institutionId);
    expect(savedPaper[0].uploaded_by).toEqual(userId);
    expect(savedPaper[0].download_count).toEqual(0);
    expect(savedPaper[0].created_at).toBeInstanceOf(Date);
    expect(savedPaper[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const input = {
      ...testInput,
      subject_id: subjectId,
      institution_id: institutionId,
      uploaded_by: 99999 // Non-existent user
    };

    await expect(createQuestionPaper(input)).rejects.toThrow(/user with id 99999 not found/i);
  });

  it('should throw error when user does not belong to institution', async () => {
    // Create another institution
    const otherInstitution = await db.insert(institutionsTable)
      .values({
        name: 'Other University',
        type: 'university'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      subject_id: subjectId,
      institution_id: otherInstitution[0].id, // Different institution
      uploaded_by: userId // User belongs to original institution
    };

    await expect(createQuestionPaper(input)).rejects.toThrow(/user does not belong to the specified institution/i);
  });

  it('should throw error when subject does not exist', async () => {
    const input = {
      ...testInput,
      subject_id: 99999, // Non-existent subject
      institution_id: institutionId,
      uploaded_by: userId
    };

    await expect(createQuestionPaper(input)).rejects.toThrow(/subject not found or does not belong to the specified institution/i);
  });

  it('should throw error when subject belongs to different institution', async () => {
    // Create another institution and subject
    const otherInstitution = await db.insert(institutionsTable)
      .values({
        name: 'Other University',
        type: 'university'
      })
      .returning()
      .execute();

    const otherSubject = await db.insert(subjectsTable)
      .values({
        name: 'Mathematics',
        code: 'MATH101',
        institution_id: otherInstitution[0].id
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      subject_id: otherSubject[0].id, // Subject from different institution
      institution_id: institutionId,
      uploaded_by: userId
    };

    await expect(createQuestionPaper(input)).rejects.toThrow(/subject not found or does not belong to the specified institution/i);
  });

  it('should throw error when institution does not exist', async () => {
    const input = {
      ...testInput,
      subject_id: subjectId,
      institution_id: 99999, // Non-existent institution
      uploaded_by: userId
    };

    await expect(createQuestionPaper(input)).rejects.toThrow(/institution with id 99999 not found/i);
  });

  it('should handle tags as array correctly', async () => {
    const input = {
      ...testInput,
      subject_id: subjectId,
      institution_id: institutionId,
      uploaded_by: userId,
      tags: ['programming', 'algorithms', 'data-structures', 'complexity']
    };

    const result = await createQuestionPaper(input);

    expect(result.tags).toEqual(['programming', 'algorithms', 'data-structures', 'complexity']);
    expect(Array.isArray(result.tags)).toBe(true);
  });

  it('should handle empty tags array correctly', async () => {
    const input = {
      ...testInput,
      subject_id: subjectId,
      institution_id: institutionId,
      uploaded_by: userId,
      tags: []
    };

    const result = await createQuestionPaper(input);

    expect(result.tags).toEqual([]);
    expect(Array.isArray(result.tags)).toBe(true);
  });
});