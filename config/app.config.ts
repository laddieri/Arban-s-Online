// Application configuration
// Update these values to match your setup

export const appConfig = {
  // Cloudflare R2 bucket URL (or any other image hosting service)
  // Example: 'https://pub-xxxxx.r2.dev' or 'https://your-custom-domain.com'
  imageBaseUrl: process.env.NEXT_PUBLIC_IMAGE_BASE_URL || 'https://your-bucket.r2.dev',

  // Total number of pages in your Arban's Method book
  // Update this after converting your PDF to images
  totalPages: parseInt(process.env.NEXT_PUBLIC_TOTAL_PAGES || '350'),

  // Image format used (jpg, png, or webp)
  imageFormat: process.env.NEXT_PUBLIC_IMAGE_FORMAT || 'jpg',

  // Book metadata
  bookTitle: "Arban's Complete Method for Trumpet/Cornet",
  bookDescription: "Interactive e-book version of Arban's Complete Conservatory Method for Trumpet",
};
