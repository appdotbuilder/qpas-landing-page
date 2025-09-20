import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { institutionsTable, analyticsTable } from '../db/schema';
import { type GetAnalyticsQuery } from '../schema';
import { getAnalytics } from '../handlers/get_analytics';

describe('getAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all analytics for an institution', async () => {
    // Create test institution
    const [institution] = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City'
      })
      .returning()
      .execute();

    // Create test analytics data
    const testAnalytics = [
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 100,
        date: new Date('2023-12-01')
      },
      {
        institution_id: institution.id,
        metric_type: 'downloads',
        value: 500,
        date: new Date('2023-12-01')
      },
      {
        institution_id: institution.id,
        metric_type: 'active_users',
        value: 25,
        date: new Date('2023-12-01')
      }
    ];

    await db.insert(analyticsTable)
      .values(testAnalytics)
      .execute();

    const query: GetAnalyticsQuery = {
      institution_id: institution.id
    };

    const results = await getAnalytics(query);

    expect(results).toHaveLength(3);
    
    // Verify all metrics are returned
    const metricTypes = results.map(r => r.metric_type);
    expect(metricTypes).toContain('papers_uploaded');
    expect(metricTypes).toContain('downloads');
    expect(metricTypes).toContain('active_users');

    // Verify values
    const papersMetric = results.find(r => r.metric_type === 'papers_uploaded');
    expect(papersMetric?.value).toEqual(100);
    expect(papersMetric?.institution_id).toEqual(institution.id);
    expect(papersMetric?.date).toBeInstanceOf(Date);
  });

  it('should filter analytics by metric type', async () => {
    // Create test institution
    const [institution] = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City'
      })
      .returning()
      .execute();

    // Create test analytics data with different metric types
    const testAnalytics = [
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 100,
        date: new Date('2023-12-01')
      },
      {
        institution_id: institution.id,
        metric_type: 'downloads',
        value: 500,
        date: new Date('2023-12-01')
      },
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 120,
        date: new Date('2023-12-02')
      }
    ];

    await db.insert(analyticsTable)
      .values(testAnalytics)
      .execute();

    const query: GetAnalyticsQuery = {
      institution_id: institution.id,
      metric_type: 'papers_uploaded'
    };

    const results = await getAnalytics(query);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.metric_type).toEqual('papers_uploaded');
      expect(result.institution_id).toEqual(institution.id);
    });

    // Verify specific values
    const values = results.map(r => r.value).sort();
    expect(values).toEqual([100, 120]);
  });

  it('should filter analytics by date range', async () => {
    // Create test institution
    const [institution] = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City'
      })
      .returning()
      .execute();

    // Create test analytics data with different dates
    const testAnalytics = [
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 100,
        date: new Date('2023-11-15') // Before range
      },
      {
        institution_id: institution.id,
        metric_type: 'downloads',
        value: 500,
        date: new Date('2023-12-01') // In range
      },
      {
        institution_id: institution.id,
        metric_type: 'active_users',
        value: 25,
        date: new Date('2023-12-15') // In range
      },
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 150,
        date: new Date('2024-01-01') // After range
      }
    ];

    await db.insert(analyticsTable)
      .values(testAnalytics)
      .execute();

    const query: GetAnalyticsQuery = {
      institution_id: institution.id,
      start_date: '2023-12-01',
      end_date: '2023-12-31'
    };

    const results = await getAnalytics(query);

    expect(results).toHaveLength(2);
    
    // Verify dates are within range
    results.forEach(result => {
      expect(result.date >= new Date('2023-12-01')).toBe(true);
      expect(result.date <= new Date('2023-12-31')).toBe(true);
    });

    // Verify correct metrics are returned
    const metricTypes = results.map(r => r.metric_type);
    expect(metricTypes).toContain('downloads');
    expect(metricTypes).toContain('active_users');
  });

  it('should filter by start date only', async () => {
    // Create test institution
    const [institution] = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City'
      })
      .returning()
      .execute();

    // Create test analytics data
    const testAnalytics = [
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 100,
        date: new Date('2023-11-15') // Before start date
      },
      {
        institution_id: institution.id,
        metric_type: 'downloads',
        value: 500,
        date: new Date('2023-12-01') // On start date
      },
      {
        institution_id: institution.id,
        metric_type: 'active_users',
        value: 25,
        date: new Date('2024-01-01') // After start date
      }
    ];

    await db.insert(analyticsTable)
      .values(testAnalytics)
      .execute();

    const query: GetAnalyticsQuery = {
      institution_id: institution.id,
      start_date: '2023-12-01'
    };

    const results = await getAnalytics(query);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.date >= new Date('2023-12-01')).toBe(true);
    });
  });

  it('should filter by end date only', async () => {
    // Create test institution
    const [institution] = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City'
      })
      .returning()
      .execute();

    // Create test analytics data
    const testAnalytics = [
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 100,
        date: new Date('2023-11-15') // Before end date
      },
      {
        institution_id: institution.id,
        metric_type: 'downloads',
        value: 500,
        date: new Date('2023-12-31') // On end date
      },
      {
        institution_id: institution.id,
        metric_type: 'active_users',
        value: 25,
        date: new Date('2024-01-15') // After end date
      }
    ];

    await db.insert(analyticsTable)
      .values(testAnalytics)
      .execute();

    const query: GetAnalyticsQuery = {
      institution_id: institution.id,
      end_date: '2023-12-31'
    };

    const results = await getAnalytics(query);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.date <= new Date('2023-12-31')).toBe(true);
    });
  });

  it('should combine all filters correctly', async () => {
    // Create test institution
    const [institution] = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City'
      })
      .returning()
      .execute();

    // Create test analytics data
    const testAnalytics = [
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 100,
        date: new Date('2023-12-01') // Matches all filters
      },
      {
        institution_id: institution.id,
        metric_type: 'downloads',
        value: 500,
        date: new Date('2023-12-01') // Wrong metric type
      },
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 120,
        date: new Date('2023-11-15') // Wrong date
      },
      {
        institution_id: institution.id,
        metric_type: 'papers_uploaded',
        value: 150,
        date: new Date('2023-12-15') // Matches all filters
      }
    ];

    await db.insert(analyticsTable)
      .values(testAnalytics)
      .execute();

    const query: GetAnalyticsQuery = {
      institution_id: institution.id,
      metric_type: 'papers_uploaded',
      start_date: '2023-12-01',
      end_date: '2023-12-31'
    };

    const results = await getAnalytics(query);

    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result.metric_type).toEqual('papers_uploaded');
      expect(result.institution_id).toEqual(institution.id);
      expect(result.date >= new Date('2023-12-01')).toBe(true);
      expect(result.date <= new Date('2023-12-31')).toBe(true);
    });

    // Verify specific values
    const values = results.map(r => r.value).sort();
    expect(values).toEqual([100, 150]);
  });

  it('should return empty array when no analytics match', async () => {
    // Create test institution
    const [institution] = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City'
      })
      .returning()
      .execute();

    const query: GetAnalyticsQuery = {
      institution_id: institution.id,
      metric_type: 'nonexistent_metric'
    };

    const results = await getAnalytics(query);

    expect(results).toHaveLength(0);
  });

  it('should only return analytics for specified institution', async () => {
    // Create two test institutions
    const [institution1] = await db.insert(institutionsTable)
      .values({
        name: 'Test University 1',
        type: 'university',
        location: 'Test City 1'
      })
      .returning()
      .execute();

    const [institution2] = await db.insert(institutionsTable)
      .values({
        name: 'Test University 2',
        type: 'university',
        location: 'Test City 2'
      })
      .returning()
      .execute();

    // Create analytics for both institutions
    await db.insert(analyticsTable)
      .values([
        {
          institution_id: institution1.id,
          metric_type: 'papers_uploaded',
          value: 100,
          date: new Date('2023-12-01')
        },
        {
          institution_id: institution2.id,
          metric_type: 'papers_uploaded',
          value: 200,
          date: new Date('2023-12-01')
        }
      ])
      .execute();

    const query: GetAnalyticsQuery = {
      institution_id: institution1.id
    };

    const results = await getAnalytics(query);

    expect(results).toHaveLength(1);
    expect(results[0].institution_id).toEqual(institution1.id);
    expect(results[0].value).toEqual(100);
  });
});