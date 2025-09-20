import { db } from '../db';
import { 
  usersTable, 
  questionPapersTable, 
  analyticsTable,
  testimonialsTable
} from '../db/schema';
import { type User, type Analytics, type QuestionPaper } from '../schema';
import { eq, desc, count, sum, and, gte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

// Dashboard data interface for role-based views
export interface DashboardData {
  user: User;
  recentPapers: QuestionPaper[];
  analytics: Analytics[];
  quickStats: {
    totalPapers: number;
    totalDownloads: number;
    recentUploads: number;
    collaborations: number;
  };
}

export async function getDashboardData(userId: number): Promise<DashboardData> {
  try {
    // Get user information
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Get role-specific data
    let recentPapers: QuestionPaper[];
    let analytics: Analytics[];
    let quickStats: DashboardData['quickStats'];

    if (user.role === 'student') {
      // For students: recent public papers from their institution
      const papersResult = await db.select()
        .from(questionPapersTable)
        .where(
          and(
            eq(questionPapersTable.institution_id, user.institution_id),
            eq(questionPapersTable.is_public, true)
          )
        )
        .orderBy(desc(questionPapersTable.created_at))
        .limit(5)
        .execute();

      recentPapers = papersResult.map(paper => ({
        ...paper,
        tags: paper.tags as string[] | null
      }));

      // Student analytics - institution-wide metrics
      const analyticsResult = await db.select()
        .from(analyticsTable)
        .where(eq(analyticsTable.institution_id, user.institution_id))
        .orderBy(desc(analyticsTable.date))
        .limit(10)
        .execute();

      analytics = analyticsResult;

      // Student quick stats
      const totalPublicPapersResult = await db.select({ count: count() })
        .from(questionPapersTable)
        .where(
          and(
            eq(questionPapersTable.institution_id, user.institution_id),
            eq(questionPapersTable.is_public, true)
          )
        )
        .execute();

      const totalDownloadsResult = await db.select({ total: sum(questionPapersTable.download_count) })
        .from(questionPapersTable)
        .where(
          and(
            eq(questionPapersTable.institution_id, user.institution_id),
            eq(questionPapersTable.is_public, true)
          )
        )
        .execute();

      // Recent uploads in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentUploadsResult = await db.select({ count: count() })
        .from(questionPapersTable)
        .where(
          and(
            eq(questionPapersTable.institution_id, user.institution_id),
            eq(questionPapersTable.is_public, true),
            gte(questionPapersTable.created_at, thirtyDaysAgo)
          )
        )
        .execute();

      // Collaborations represented by testimonials count
      const collaborationsResult = await db.select({ count: count() })
        .from(testimonialsTable)
        .where(eq(testimonialsTable.institution_id, user.institution_id))
        .execute();

      quickStats = {
        totalPapers: totalPublicPapersResult[0]?.count ?? 0,
        totalDownloads: parseInt(totalDownloadsResult[0]?.total as string ?? '0'),
        recentUploads: recentUploadsResult[0]?.count ?? 0,
        collaborations: collaborationsResult[0]?.count ?? 0
      };

    } else if (user.role === 'teacher') {
      // For teachers: their uploaded papers
      const papersResult = await db.select()
        .from(questionPapersTable)
        .where(eq(questionPapersTable.uploaded_by, userId))
        .orderBy(desc(questionPapersTable.created_at))
        .limit(5)
        .execute();

      recentPapers = papersResult.map(paper => ({
        ...paper,
        tags: paper.tags as string[] | null
      }));

      // Teacher analytics - institution-wide metrics
      const analyticsResult = await db.select()
        .from(analyticsTable)
        .where(eq(analyticsTable.institution_id, user.institution_id))
        .orderBy(desc(analyticsTable.date))
        .limit(10)
        .execute();
      analytics = analyticsResult;

      // Teacher quick stats - their contributions
      const totalPapersResult = await db.select({ count: count() })
        .from(questionPapersTable)
        .where(eq(questionPapersTable.uploaded_by, userId))
        .execute();

      const totalDownloadsResult = await db.select({ total: sum(questionPapersTable.download_count) })
        .from(questionPapersTable)
        .where(eq(questionPapersTable.uploaded_by, userId))
        .execute();

      // Recent uploads in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentUploadsResult = await db.select({ count: count() })
        .from(questionPapersTable)
        .where(
          and(
            eq(questionPapersTable.uploaded_by, userId),
            gte(questionPapersTable.created_at, thirtyDaysAgo)
          )
        )
        .execute();

      // Teacher collaborations via testimonials at their institution
      const collaborationsResult = await db.select({ count: count() })
        .from(testimonialsTable)
        .where(eq(testimonialsTable.institution_id, user.institution_id))
        .execute();

      quickStats = {
        totalPapers: totalPapersResult[0]?.count ?? 0,
        totalDownloads: parseInt(totalDownloadsResult[0]?.total as string ?? '0'),
        recentUploads: recentUploadsResult[0]?.count ?? 0,
        collaborations: collaborationsResult[0]?.count ?? 0
      };

    } else { // administrator
      // For administrators: all papers in their institution
      const papersResult = await db.select()
        .from(questionPapersTable)
        .where(eq(questionPapersTable.institution_id, user.institution_id))
        .orderBy(desc(questionPapersTable.created_at))
        .limit(5)
        .execute();

      recentPapers = papersResult.map(paper => ({
        ...paper,
        tags: paper.tags as string[] | null
      }));

      // Administrator analytics - institution-wide
      const analyticsResult = await db.select()
        .from(analyticsTable)
        .where(eq(analyticsTable.institution_id, user.institution_id))
        .orderBy(desc(analyticsTable.date))
        .limit(10)
        .execute();

      analytics = analyticsResult;

      // Administrator quick stats - institution-wide
      const totalPapersResult = await db.select({ count: count() })
        .from(questionPapersTable)
        .where(eq(questionPapersTable.institution_id, user.institution_id))
        .execute();

      const totalDownloadsResult = await db.select({ total: sum(questionPapersTable.download_count) })
        .from(questionPapersTable)
        .where(eq(questionPapersTable.institution_id, user.institution_id))
        .execute();

      // Recent uploads in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentUploadsResult = await db.select({ count: count() })
        .from(questionPapersTable)
        .where(
          and(
            eq(questionPapersTable.institution_id, user.institution_id),
            gte(questionPapersTable.created_at, thirtyDaysAgo)
          )
        )
        .execute();

      const collaborationsResult = await db.select({ count: count() })
        .from(testimonialsTable)
        .where(eq(testimonialsTable.institution_id, user.institution_id))
        .execute();

      quickStats = {
        totalPapers: totalPapersResult[0]?.count ?? 0,
        totalDownloads: parseInt(totalDownloadsResult[0]?.total as string ?? '0'),
        recentUploads: recentUploadsResult[0]?.count ?? 0,
        collaborations: collaborationsResult[0]?.count ?? 0
      };
    }

    return {
      user,
      recentPapers,
      analytics,
      quickStats
    };

  } catch (error) {
    console.error('Dashboard data retrieval failed:', error);
    throw error;
  }
}