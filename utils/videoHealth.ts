// Pure classification for the admin video health check: compares the video
// ids we asked YouTube about with what videos.list returned. Kept free of
// fetch/IO so it is unit-testable; the API route does the batching.

export interface YouTubeVideoStatusItem {
  id: string;
  status?: {
    privacyStatus?: string;
    uploadStatus?: string;
    embeddable?: boolean;
  };
}

export type VideoProblem =
  | 'unavailable' // deleted or made private: YouTube omits it entirely
  | 'embedding disabled'
  | 'upload failed';

/** Map of videoId -> problem for every requested id that isn't healthy. */
export function classifyVideoHealth(
  requestedIds: string[],
  items: YouTubeVideoStatusItem[]
): Map<string, VideoProblem> {
  const byId = new Map(items.map(item => [item.id, item]));
  const problems = new Map<string, VideoProblem>();

  for (const id of requestedIds) {
    const item = byId.get(id);
    if (!item) {
      // Deleted and private videos are simply absent from the response
      problems.set(id, 'unavailable');
      continue;
    }
    const status = item.status ?? {};
    if (status.uploadStatus === 'failed' || status.uploadStatus === 'rejected') {
      problems.set(id, 'upload failed');
    } else if (status.embeddable === false) {
      problems.set(id, 'embedding disabled');
    }
    // note: 'unlisted' is fine - unlisted videos embed normally
  }

  return problems;
}
