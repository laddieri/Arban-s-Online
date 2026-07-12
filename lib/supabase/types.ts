export type VideoSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface VideoSubmission {
  id: string;
  page_number: number;
  book_id: string;
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
  book_id?: string;
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
  book_id?: string;
  video_id: string;
  title: string;
  performer?: string;
  description?: string;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  page_number: number;
  book_id: string;
  created_at: string;
}

export interface UserFavoriteInsert {
  user_id: string;
  page_number: number;
  book_id?: string;
}

export interface UserList {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserListInsert {
  user_id: string;
  name: string;
}

export interface UserListUpdate {
  name?: string;
  updated_at?: string;
}

export interface UserListItem {
  id: string;
  list_id: string;
  page_number: number;
  book_id: string;
  title?: string;
  description?: string;
  /** User-defined order within the list */
  position: number;
  created_at: string;
  updated_at: string;
}

export interface UserListItemInsert {
  list_id: string;
  page_number: number;
  book_id?: string;
  title?: string;
  description?: string;
  position?: number;
}

export interface UserListItemUpdate {
  title?: string;
  description?: string;
  updated_at?: string;
}

export interface PageHistory {
  id: string;
  user_id: string;
  page_number: number;
  book_id: string;
  viewed_at: string;
}

export interface PageHistoryInsert {
  user_id: string;
  page_number: number;
  book_id?: string;
}
