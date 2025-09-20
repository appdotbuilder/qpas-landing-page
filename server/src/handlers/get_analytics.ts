import { db } from '../db';
import { analyticsTable } from '../db/schema';
import { type Analytics, type GetAnalyticsQuery } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export const getAnalytics = async (query: GetAnalyticsQuery): Promise<Analytics[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Always filter by institution_id (required)
    conditions.push(eq(analyticsTable.institution_id, query.institution_id));

    // Filter by metric_type if provided
    if (query.metric_type) {
      conditions.push(eq(analyticsTable.metric_type, query.metric_type));
    }

    // Filter by date range if provided
    if (query.start_date) {
      const startDate = new Date(query.start_date);
      conditions.push(gte(analyticsTable.date, startDate));
    }

    if (query.end_date) {
      const endDate = new Date(query.end_date);
      conditions.push(lte(analyticsTable.date, endDate));
    }

    // Build and execute query
    const results = await db.select()
      .from(analyticsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    return results;
  } catch (error) {
    console.error('Analytics retrieval failed:', error);
    throw error;
  }
};