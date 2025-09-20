import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, institutionsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data - create a test institution first
  let testInstitutionId: number;

  beforeEach(async () => {
    // Create a test institution for user association
    const institutionResult = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City'
      })
      .returning()
      .execute();
    
    testInstitutionId = institutionResult[0].id;
  });

  const testInput: CreateUserInput = {
    email: 'test@example.com',
    name: 'John Doe',
    role: 'student',
    institution_id: 0 // Will be set in test
  };

  it('should create a user with valid input', async () => {
    const input = { ...testInput, institution_id: testInstitutionId };
    const result = await createUser(input);

    // Verify returned user data
    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('John Doe');
    expect(result.role).toBe('student');
    expect(result.institution_id).toBe(testInstitutionId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const input = { ...testInput, institution_id: testInstitutionId };
    const result = await createUser(input);

    // Verify user was saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('test@example.com');
    expect(users[0].name).toBe('John Doe');
    expect(users[0].role).toBe('student');
    expect(users[0].institution_id).toBe(testInstitutionId);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create users with different roles', async () => {
    const studentInput = { ...testInput, institution_id: testInstitutionId, role: 'student' as const };
    const teacherInput = { ...testInput, institution_id: testInstitutionId, email: 'teacher@example.com', role: 'teacher' as const };
    const adminInput = { ...testInput, institution_id: testInstitutionId, email: 'admin@example.com', role: 'administrator' as const };

    const studentResult = await createUser(studentInput);
    const teacherResult = await createUser(teacherInput);
    const adminResult = await createUser(adminInput);

    expect(studentResult.role).toBe('student');
    expect(teacherResult.role).toBe('teacher');
    expect(adminResult.role).toBe('administrator');
  });

  it('should throw error when institution does not exist', async () => {
    const input = { ...testInput, institution_id: 99999 };
    
    await expect(createUser(input)).rejects.toThrow(/institution not found/i);
  });

  it('should throw error when user with email already exists', async () => {
    const input = { ...testInput, institution_id: testInstitutionId };
    
    // Create first user
    await createUser(input);
    
    // Try to create second user with same email
    const duplicateInput = { ...input, name: 'Jane Doe' };
    await expect(createUser(duplicateInput)).rejects.toThrow(/user with this email already exists/i);
  });

  it('should allow different users at the same institution', async () => {
    const user1Input = { ...testInput, institution_id: testInstitutionId };
    const user2Input = { ...testInput, institution_id: testInstitutionId, email: 'user2@example.com', name: 'Jane Doe' };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    expect(user1.institution_id).toBe(testInstitutionId);
    expect(user2.institution_id).toBe(testInstitutionId);
    expect(user1.id).not.toBe(user2.id);
    expect(user1.email).not.toBe(user2.email);
  });
});