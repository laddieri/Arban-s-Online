'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ExerciseVideo, getVideosForPage } from '@/config/exerciseVideos';

/**
 * Videos for a page: compiled-in ones (Arban's only), approved community
 * submissions, and the signed-in user's private recordings. Refetches when
 * the page changes; refreshVideos re-runs it after a submission/attach.
 */
export function useExerciseVideos(bookId: string, currentPage: number) {
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);

  // Rapid page changes can leave multiple requests in flight; only the
  // latest one may write state, or a slow stale response would overwrite
  // the current page's videos.
  const videosRequestRef = useRef(0);
  const refreshVideos = useCallback(async () => {
    const requestId = ++videosRequestRef.current;
    const isCurrent = () => videosRequestRef.current === requestId;
    const configVideos = bookId === 'arban' ? getVideosForPage(currentPage) : [];
    try {
      const [response, mineResponse] = await Promise.all([
        fetch(`/api/videos/${currentPage}?book=${bookId}`),
        // Private practice recordings; 401/503 for anonymous visitors
        fetch(`/api/my-videos?book=${bookId}&page=${currentPage}`).catch(() => null),
      ]);
      if (!isCurrent()) return;
      const myVideos: ExerciseVideo[] =
        mineResponse && mineResponse.ok ? (await mineResponse.json()).videos ?? [] : [];
      if (!isCurrent()) return;
      if (response.ok) {
        const data = await response.json();
        if (!isCurrent()) return;
        const apiVideos: ExerciseVideo[] = data.videos || [];
        // Merge config videos with API videos, avoiding duplicates by videoId
        const apiVideoIds = new Set(apiVideos.map((v: ExerciseVideo) => v.videoId));
        const uniqueConfigVideos = configVideos.filter(v => !apiVideoIds.has(v.videoId));
        setVideos([...uniqueConfigVideos, ...apiVideos, ...myVideos]);
      } else {
        setVideos([...configVideos, ...myVideos]);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      if (isCurrent()) setVideos(configVideos);
    }
  }, [currentPage, bookId]);

  useEffect(() => {
    refreshVideos();
  }, [refreshVideos]);

  const deletePrivateVideo = useCallback(async (myVideoId: string) => {
    try {
      const res = await fetch('/api/my-videos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: myVideoId }),
      });
      if (res.ok) refreshVideos();
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  }, [refreshVideos]);

  return { videos, refreshVideos, deletePrivateVideo };
}
