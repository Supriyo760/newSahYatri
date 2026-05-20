export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isOnboarded: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}
