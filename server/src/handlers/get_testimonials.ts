import { type Testimonial } from '../schema';

export async function getTestimonials(institutionId?: number): Promise<Testimonial[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching testimonials, optionally filtered by institution.
    // This powers the testimonial sections throughout the landing page.
    // Should return featured testimonials first, with support for video testimonials.
    // For the landing page, this provides the social proof and educator testimonials.
    
    return Promise.resolve([
        {
            id: 1,
            user_id: 1,
            institution_id: 1,
            content: "QPAS has revolutionized how we manage our examination resources. The time we save on organizing and finding past papers allows us to focus more on what matters - teaching and student success.",
            rating: 5,
            is_featured: true,
            video_url: "https://example.com/testimonials/video1.mp4",
            created_at: new Date()
        },
        {
            id: 2,
            user_id: 2,
            institution_id: 1,
            content: "As a student, having access to well-organized past papers has significantly improved my exam preparation. The search functionality is incredibly intuitive and saves me hours of research.",
            rating: 5,
            is_featured: true,
            video_url: null,
            created_at: new Date()
        },
        {
            id: 3,
            user_id: 3,
            institution_id: 2,
            content: "The collaborative features in QPAS have transformed how our faculty works together. We can now easily share resources and build upon each other's expertise.",
            rating: 5,
            is_featured: true,
            video_url: "https://example.com/testimonials/video3.mp4",
            created_at: new Date()
        },
        {
            id: 4,
            user_id: 4,
            institution_id: 1,
            content: "The security and role-based access controls give us complete confidence in managing sensitive academic materials. QPAS understands the unique needs of educational institutions.",
            rating: 5,
            is_featured: false,
            video_url: null,
            created_at: new Date()
        }
    ] as Testimonial[]);
}