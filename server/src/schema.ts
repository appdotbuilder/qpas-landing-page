import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['student', 'teacher', 'administrator']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  institution_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// Institution schema
export const institutionSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(), // university, college, school, etc.
  location: z.string().nullable(),
  established_year: z.number().int().nullable(),
  total_students: z.number().int().nullable(),
  total_faculty: z.number().int().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Institution = z.infer<typeof institutionSchema>;

// Subject schema
export const subjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  institution_id: z.number(),
  created_at: z.coerce.date()
});
export type Subject = z.infer<typeof subjectSchema>;

// Question paper schema
export const questionPaperSchema = z.object({
  id: z.number(),
  title: z.string(),
  subject_id: z.number(),
  institution_id: z.number(),
  uploaded_by: z.number(),
  exam_year: z.number().int(),
  exam_type: z.string(), // midterm, final, quiz, etc.
  difficulty_level: z.string().nullable(),
  file_url: z.string(),
  file_size: z.number(),
  download_count: z.number().int(),
  is_public: z.boolean(),
  tags: z.array(z.string()).nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type QuestionPaper = z.infer<typeof questionPaperSchema>;

// Analytics schema for tracking usage
export const analyticsSchema = z.object({
  id: z.number(),
  institution_id: z.number(),
  metric_type: z.string(), // papers_uploaded, downloads, active_users, etc.
  value: z.number(),
  date: z.coerce.date(),
  created_at: z.coerce.date()
});
export type Analytics = z.infer<typeof analyticsSchema>;

// Testimonial schema
export const testimonialSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  institution_id: z.number(),
  content: z.string(),
  rating: z.number().int().min(1).max(5),
  is_featured: z.boolean(),
  video_url: z.string().nullable(),
  created_at: z.coerce.date()
});
export type Testimonial = z.infer<typeof testimonialSchema>;

// Input schemas for creating records
export const createInstitutionInputSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  location: z.string().nullable(),
  established_year: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  total_students: z.number().int().nonnegative().nullable(),
  total_faculty: z.number().int().nonnegative().nullable()
});
export type CreateInstitutionInput = z.infer<typeof createInstitutionInputSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema,
  institution_id: z.number().int().positive()
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createQuestionPaperInputSchema = z.object({
  title: z.string().min(1),
  subject_id: z.number().int().positive(),
  institution_id: z.number().int().positive(),
  uploaded_by: z.number().int().positive(),
  exam_year: z.number().int().min(2000),
  exam_type: z.string().min(1),
  difficulty_level: z.string().nullable(),
  file_url: z.string().url(),
  file_size: z.number().positive(),
  is_public: z.boolean(),
  tags: z.array(z.string()).nullable()
});
export type CreateQuestionPaperInput = z.infer<typeof createQuestionPaperInputSchema>;

export const createTestimonialInputSchema = z.object({
  user_id: z.number().int().positive(),
  institution_id: z.number().int().positive(),
  content: z.string().min(10),
  rating: z.number().int().min(1).max(5),
  video_url: z.string().url().nullable()
});
export type CreateTestimonialInput = z.infer<typeof createTestimonialInputSchema>;

// Query schemas for filtering and search
export const getQuestionPapersQuerySchema = z.object({
  institution_id: z.number().int().positive().optional(),
  subject_id: z.number().int().positive().optional(),
  exam_year: z.number().int().optional(),
  exam_type: z.string().optional(),
  search: z.string().optional(),
  is_public: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
});
export type GetQuestionPapersQuery = z.infer<typeof getQuestionPapersQuerySchema>;

export const getInstitutionsQuerySchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
});
export type GetInstitutionsQuery = z.infer<typeof getInstitutionsQuerySchema>;

export const getAnalyticsQuerySchema = z.object({
  institution_id: z.number().int().positive(),
  metric_type: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional()
});
export type GetAnalyticsQuery = z.infer<typeof getAnalyticsQuerySchema>;