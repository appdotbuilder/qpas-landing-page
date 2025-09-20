import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  institutionsTable, 
  usersTable, 
  subjectsTable,
  questionPapersTable,
  analyticsTable,
  testimonialsTable
} from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

// Test data setup
const testInstitution = {
  name: 'Test University',
  type: 'university',
  location: 'Test City',
  established_year: 1950,
  total_students: 10000,
  total_faculty: 500
};

const testSubject = {
  name: 'Computer Science',
  code: 'CS101',
  institution_id: 1
};

const testStudentUser = {
  email: 'student@test.edu',
  name: 'John Student',
  role: 'student' as const,
  institution_id: 1
};

const testTeacherUser = {
  email: 'teacher@test.edu',
  name: 'Jane Teacher',
  role: 'teacher' as const,
  institution_id: 1
};

const testAdminUser = {
  email: 'admin@test.edu',
  name: 'Bob Admin',
  role: 'administrator' as const,
  institution_id: 1
};

const testQuestionPaper = {
  title: 'Test Exam Paper',
  subject_id: 1,
  institution_id: 1,
  uploaded_by: 2, // teacher user
  exam_year: 2023,
  exam_type: 'final',
  difficulty_level: 'intermediate',
  file_url: 'https://example.com/paper.pdf',
  file_size: 1024000,
  download_count: 50,
  is_public: true,
  tags: ['test', 'exam']
};

const testAnalytics = {
  institution_id: 1,
  metric_type: 'papers_uploaded',
  value: 25,
  date: new Date()
};

const testTestimonial = {
  user_id: 1, // student user
  institution_id: 1,
  content: 'Great platform for sharing papers',
  rating: 5,
  is_featured: false,
  video_url: null
};

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  async function setupTestData() {
    // Create institution
    await db.insert(institutionsTable).values(testInstitution).execute();

    // Create subject
    await db.insert(subjectsTable).values(testSubject).execute();

    // Create users
    await db.insert(usersTable).values([
      testStudentUser,
      testTeacherUser,
      testAdminUser
    ]).execute();

    // Create question papers
    await db.insert(questionPapersTable).values([
      testQuestionPaper,
      {
        ...testQuestionPaper,
        title: 'Another Test Paper',
        uploaded_by: 3, // admin user
        is_public: false,
        download_count: 25
      }
    ]).execute();

    // Create analytics
    await db.insert(analyticsTable).values([
      testAnalytics,
      {
        ...testAnalytics,
        metric_type: 'total_downloads',
        value: 150
      }
    ]).execute();

    // Create testimonial
    await db.insert(testimonialsTable).values(testTestimonial).execute();
  }

  it('should return dashboard data for student user', async () => {
    await setupTestData();

    const result = await getDashboardData(1); // student user

    // Verify user data
    expect(result.user.id).toEqual(1);
    expect(result.user.role).toEqual('student');
    expect(result.user.name).toEqual('John Student');
    expect(result.user.institution_id).toEqual(1);

    // Students should see public papers from their institution
    expect(result.recentPapers).toHaveLength(1);
    expect(result.recentPapers[0].is_public).toBe(true);
    expect(result.recentPapers[0].institution_id).toEqual(1);

    // Verify analytics exist
    expect(result.analytics.length).toBeGreaterThan(0);
    expect(result.analytics[0].institution_id).toEqual(1);

    // Verify quick stats structure
    expect(result.quickStats).toHaveProperty('totalPapers');
    expect(result.quickStats).toHaveProperty('totalDownloads');
    expect(result.quickStats).toHaveProperty('recentUploads');
    expect(result.quickStats).toHaveProperty('collaborations');
    expect(typeof result.quickStats.totalPapers).toBe('number');
    expect(typeof result.quickStats.totalDownloads).toBe('number');
  });

  it('should return dashboard data for teacher user', async () => {
    await setupTestData();

    const result = await getDashboardData(2); // teacher user

    // Verify user data
    expect(result.user.id).toEqual(2);
    expect(result.user.role).toEqual('teacher');
    expect(result.user.name).toEqual('Jane Teacher');

    // Teachers should see their uploaded papers
    expect(result.recentPapers).toHaveLength(1);
    expect(result.recentPapers[0].uploaded_by).toEqual(2);
    expect(result.recentPapers[0].title).toEqual('Test Exam Paper');

    // Verify analytics and stats
    expect(result.analytics.length).toBeGreaterThan(0);
    expect(result.quickStats.totalPapers).toEqual(1); // teacher uploaded 1 paper
    expect(result.quickStats.totalDownloads).toEqual(50); // downloads from their papers
  });

  it('should return dashboard data for administrator user', async () => {
    await setupTestData();

    const result = await getDashboardData(3); // admin user

    // Verify user data
    expect(result.user.id).toEqual(3);
    expect(result.user.role).toEqual('administrator');
    expect(result.user.name).toEqual('Bob Admin');

    // Administrators should see all papers in their institution
    expect(result.recentPapers).toHaveLength(2);
    expect(result.recentPapers.every(paper => paper.institution_id === 1)).toBe(true);

    // Verify institution-wide stats
    expect(result.quickStats.totalPapers).toEqual(2); // all papers in institution
    expect(result.quickStats.totalDownloads).toEqual(75); // sum of all downloads
  });

  it('should handle user with no uploaded papers', async () => {
    await setupTestData();

    // Create a new teacher with no uploaded papers
    await db.insert(usersTable).values({
      email: 'newteacher@test.edu',
      name: 'New Teacher',
      role: 'teacher',
      institution_id: 1
    }).execute();

    const result = await getDashboardData(4); // new teacher

    expect(result.user.name).toEqual('New Teacher');
    expect(result.recentPapers).toHaveLength(0);
    expect(result.quickStats.totalPapers).toEqual(0);
    expect(result.quickStats.totalDownloads).toEqual(0);
  });

  it('should calculate recent uploads correctly based on date', async () => {
    await setupTestData();

    // Create a recent paper (within last 30 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 15); // 15 days ago

    await db.insert(questionPapersTable).values({
      ...testQuestionPaper,
      title: 'Recent Paper',
      created_at: recentDate
    }).execute();

    // Create an old paper (older than 30 days)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45); // 45 days ago

    await db.insert(questionPapersTable).values({
      ...testQuestionPaper,
      title: 'Old Paper',
      created_at: oldDate
    }).execute();

    const result = await getDashboardData(3); // admin user

    // Should count recent papers correctly
    expect(result.quickStats.recentUploads).toBeGreaterThan(0);
    expect(result.quickStats.totalPapers).toEqual(4); // all papers regardless of date
  });

  it('should handle analytics with different metric types', async () => {
    await setupTestData();

    // Add more analytics with different metric types
    await db.insert(analyticsTable).values([
      {
        institution_id: 1,
        metric_type: 'active_users',
        value: 500,
        date: new Date()
      },
      {
        institution_id: 1,
        metric_type: 'system_health',
        value: 95,
        date: new Date()
      }
    ]).execute();

    const result = await getDashboardData(3); // admin user

    expect(result.analytics.length).toBeGreaterThanOrEqual(2);
    expect(result.analytics.some(a => a.metric_type === 'active_users')).toBe(true);
    expect(result.analytics.some(a => a.metric_type === 'system_health')).toBe(true);
  });

  it('should throw error for non-existent user', async () => {
    await setupTestData();

    await expect(getDashboardData(999)).rejects.toThrow(/User not found/i);
  });

  it('should handle edge case with zero testimonials', async () => {
    // Setup without testimonials
    await db.insert(institutionsTable).values(testInstitution).execute();
    await db.insert(usersTable).values(testStudentUser).execute();

    const result = await getDashboardData(1);

    expect(result.quickStats.collaborations).toEqual(0);
  });

  it('should properly order recent papers by creation date', async () => {
    await setupTestData();

    // Create papers with different dates
    const dates = [
      new Date('2023-01-01'),
      new Date('2023-06-01'),
      new Date('2023-12-01')
    ];

    for (let i = 0; i < dates.length; i++) {
      await db.insert(questionPapersTable).values({
        ...testQuestionPaper,
        title: `Paper ${i + 1}`,
        created_at: dates[i]
      }).execute();
    }

    const result = await getDashboardData(3); // admin sees all papers

    // Should be ordered by creation date descending
    for (let i = 0; i < result.recentPapers.length - 1; i++) {
      expect(result.recentPapers[i].created_at.getTime())
        .toBeGreaterThanOrEqual(result.recentPapers[i + 1].created_at.getTime());
    }
  });
});