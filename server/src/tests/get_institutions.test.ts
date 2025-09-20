import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { institutionsTable } from '../db/schema';
import { type GetInstitutionsQuery } from '../schema';
import { getInstitutions } from '../handlers/get_institutions';

// Test institutions data
const testInstitutions = [
  {
    name: 'Harvard University',
    type: 'university',
    location: 'Cambridge, MA',
    established_year: 1636,
    total_students: 23000,
    total_faculty: 2400
  },
  {
    name: 'Stanford University',
    type: 'university',
    location: 'Stanford, CA',
    established_year: 1885,
    total_students: 17000,
    total_faculty: 2200
  },
  {
    name: 'MIT College',
    type: 'college',
    location: 'Cambridge, MA',
    established_year: 1861,
    total_students: 11000,
    total_faculty: 1000
  },
  {
    name: 'Berkeley High School',
    type: 'school',
    location: 'Berkeley, CA',
    established_year: 1880,
    total_students: 3000,
    total_faculty: 200
  }
];

describe('getInstitutions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch all institutions with default pagination', async () => {
    // Create test institutions
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      limit: 20,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(4);
    // Results should be ordered by name
    expect(result[0].name).toEqual('Berkeley High School');
    expect(result[1].name).toEqual('Harvard University');
    expect(result[2].name).toEqual('MIT College');
    expect(result[3].name).toEqual('Stanford University');
    
    // Verify all fields are present
    result.forEach(institution => {
      expect(institution.id).toBeDefined();
      expect(institution.name).toBeDefined();
      expect(institution.type).toBeDefined();
      expect(institution.created_at).toBeInstanceOf(Date);
      expect(institution.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter institutions by search term', async () => {
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      search: 'Harvard',
      limit: 20,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Harvard University');
  });

  it('should filter institutions by search term case-insensitively', async () => {
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      search: 'stanford',
      limit: 20,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Stanford University');
  });

  it('should filter institutions by partial search term', async () => {
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      search: 'University',
      limit: 20,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(2);
    expect(result.map(i => i.name)).toEqual(['Harvard University', 'Stanford University']);
  });

  it('should filter institutions by type', async () => {
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      type: 'university',
      limit: 20,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(2);
    result.forEach(institution => {
      expect(institution.type).toEqual('university');
    });
  });

  it('should filter institutions by type case-insensitively', async () => {
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      type: 'COLLEGE',
      limit: 20,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(1);
    expect(result[0].type).toEqual('college');
  });

  it('should combine search and type filters', async () => {
    await db.insert(institutionsTable).values([
      ...testInstitutions,
      {
        name: 'Harvard College',
        type: 'college',
        location: 'Cambridge, MA',
        established_year: 1650,
        total_students: 5000,
        total_faculty: 500
      }
    ]).execute();

    const query: GetInstitutionsQuery = {
      search: 'Harvard',
      type: 'college',
      limit: 20,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Harvard College');
    expect(result[0].type).toEqual('college');
  });

  it('should apply pagination with limit', async () => {
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      limit: 2,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Berkeley High School');
    expect(result[1].name).toEqual('Harvard University');
  });

  it('should apply pagination with offset', async () => {
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      limit: 2,
      offset: 2
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('MIT College');
    expect(result[1].name).toEqual('Stanford University');
  });

  it('should return empty array when no institutions match filters', async () => {
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      search: 'Nonexistent University',
      limit: 20,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when offset exceeds available results', async () => {
    await db.insert(institutionsTable).values(testInstitutions).execute();

    const query: GetInstitutionsQuery = {
      limit: 20,
      offset: 100
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(0);
  });

  it('should handle institutions with null fields correctly', async () => {
    await db.insert(institutionsTable).values([
      {
        name: 'Test Institution',
        type: 'university',
        location: null,
        established_year: null,
        total_students: null,
        total_faculty: null
      }
    ]).execute();

    const query: GetInstitutionsQuery = {
      limit: 20,
      offset: 0
    };

    const result = await getInstitutions(query);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Test Institution');
    expect(result[0].location).toBeNull();
    expect(result[0].established_year).toBeNull();
    expect(result[0].total_students).toBeNull();
    expect(result[0].total_faculty).toBeNull();
  });
});