export interface Voice {
  id: string;
  name: string;
}

export interface Avatar {
  id: string;
  space_id: string | null;
  type: string;
  status: string;
  name: string;
  preview_url: string;
  is_expired: boolean;
  default_voice: Voice;
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

export interface AvatarPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: Avatar[];
}

export type AvatarSource = 'personal' | 'public';
