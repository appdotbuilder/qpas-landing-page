import { serial, text, pgTable, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'administrator']);

// Institutions table
export const institutionsTable = pgTable('institutions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // university, college, school, etc.
  location: text('location'),
  established_year: integer('established_year'),
  total_students: integer('total_students'),
  total_faculty: integer('total_faculty'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  institution_id: integer('institution_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Subjects table
export const subjectsTable = pgTable('subjects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  institution_id: integer('institution_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Question papers table
export const questionPapersTable = pgTable('question_papers', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subject_id: integer('subject_id').notNull(),
  institution_id: integer('institution_id').notNull(),
  uploaded_by: integer('uploaded_by').notNull(),
  exam_year: integer('exam_year').notNull(),
  exam_type: text('exam_type').notNull(), // midterm, final, quiz, etc.
  difficulty_level: text('difficulty_level'),
  file_url: text('file_url').notNull(),
  file_size: integer('file_size').notNull(),
  download_count: integer('download_count').notNull().default(0),
  is_public: boolean('is_public').notNull().default(false),
  tags: jsonb('tags'), // Array of strings stored as JSONB
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Analytics table for tracking metrics
export const analyticsTable = pgTable('analytics', {
  id: serial('id').primaryKey(),
  institution_id: integer('institution_id').notNull(),
  metric_type: text('metric_type').notNull(), // papers_uploaded, downloads, active_users, etc.
  value: integer('value').notNull(),
  date: timestamp('date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Testimonials table
export const testimonialsTable = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  institution_id: integer('institution_id').notNull(),
  content: text('content').notNull(),
  rating: integer('rating').notNull(), // 1-5 scale
  is_featured: boolean('is_featured').notNull().default(false),
  video_url: text('video_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const institutionsRelations = relations(institutionsTable, ({ many }) => ({
  users: many(usersTable),
  subjects: many(subjectsTable),
  questionPapers: many(questionPapersTable),
  analytics: many(analyticsTable),
  testimonials: many(testimonialsTable),
}));

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  institution: one(institutionsTable, {
    fields: [usersTable.institution_id],
    references: [institutionsTable.id],
  }),
  uploadedPapers: many(questionPapersTable),
  testimonials: many(testimonialsTable),
}));

export const subjectsRelations = relations(subjectsTable, ({ one, many }) => ({
  institution: one(institutionsTable, {
    fields: [subjectsTable.institution_id],
    references: [institutionsTable.id],
  }),
  questionPapers: many(questionPapersTable),
}));

export const questionPapersRelations = relations(questionPapersTable, ({ one }) => ({
  subject: one(subjectsTable, {
    fields: [questionPapersTable.subject_id],
    references: [subjectsTable.id],
  }),
  institution: one(institutionsTable, {
    fields: [questionPapersTable.institution_id],
    references: [institutionsTable.id],
  }),
  uploadedBy: one(usersTable, {
    fields: [questionPapersTable.uploaded_by],
    references: [usersTable.id],
  }),
}));

export const analyticsRelations = relations(analyticsTable, ({ one }) => ({
  institution: one(institutionsTable, {
    fields: [analyticsTable.institution_id],
    references: [institutionsTable.id],
  }),
}));

export const testimonialsRelations = relations(testimonialsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [testimonialsTable.user_id],
    references: [usersTable.id],
  }),
  institution: one(institutionsTable, {
    fields: [testimonialsTable.institution_id],
    references: [institutionsTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  institutions: institutionsTable,
  users: usersTable,
  subjects: subjectsTable,
  questionPapers: questionPapersTable,
  analytics: analyticsTable,
  testimonials: testimonialsTable,
};

// TypeScript types for table schemas
export type Institution = typeof institutionsTable.$inferSelect;
export type NewInstitution = typeof institutionsTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Subject = typeof subjectsTable.$inferSelect;
export type NewSubject = typeof subjectsTable.$inferInsert;
export type QuestionPaper = typeof questionPapersTable.$inferSelect;
export type NewQuestionPaper = typeof questionPapersTable.$inferInsert;
export type Analytics = typeof analyticsTable.$inferSelect;
export type NewAnalytics = typeof analyticsTable.$inferInsert;
export type Testimonial = typeof testimonialsTable.$inferSelect;
export type NewTestimonial = typeof testimonialsTable.$inferInsert;