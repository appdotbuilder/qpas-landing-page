import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { institutionsTable, usersTable, subjectsTable, questionPapersTable } from '../db/schema';
import { type GetQuestionPapersQuery } from '../schema';
import { getQuestionPapers } from '../handlers/get_question_papers';
import { eq } from 'drizzle-orm';

describe('getQuestionPapers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  const createTestData = async () => {
    // Create institutions
    const [institution1, institution2] = await db.insert(institutionsTable)
      .values([
        {
          name: 'Test University',
          type: 'university',
          location: 'Test City',
          established_year: 1950,
          total_students: 10000,
          total_faculty: 500
        },
        {
          name: 'Another College',
          type: 'college',
          location: 'Another City',
          established_year: 1980,
          total_students: 5000,
          total_faculty: 250
        }
      ])
      .returning()
      .execute();

    // Create users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        {
          email: 'teacher1@test.com',
          name: 'Test Teacher 1',
          role: 'teacher',
          institution_id: institution1.id
        },
        {
          email: 'teacher2@test.com',
          name: 'Test Teacher 2',
          role: 'teacher',
          institution_id: institution2.id
        }
      ])
      .returning()
      .execute();

    // Create subjects
    const [subject1, subject2, subject3] = await db.insert(subjectsTable)
      .values([
        {
          name: 'Computer Science',
          code: 'CS101',
          institution_id: institution1.id
        },
        {
          name: 'Mathematics',
          code: 'MATH201',
          institution_id: institution1.id
        },
        {
          name: 'Physics',
          code: 'PHY101',
          institution_id: institution2.id
        }
      ])
      .returning()
      .execute();

    // Create question papers
    await db.insert(questionPapersTable)
      .values([
        {
          title: 'Computer Science Final Exam 2023',
          subject_id: subject1.id,
          institution_id: institution1.id,
          uploaded_by: user1.id,
          exam_year: 2023,
          exam_type: 'final',
          difficulty_level: 'advanced',
          file_url: 'https://example.com/cs-final-2023.pdf',
          file_size: 2048000,
          download_count: 150,
          is_public: true,
          tags: JSON.stringify(['algorithms', 'data-structures', 'programming'])
        },
        {
          title: 'Mathematics Midterm Exam 2023',
          subject_id: subject2.id,
          institution_id: institution1.id,
          uploaded_by: user1.id,
          exam_year: 2023,
          exam_type: 'midterm',
          difficulty_level: 'intermediate',
          file_url: 'https://example.com/math-midterm-2023.pdf',
          file_size: 1536000,
          download_count: 89,
          is_public: true,
          tags: JSON.stringify(['calculus', 'algebra'])
        },
        {
          title: 'Computer Science Quiz 2022',
          subject_id: subject1.id,
          institution_id: institution1.id,
          uploaded_by: user1.id,
          exam_year: 2022,
          exam_type: 'quiz',
          difficulty_level: 'beginner',
          file_url: 'https://example.com/cs-quiz-2022.pdf',
          file_size: 512000,
          download_count: 45,
          is_public: false,
          tags: JSON.stringify(['basics', 'introduction'])
        },
        {
          title: 'Physics Final Exam 2023',
          subject_id: subject3.id,
          institution_id: institution2.id,
          uploaded_by: user2.id,
          exam_year: 2023,
          exam_type: 'final',
          difficulty_level: 'advanced',
          file_url: 'https://example.com/physics-final-2023.pdf',
          file_size: 1800000,
          download_count: 75,
          is_public: true,
          tags: JSON.stringify(['mechanics', 'thermodynamics'])
        }
      ])
      .execute();

    return { institution1, institution2, user1, user2, subject1, subject2, subject3 };
  };

  it('should return all public question papers by default', async () => {
    await createTestData();

    const query: GetQuestionPapersQuery = {
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);

    expect(result).toHaveLength(4);
    expect(result[0].title).toBeDefined();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(Array.isArray(result[0].tags)).toBe(true);
  });

  it('should filter by institution_id', async () => {
    const { institution1, institution2 } = await createTestData();

    const query: GetQuestionPapersQuery = {
      institution_id: institution1.id,
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);

    expect(result).toHaveLength(3);
    result.forEach(paper => {
      expect(paper.institution_id).toBe(institution1.id);
    });
  });

  it('should filter by subject_id', async () => {
    const { subject1 } = await createTestData();

    const query: GetQuestionPapersQuery = {
      subject_id: subject1.id,
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);

    expect(result).toHaveLength(2);
    result.forEach(paper => {
      expect(paper.subject_id).toBe(subject1.id);
    });
  });

  it('should filter by exam_year', async () => {
    await createTestData();

    const query: GetQuestionPapersQuery = {
      exam_year: 2023,
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);

    expect(result).toHaveLength(3);
    result.forEach(paper => {
      expect(paper.exam_year).toBe(2023);
    });
  });

  it('should filter by exam_type', async () => {
    await createTestData();

    const query: GetQuestionPapersQuery = {
      exam_type: 'final',
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);

    expect(result).toHaveLength(2);
    result.forEach(paper => {
      expect(paper.exam_type).toBe('final');
    });
  });

  it('should filter by is_public', async () => {
    await createTestData();

    const queryPublic: GetQuestionPapersQuery = {
      is_public: true,
      limit: 20,
      offset: 0
    };

    const publicResult = await getQuestionPapers(queryPublic);
    expect(publicResult).toHaveLength(3);
    publicResult.forEach(paper => {
      expect(paper.is_public).toBe(true);
    });

    const queryPrivate: GetQuestionPapersQuery = {
      is_public: false,
      limit: 20,
      offset: 0
    };

    const privateResult = await getQuestionPapers(queryPrivate);
    expect(privateResult).toHaveLength(1);
    privateResult.forEach(paper => {
      expect(paper.is_public).toBe(false);
    });
  });

  it('should search by title', async () => {
    await createTestData();

    const query: GetQuestionPapersQuery = {
      search: 'Computer Science',
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);

    expect(result).toHaveLength(2);
    result.forEach(paper => {
      expect(paper.title.toLowerCase()).toContain('computer science');
    });
  });

  it('should handle case-insensitive search', async () => {
    await createTestData();

    const query: GetQuestionPapersQuery = {
      search: 'mathematics',
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain('Mathematics');
  });

  it('should combine multiple filters', async () => {
    const { institution1 } = await createTestData();

    const query: GetQuestionPapersQuery = {
      institution_id: institution1.id,
      exam_year: 2023,
      exam_type: 'final',
      is_public: true,
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Computer Science Final Exam 2023');
    expect(result[0].institution_id).toBe(institution1.id);
    expect(result[0].exam_year).toBe(2023);
    expect(result[0].exam_type).toBe('final');
    expect(result[0].is_public).toBe(true);
  });

  it('should handle pagination correctly', async () => {
    await createTestData();

    // Get first page
    const firstPageQuery: GetQuestionPapersQuery = {
      limit: 2,
      offset: 0
    };

    const firstPage = await getQuestionPapers(firstPageQuery);
    expect(firstPage).toHaveLength(2);

    // Get second page
    const secondPageQuery: GetQuestionPapersQuery = {
      limit: 2,
      offset: 2
    };

    const secondPage = await getQuestionPapers(secondPageQuery);
    expect(secondPage).toHaveLength(2);

    // Ensure different results
    expect(firstPage[0].id).not.toBe(secondPage[0].id);
  });

  it('should return empty array when no matches found', async () => {
    await createTestData();

    const query: GetQuestionPapersQuery = {
      search: 'NonExistent Subject',
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);
    expect(result).toHaveLength(0);
  });

  it('should handle empty search string', async () => {
    await createTestData();

    const query: GetQuestionPapersQuery = {
      search: '   ',
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);
    expect(result).toHaveLength(4); // Should return all papers (ignores empty search)
  });

  it('should properly convert JSONB tags to array', async () => {
    await createTestData();

    const query: GetQuestionPapersQuery = {
      search: 'Computer Science Final',
      limit: 20,
      offset: 0
    };

    const result = await getQuestionPapers(query);

    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0].tags)).toBe(true);
    expect(result[0].tags).toEqual(['algorithms', 'data-structures', 'programming']);
  });
});