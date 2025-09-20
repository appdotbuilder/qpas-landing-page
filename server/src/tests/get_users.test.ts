import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, institutionsTable } from '../db/schema';
import { type CreateUserInput, type UserRole } from '../schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all users when no filters are provided', async () => {
    // Create test institution first
    const institutionResult = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City',
        established_year: 1900,
        total_students: 1000,
        total_faculty: 50
      })
      .returning()
      .execute();

    const institutionId = institutionResult[0].id;

    // Create test users
    await db.insert(usersTable)
      .values([
        {
          email: 'teacher@test.edu',
          name: 'Dr. Test Teacher',
          role: 'teacher',
          institution_id: institutionId
        },
        {
          email: 'student@test.edu',
          name: 'Test Student',
          role: 'student',
          institution_id: institutionId
        },
        {
          email: 'admin@test.edu',
          name: 'Test Admin',
          role: 'administrator',
          institution_id: institutionId
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    expect(result.map(u => u.role).sort()).toEqual(['administrator', 'student', 'teacher']);
    
    // Verify all expected fields are present
    const user = result[0];
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.institution_id).toBeDefined();
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should filter users by institution_id', async () => {
    // Create two test institutions
    const institutionResults = await db.insert(institutionsTable)
      .values([
        {
          name: 'University A',
          type: 'university',
          location: 'City A'
        },
        {
          name: 'University B',
          type: 'university',
          location: 'City B'
        }
      ])
      .returning()
      .execute();

    const [institutionA, institutionB] = institutionResults;

    // Create users for both institutions
    await db.insert(usersTable)
      .values([
        {
          email: 'user1@a.edu',
          name: 'User One',
          role: 'student',
          institution_id: institutionA.id
        },
        {
          email: 'user2@a.edu',
          name: 'User Two',
          role: 'teacher',
          institution_id: institutionA.id
        },
        {
          email: 'user3@b.edu',
          name: 'User Three',
          role: 'student',
          institution_id: institutionB.id
        }
      ])
      .execute();

    const result = await getUsers(institutionA.id);

    expect(result).toHaveLength(2);
    expect(result.every(user => user.institution_id === institutionA.id)).toBe(true);
    expect(result.map(u => u.email).sort()).toEqual(['user1@a.edu', 'user2@a.edu']);
  });

  it('should filter users by role', async () => {
    // Create test institution
    const institutionResult = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university'
      })
      .returning()
      .execute();

    const institutionId = institutionResult[0].id;

    // Create users with different roles
    await db.insert(usersTable)
      .values([
        {
          email: 'teacher1@test.edu',
          name: 'Teacher One',
          role: 'teacher',
          institution_id: institutionId
        },
        {
          email: 'teacher2@test.edu',
          name: 'Teacher Two',
          role: 'teacher',
          institution_id: institutionId
        },
        {
          email: 'student1@test.edu',
          name: 'Student One',
          role: 'student',
          institution_id: institutionId
        },
        {
          email: 'admin1@test.edu',
          name: 'Admin One',
          role: 'administrator',
          institution_id: institutionId
        }
      ])
      .execute();

    const result = await getUsers(undefined, 'teacher');

    expect(result).toHaveLength(2);
    expect(result.every(user => user.role === 'teacher')).toBe(true);
    expect(result.map(u => u.name).sort()).toEqual(['Teacher One', 'Teacher Two']);
  });

  it('should filter users by both institution_id and role', async () => {
    // Create two test institutions
    const institutionResults = await db.insert(institutionsTable)
      .values([
        {
          name: 'University A',
          type: 'university'
        },
        {
          name: 'University B',
          type: 'university'
        }
      ])
      .returning()
      .execute();

    const [institutionA, institutionB] = institutionResults;

    // Create users for both institutions with various roles
    await db.insert(usersTable)
      .values([
        {
          email: 'teacher1@a.edu',
          name: 'Teacher at A',
          role: 'teacher',
          institution_id: institutionA.id
        },
        {
          email: 'student1@a.edu',
          name: 'Student at A',
          role: 'student',
          institution_id: institutionA.id
        },
        {
          email: 'teacher1@b.edu',
          name: 'Teacher at B',
          role: 'teacher',
          institution_id: institutionB.id
        },
        {
          email: 'admin1@a.edu',
          name: 'Admin at A',
          role: 'administrator',
          institution_id: institutionA.id
        }
      ])
      .execute();

    const result = await getUsers(institutionA.id, 'teacher');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Teacher at A');
    expect(result[0].role).toBe('teacher');
    expect(result[0].institution_id).toBe(institutionA.id);
  });

  it('should return empty array when no users match filters', async () => {
    // Create test institution
    const institutionResult = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university'
      })
      .returning()
      .execute();

    const institutionId = institutionResult[0].id;

    // Create only student users
    await db.insert(usersTable)
      .values([
        {
          email: 'student1@test.edu',
          name: 'Student One',
          role: 'student',
          institution_id: institutionId
        }
      ])
      .execute();

    // Search for teachers - should return empty
    const result = await getUsers(institutionId, 'teacher');

    expect(result).toHaveLength(0);
  });

  it('should return empty array when institution has no users', async () => {
    // Create test institution but no users
    const institutionResult = await db.insert(institutionsTable)
      .values({
        name: 'Empty University',
        type: 'university'
      })
      .returning()
      .execute();

    const result = await getUsers(institutionResult[0].id);

    expect(result).toHaveLength(0);
  });

  it('should handle non-existent institution_id gracefully', async () => {
    const result = await getUsers(99999); // Non-existent institution

    expect(result).toHaveLength(0);
  });

  it('should handle all role types correctly', async () => {
    // Create test institution
    const institutionResult = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university'
      })
      .returning()
      .execute();

    const institutionId = institutionResult[0].id;

    // Test each role type
    const roles: UserRole[] = ['student', 'teacher', 'administrator'];
    
    for (const role of roles) {
      await db.insert(usersTable)
        .values({
          email: `${role}@test.edu`,
          name: `Test ${role}`,
          role: role,
          institution_id: institutionId
        })
        .execute();

      const result = await getUsers(undefined, role);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe(role);
    }
  });
});