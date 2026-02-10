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

  287: [
    {
      videoId: "P2f8Mh9oP2U",
      title: "Arban Characteristic Study No. 3",
      description: "Performance of Characteristic Study No. 3"
    }
  ],

  288: [
    {
      videoId: "p4vW9R9hPzo",
      title: "Arban Characteristic Study No. 4",
      description: "Performance of Characteristic Study No. 4"
    }
  ],

  289: [
    {
      videoId: "Y2Wp7I_uFio",
      title: "Arban Characteristic Study No. 5",
      description: "Performance of Characteristic Study No. 5"
    }
  ],

  290: [
    {
      videoId: "G6P8S1y0o-o",
      title: "Arban Characteristic Study No. 6",
      description: "Performance of Characteristic Study No. 6"
    }
  ],

  291: [
    {
      videoId: "hG9V0oVq8mE",
      title: "Arban Characteristic Study No. 7",
      description: "Performance of Characteristic Study No. 7"
    }
  ],

  292: [
    {
      videoId: "v_O6S5X1m1A",
      title: "Arban Characteristic Study No. 8",
      description: "Performance of Characteristic Study No. 8"
    }
  ],

  293: [
    {
      videoId: "mH4mB8A1u9s",
      title: "Arban Characteristic Study No. 9",
      description: "Performance of Characteristic Study No. 9"
    }
  ],

  294: [
    {
      videoId: "y3n5C5s9mI8",
      title: "Arban Characteristic Study No. 10",
      description: "Performance of Characteristic Study No. 10"
    }
  ],

  295: [
    {
      videoId: "E_n5N5s9mI8",
      title: "Arban Characteristic Study No. 11",
      description: "Performance of Characteristic Study No. 11"
    }
  ],

  296: [
    {
      videoId: "F_n5N5s9mI8",
      title: "Arban Characteristic Study No. 12",
      description: "Performance of Characteristic Study No. 12"
    }
  ],

  297: [
    {
      videoId: "G_n5N5s9mI8",
      title: "Arban Characteristic Study No. 13",
      description: "Performance of Characteristic Study No. 13"
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
