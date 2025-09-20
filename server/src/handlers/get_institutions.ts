import { db } from '../db';
import { institutionsTable } from '../db/schema';
import { type Institution, type GetInstitutionsQuery } from '../schema';
import { ilike, and, type SQL } from 'drizzle-orm';

export async function getInstitutions(query: GetInstitutionsQuery): Promise<Institution[]> {
  try {
    // Collect conditions for filtering
    const conditions: SQL<unknown>[] = [];

    // Apply search filter if provided
    if (query.search) {
      conditions.push(ilike(institutionsTable.name, `%${query.search}%`));
    }

    // Apply type filter if provided
    if (query.type) {
      conditions.push(ilike(institutionsTable.type, query.type));
    }

    // Build and execute query in one chain
    if (conditions.length > 0) {
      const results = await db.select()
        .from(institutionsTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(institutionsTable.name)
        .limit(query.limit)
        .offset(query.offset)
        .execute();
      
      return results;
    } else {
      const results = await db.select()
        .from(institutionsTable)
        .orderBy(institutionsTable.name)
        .limit(query.limit)
        .offset(query.offset)
        .execute();
      
      return results;
    }
  } catch (error) {
    console.error('Failed to fetch institutions:', error);
    throw error;
  }
}