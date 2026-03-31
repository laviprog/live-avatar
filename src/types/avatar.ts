export interface Voice {
  id: string;
  name: string;
}

export interface Avatar {
  id: string;
  space_id: string;
  type: string;
  status: string;
  name: string;
  preview_url: string;
  is_expired: boolean;
  default_voice: Voice;
  created_at: string;
  updated_at: string;
  error_message: string;
}
