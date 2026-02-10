/**
 * YouTube Video References for Arban's Method Exercises
 *
 * Maps page numbers to YouTube videos demonstrating those exercises.
 * Add new videos by including the YouTube video ID (the part after ?v= in the URL).
 *
 * Example: For https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * The video ID would be: dQw4w9WgXcQ
 */

export interface ExerciseVideo {
  videoId: string;
  title: string;
  performer?: string;
  description?: string;
}

/**
 * Maps page numbers to arrays of YouTube videos
 * Key: page number (matching the internal page numbering system)
 * Value: array of ExerciseVideo objects
 */
export const exerciseVideos: Record<number, ExerciseVideo[]> = {
  // Example entries demonstrating the feature
  // Replace these with actual YouTube video IDs for Arban's exercises

  // First Studies
  11: [
    {
      videoId: "dQw4w9WgXcQ", // Example YouTube video ID
      title: "Arban First Studies #1-6",
      performer: "Example Performer",
      description: "Demonstration of the first six exercises from Arban's Method"
    }
  ],

  // Clarke Technical Studies (page 159)
  159: [
    {
      videoId: "dQw4w9WgXcQ",
      title: "Clarke Technical Studies",
      performer: "Example Performer",
      description: "Technical studies for advanced players"
    }
  ],

  // Characteristic Study #1 (page 202)
  202: [
    {
      videoId: "dQw4w9WgXcQ",
      title: "Arban Characteristic Study #1",
      performer: "Example Performer",
      description: "First characteristic study"
    },
    {
      videoId: "dQw4w9WgXcQ",
      title: "Alternative Performance - Characteristic Study #1",
      performer: "Another Performer",
      description: "Different interpretation of the same study"
    }
  ],

  // Page 285
  285: [
    {
      videoId: "PgGyqddyFK0",
      title: "Paul Mayes plays Arban Study No.1",
      performer: "Paul Mayes",
      description: "Performance of Arban Study No.1"
    }
  ],

  // To add more videos:
  // 1. Find the page number where the exercise appears
  // 2. Get the YouTube video ID (the part after ?v= in the URL)
  // 3. Add an entry following the pattern above
  // 4. Multiple videos can be added for the same page
};

/**
 * Get videos for a specific page
 */
export function getVideosForPage(page: number): ExerciseVideo[] {
  return exerciseVideos[page] || [];
}

/**
 * Check if a page has associated videos
 */
export function hasVideos(page: number): boolean {
  return exerciseVideos[page] !== undefined && exerciseVideos[page].length > 0;
}
