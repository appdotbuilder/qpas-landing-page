import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { testimonialsTable, institutionsTable, usersTable } from '../db/schema';
import { getTestimonials } from '../handlers/get_testimonials';
import { eq } from 'drizzle-orm';

describe('getTestimonials', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test institutions
  const createTestInstitution = async (name: string) => {
    const result = await db.insert(institutionsTable)
      .values({
        name,
        type: 'university',
        location: 'Test City',
        established_year: 2000,
        total_students: 1000,
        total_faculty: 50
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test users
  const createTestUser = async (email: string, name: string, institutionId: number) => {
    const result = await db.insert(usersTable)
      .values({
        email,
        name,
        role: 'student',
        institution_id: institutionId
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test testimonials
  const createTestTestimonial = async (
    userId: number,
    institutionId: number,
    content: string,
    rating: number,
    isFeatured: boolean = false,
    videoUrl: string | null = null
  ) => {
    const result = await db.insert(testimonialsTable)
      .values({
        user_id: userId,
        institution_id: institutionId,
        content,
        rating,
        is_featured: isFeatured,
        video_url: videoUrl
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should return all testimonials when no institution filter is provided', async () => {
    // Create test institutions
    const institution1 = await createTestInstitution('Test University 1');
    const institution2 = await createTestInstitution('Test University 2');

    // Create test users
    const user1 = await createTestUser('user1@test.com', 'User One', institution1.id);
    const user2 = await createTestUser('user2@test.com', 'User Two', institution2.id);

    // Create testimonials
    await createTestTestimonial(user1.id, institution1.id, 'Great platform!', 5, true);
    await createTestTestimonial(user2.id, institution2.id, 'Very helpful for students.', 4, false);

    const result = await getTestimonials();

    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('Great platform!');
    expect(result[1].content).toBe('Very helpful for students.');
  });

  it('should filter testimonials by institution_id when provided', async () => {
    // Create test institutions
    const institution1 = await createTestInstitution('Test University 1');
    const institution2 = await createTestInstitution('Test University 2');

    // Create test users
    const user1 = await createTestUser('user1@test.com', 'User One', institution1.id);
    const user2 = await createTestUser('user2@test.com', 'User Two', institution2.id);

    // Create testimonials for different institutions
    await createTestTestimonial(user1.id, institution1.id, 'Great for Institution 1!', 5, true);
    await createTestTestimonial(user2.id, institution2.id, 'Great for Institution 2!', 4, false);

    const result = await getTestimonials(institution1.id);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Great for Institution 1!');
    expect(result[0].institution_id).toBe(institution1.id);
  });

  it('should order featured testimonials first, then by creation date', async () => {
    // Create test institution and user
    const institution = await createTestInstitution('Test University');
    const user = await createTestUser('user@test.com', 'Test User', institution.id);

    // Create testimonials with different featured status and timing
    // Create non-featured first (older)
    const nonFeatured = await createTestTestimonial(
      user.id,
      institution.id,
      'Regular testimonial',
      4,
      false
    );

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create featured testimonial (newer)
    const featured = await createTestTestimonial(
      user.id,
      institution.id,
      'Featured testimonial',
      5,
      true
    );

    const result = await getTestimonials();

    expect(result).toHaveLength(2);
    // Featured should come first despite being created later
    expect(result[0].content).toBe('Featured testimonial');
    expect(result[0].is_featured).toBe(true);
    expect(result[1].content).toBe('Regular testimonial');
    expect(result[1].is_featured).toBe(false);
  });

  it('should return empty array when no testimonials exist', async () => {
    const result = await getTestimonials();

    expect(result).toHaveLength(0);
  });

  it('should return empty array when filtering by non-existent institution', async () => {
    // Create test data for a different institution
    const institution = await createTestInstitution('Test University');
    const user = await createTestUser('user@test.com', 'Test User', institution.id);
    await createTestTestimonial(user.id, institution.id, 'Test testimonial', 5, true);

    // Query for non-existent institution
    const result = await getTestimonials(99999);

    expect(result).toHaveLength(0);
  });

  it('should include video testimonials with video_url', async () => {
    // Create test institution and user
    const institution = await createTestInstitution('Test University');
    const user = await createTestUser('user@test.com', 'Test User', institution.id);

    // Create testimonial with video URL
    await createTestTestimonial(
      user.id,
      institution.id,
      'Video testimonial content',
      5,
      true,
      'https://example.com/video.mp4'
    );

    const result = await getTestimonials();

    expect(result).toHaveLength(1);
    expect(result[0].video_url).toBe('https://example.com/video.mp4');
    expect(result[0].content).toBe('Video testimonial content');
  });

  it('should handle testimonials with null video_url', async () => {
    // Create test institution and user
    const institution = await createTestInstitution('Test University');
    const user = await createTestUser('user@test.com', 'Test User', institution.id);

    // Create testimonial without video URL
    await createTestTestimonial(
      user.id,
      institution.id,
      'Text-only testimonial',
      4,
      false,
      null
    );

    const result = await getTestimonials();

    expect(result).toHaveLength(1);
    expect(result[0].video_url).toBeNull();
    expect(result[0].content).toBe('Text-only testimonial');
  });

  it('should preserve all testimonial fields correctly', async () => {
    // Create test institution and user
    const institution = await createTestInstitution('Test University');
    const user = await createTestUser('user@test.com', 'Test User', institution.id);

    // Create a comprehensive testimonial
    const testimonialData = {
      user_id: user.id,
      institution_id: institution.id,
      content: 'Comprehensive testimonial content',
      rating: 5,
      is_featured: true,
      video_url: 'https://example.com/testimonial.mp4'
    };

    const created = await createTestTestimonial(
      testimonialData.user_id,
      testimonialData.institution_id,
      testimonialData.content,
      testimonialData.rating,
      testimonialData.is_featured,
      testimonialData.video_url
    );

    const result = await getTestimonials();

    expect(result).toHaveLength(1);
    const testimonial = result[0];

    expect(testimonial.id).toBeDefined();
    expect(testimonial.user_id).toBe(testimonialData.user_id);
    expect(testimonial.institution_id).toBe(testimonialData.institution_id);
    expect(testimonial.content).toBe(testimonialData.content);
    expect(testimonial.rating).toBe(testimonialData.rating);
    expect(testimonial.is_featured).toBe(testimonialData.is_featured);
    expect(testimonial.video_url).toBe(testimonialData.video_url);
    expect(testimonial.created_at).toBeInstanceOf(Date);
  });

  it('should verify testimonials are saved to database correctly', async () => {
    // Create test institution and user
    const institution = await createTestInstitution('Test University');
    const user = await createTestUser('user@test.com', 'Test User', institution.id);

    // Create testimonial via handler
    await createTestTestimonial(
      user.id,
      institution.id,
      'Database verification testimonial',
      5,
      true
    );

    const result = await getTestimonials();
    const testimonialId = result[0].id;

    // Verify in database directly
    const dbTestimonials = await db.select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.id, testimonialId))
      .execute();

    expect(dbTestimonials).toHaveLength(1);
    expect(dbTestimonials[0].content).toBe('Database verification testimonial');
    expect(dbTestimonials[0].rating).toBe(5);
    expect(dbTestimonials[0].is_featured).toBe(true);
  });
});