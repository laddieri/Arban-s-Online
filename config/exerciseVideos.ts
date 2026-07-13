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
  /** Set on the user's own private recordings (practice log) */
  isPrivate?: boolean;
  /** user_videos row id, for deleting a private recording */
  myVideoId?: string;
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

  // Characteristic Studies (pages 285-298)
  285: [
    {
      videoId: "PgGyqddyFK0",
      title: "Paul Mayes plays Arban Study No.1",
      performer: "Paul Mayes",
      description: "Performance of Arban Study No.1"
    },
    {
      videoId: "GtntvrbGDxQ",
      title: "Arban Characteristic Study No. 1",
      description: "Performance of Characteristic Study No. 1"
    }
  ],

  286: [
    {
      videoId: "4V3mdUbS-Q0",
      title: "Arban Characteristic Study No. 2",
      description: "Performance of Characteristic Study No. 2"
    }
  ],

  298: [
    {
      videoId: "XP0I9-ch2zQ",
      title: "Arban Characteristic Study No. 14",
      description: "Performance of Characteristic Study No. 14"
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
