export type VideoSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface VideoSubmission {
  id: string;
  page_number: number;
  video_id: string;
  title: string;
  performer?: string;
  description?: string;
  submitted_by: string;
  status: VideoSubmissionStatus;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export interface VideoSubmissionInsert {
  page_number: number;
  video_id: string;
  title: string;
  performer?: string;
  description?: string;
  submitted_by: string;
  status?: VideoSubmissionStatus;
}

export interface ApprovedVideo {
  id: string;
  page_number: number;
  video_id: string;
  title: string;
  performer?: string;
  description?: string;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  page_number: number;
  created_at: string;
}

export interface UserFavoriteInsert {
  user_id: string;
  page_number: number;
}
