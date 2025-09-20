import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { testimonialsTable, usersTable, institutionsTable } from '../db/schema';
import { type CreateTestimonialInput } from '../schema';
import { createTestimonial } from '../handlers/create_testimonial';
import { eq } from 'drizzle-orm';

describe('createTestimonial', () => {
  let testUser: any;
  let testInstitution: any;

  beforeEach(async () => {
    await createDB();

    // Create test institution first
    const institutionResult = await db.insert(institutionsTable)
      .values({
        name: 'Test University',
        type: 'university',
        location: 'Test City',
        established_year: 2000,
        total_students: 1000,
        total_faculty: 100
      })
      .returning()
      .execute();

    testInstitution = institutionResult[0];

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        role: 'student',
        institution_id: testInstitution.id
      })
      .returning()
      .execute();

    testUser = userResult[0];
  });

  afterEach(resetDB);

  const createTestInput = (overrides: Partial<CreateTestimonialInput> = {}): CreateTestimonialInput => ({
    user_id: testUser.id,
    institution_id: testInstitution.id,
    content: 'This platform has been incredibly helpful for my studies!',
    rating: 5,
    video_url: 'https://example.com/video.mp4',
    ...overrides
  });

  it('should create a testimonial with all fields', async () => {
    const input = createTestInput();
    const result = await createTestimonial(input);

    // Verify all fields are set correctly
    expect(result.user_id).toEqual(testUser.id);
    expect(result.institution_id).toEqual(testInstitution.id);
    expect(result.content).toEqual(input.content);
    expect(result.rating).toEqual(5);
    expect(result.video_url).toEqual(input.video_url);
    expect(result.is_featured).toEqual(false); // New testimonials start as not featured
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create testimonial without video_url', async () => {
    const input = createTestInput({ video_url: null });
    const result = await createTestimonial(input);

    expect(result.video_url).toBeNull();
    expect(result.content).toEqual(input.content);
    expect(result.rating).toEqual(5);
  });

  it('should save testimonial to database', async () => {
    const input = createTestInput();
    const result = await createTestimonial(input);

    // Query database to verify testimonial was saved
    const testimonials = await db.select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.id, result.id))
      .execute();

    expect(testimonials).toHaveLength(1);
    expect(testimonials[0].user_id).toEqual(testUser.id);
    expect(testimonials[0].institution_id).toEqual(testInstitution.id);
    expect(testimonials[0].content).toEqual(input.content);
    expect(testimonials[0].rating).toEqual(5);
    expect(testimonials[0].is_featured).toEqual(false);
    expect(testimonials[0].created_at).toBeInstanceOf(Date);
  });

  it('should create testimonials with different ratings', async () => {
    // Test various ratings
    const ratings = [1, 2, 3, 4, 5];
    
    for (const rating of ratings) {
      const input = createTestInput({ 
        rating,
        content: `Rating ${rating} testimonial` 
      });
      const result = await createTestimonial(input);
      
      expect(result.rating).toEqual(rating);
      expect(result.content).toEqual(`Rating ${rating} testimonial`);
    }
  });

  it('should fail when user does not exist', async () => {
    const input = createTestInput({ user_id: 99999 });

    await expect(createTestimonial(input))
      .rejects
      .toThrow(/User with id 99999 does not exist/);
  });

  it('should fail when institution does not exist', async () => {
    const input = createTestInput({ institution_id: 99999 });

    await expect(createTestimonial(input))
      .rejects
      .toThrow(/Institution with id 99999 does not exist/);
  });

  it('should handle long testimonial content', async () => {
    const longContent = 'A'.repeat(1000); // 1000 character testimonial
    const input = createTestInput({ content: longContent });
    
    const result = await createTestimonial(input);
    
    expect(result.content).toEqual(longContent);
    expect(result.content.length).toEqual(1000);
  });

  it('should create multiple testimonials from same user', async () => {
    const input1 = createTestInput({ 
      content: 'First testimonial',
      rating: 4
    });
    const input2 = createTestInput({ 
      content: 'Second testimonial',
      rating: 5
    });

    const result1 = await createTestimonial(input1);
    const result2 = await createTestimonial(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.content).toEqual('First testimonial');
    expect(result2.content).toEqual('Second testimonial');
    expect(result1.rating).toEqual(4);
    expect(result2.rating).toEqual(5);
  });
});