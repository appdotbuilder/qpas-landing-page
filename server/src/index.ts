import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createInstitutionInputSchema,
  getInstitutionsQuerySchema,
  createUserInputSchema,
  createQuestionPaperInputSchema,
  getQuestionPapersQuerySchema,
  createTestimonialInputSchema,
  getAnalyticsQuerySchema,
  userRoleSchema
} from './schema';

// Import handlers
import { getInstitutions } from './handlers/get_institutions';
import { createInstitution } from './handlers/create_institution';
import { getQuestionPapers } from './handlers/get_question_papers';
import { createQuestionPaper } from './handlers/create_question_paper';
import { getAnalytics } from './handlers/get_analytics';
import { getTestimonials } from './handlers/get_testimonials';
import { createTestimonial } from './handlers/create_testimonial';
import { getUsers } from './handlers/get_users';
import { createUser } from './handlers/create_user';
import { getDashboardData } from './handlers/get_dashboard_data';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Institution management endpoints
  getInstitutions: publicProcedure
    .input(getInstitutionsQuerySchema)
    .query(({ input }) => getInstitutions(input)),

  createInstitution: publicProcedure
    .input(createInstitutionInputSchema)
    .mutation(({ input }) => createInstitution(input)),

  // Question paper management endpoints
  getQuestionPapers: publicProcedure
    .input(getQuestionPapersQuerySchema)
    .query(({ input }) => getQuestionPapers(input)),

  createQuestionPaper: publicProcedure
    .input(createQuestionPaperInputSchema)
    .mutation(({ input }) => createQuestionPaper(input)),

  // User management endpoints
  getUsers: publicProcedure
    .input(z.object({
      institutionId: z.number().int().positive().optional(),
      role: userRoleSchema.optional()
    }))
    .query(({ input }) => getUsers(input.institutionId, input.role)),

  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Dashboard data for role-based UI previews
  getDashboardData: publicProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(({ input }) => getDashboardData(input.userId)),

  // Analytics endpoints for impact metrics
  getAnalytics: publicProcedure
    .input(getAnalyticsQuerySchema)
    .query(({ input }) => getAnalytics(input)),

  // Testimonial endpoints for social proof
  getTestimonials: publicProcedure
    .input(z.object({ institutionId: z.number().int().positive().optional() }))
    .query(({ input }) => getTestimonials(input.institutionId)),

  createTestimonial: publicProcedure
    .input(createTestimonialInputSchema)
    .mutation(({ input }) => createTestimonial(input)),

  // Featured endpoints for landing page content
  getFeaturedInstitutions: publicProcedure
    .query(() => getInstitutions({ limit: 6, offset: 0 })),

  getFeaturedTestimonials: publicProcedure
    .query(async () => {
      const testimonials = await getTestimonials();
      return testimonials.filter(t => t.is_featured);
    }),

  getSystemStats: publicProcedure
    .query(async () => {
      // Mock system-wide statistics for the hero section and impact metrics
      return {
        totalInstitutions: 150,
        totalPapers: 25000,
        totalDownloads: 500000,
        totalUsers: 12000,
        averageTimeSaved: 8.5, // hours per week
        successRate: 94, // percentage improvement in exam preparation
        collaborationSessions: 3200,
        institutionTypes: {
          universities: 45,
          colleges: 78,
          schools: 27
        }
      };
    }),

  // Demo request endpoint for landing page CTAs
  requestDemo: publicProcedure
    .input(z.object({
      institutionName: z.string().min(1),
      contactName: z.string().min(1),
      email: z.string().email(),
      role: z.string().min(1),
      phone: z.string().optional(),
      message: z.string().optional()
    }))
    .mutation(({ input }) => {
      // This is a placeholder for demo request handling
      // In real implementation, this would create a lead record,
      // send notifications to sales team, and trigger follow-up workflows
      console.log('Demo request received:', input);
      return {
        success: true,
        message: 'Thank you for your interest! Our team will contact you within 24 hours.',
        requestId: Math.random().toString(36).substring(7)
      };
    }),

  // Interactive onboarding preview endpoint
  getOnboardingSteps: publicProcedure
    .input(z.object({ role: userRoleSchema }))
    .query(({ input }) => {
      // Returns role-specific onboarding steps for the landing page preview
      const commonSteps = [
        {
          id: 1,
          title: 'Welcome to QPAS',
          description: 'Complete your profile and institution setup',
          completed: false
        },
        {
          id: 2,
          title: 'Explore the Platform',
          description: 'Take a guided tour of key features',
          completed: false
        }
      ];

      const roleSpecificSteps = {
        student: [
          {
            id: 3,
            title: 'Find Study Materials',
            description: 'Learn how to search and access question papers',
            completed: false
          },
          {
            id: 4,
            title: 'Organize Your Resources',
            description: 'Create collections and bookmark useful papers',
            completed: false
          }
        ],
        teacher: [
          {
            id: 3,
            title: 'Upload Your First Paper',
            description: 'Share your examination resources with students',
            completed: false
          },
          {
            id: 4,
            title: 'Set Up Collaboration',
            description: 'Connect with colleagues and enable resource sharing',
            completed: false
          }
        ],
        administrator: [
          {
            id: 3,
            title: 'Configure Institution Settings',
            description: 'Set up user roles and access permissions',
            completed: false
          },
          {
            id: 4,
            title: 'Review Analytics Dashboard',
            description: 'Monitor usage and engagement metrics',
            completed: false
          }
        ]
      };

      return {
        steps: [...commonSteps, ...roleSpecificSteps[input.role]],
        estimatedTime: input.role === 'administrator' ? '15 minutes' : '10 minutes'
      };
    })
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`🚀 QPAS API Server listening at port: ${port}`);
  console.log(`📚 Endpoints available for premium landing page integration`);
}

start();