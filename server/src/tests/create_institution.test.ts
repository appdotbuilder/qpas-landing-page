import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { institutionsTable } from '../db/schema';
import { type CreateInstitutionInput } from '../schema';
import { createInstitution } from '../handlers/create_institution';
import { eq } from 'drizzle-orm';

// Test input with all fields
const fullTestInput: CreateInstitutionInput = {
  name: 'Test University',
  type: 'university',
  location: 'Test City, Test State',
  established_year: 1985,
  total_students: 15000,
  total_faculty: 800
};

// Test input with minimal fields
const minimalTestInput: CreateInstitutionInput = {
  name: 'Minimal College',
  type: 'college',
  location: null,
  established_year: null,
  total_students: null,
  total_faculty: null
};

describe('createInstitution', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an institution with all fields', async () => {
    const result = await createInstitution(fullTestInput);

    // Validate all fields
    expect(result.name).toEqual('Test University');
    expect(result.type).toEqual('university');
    expect(result.location).toEqual('Test City, Test State');
    expect(result.established_year).toEqual(1985);
    expect(result.total_students).toEqual(15000);
    expect(result.total_faculty).toEqual(800);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an institution with minimal required fields', async () => {
    const result = await createInstitution(minimalTestInput);

    // Validate required fields
    expect(result.name).toEqual('Minimal College');
    expect(result.type).toEqual('college');
    expect(result.location).toBeNull();
    expect(result.established_year).toBeNull();
    expect(result.total_students).toBeNull();
    expect(result.total_faculty).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save institution to database', async () => {
    const result = await createInstitution(fullTestInput);

    // Query database to verify institution was saved
    const institutions = await db.select()
      .from(institutionsTable)
      .where(eq(institutionsTable.id, result.id))
      .execute();

    expect(institutions).toHaveLength(1);
    expect(institutions[0].name).toEqual('Test University');
    expect(institutions[0].type).toEqual('university');
    expect(institutions[0].location).toEqual('Test City, Test State');
    expect(institutions[0].established_year).toEqual(1985);
    expect(institutions[0].total_students).toEqual(15000);
    expect(institutions[0].total_faculty).toEqual(800);
    expect(institutions[0].created_at).toBeInstanceOf(Date);
    expect(institutions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple institutions with unique IDs', async () => {
    const firstResult = await createInstitution({
      name: 'First University',
      type: 'university',
      location: null,
      established_year: null,
      total_students: null,
      total_faculty: null
    });

    const secondResult = await createInstitution({
      name: 'Second College',
      type: 'college',
      location: null,
      established_year: null,
      total_students: null,
      total_faculty: null
    });

    // Verify different IDs
    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.name).toEqual('First University');
    expect(secondResult.name).toEqual('Second College');
  });

  it('should handle various institution types', async () => {
    const schoolInput: CreateInstitutionInput = {
      name: 'Test High School',
      type: 'school',
      location: 'School District 1',
      established_year: 1995,
      total_students: 1200,
      total_faculty: 85
    };

    const result = await createInstitution(schoolInput);

    expect(result.name).toEqual('Test High School');
    expect(result.type).toEqual('school');
    expect(result.location).toEqual('School District 1');
    expect(result.established_year).toEqual(1995);
    expect(result.total_students).toEqual(1200);
    expect(result.total_faculty).toEqual(85);
  });
});