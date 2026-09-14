export interface User {
  id: string;
  email: string;
  displayName: string;
  haloBadge?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Post {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorHalo?: string;
  authorAvatar?: string;
  createdAt: string;
  blessings: number;
  hasBlessed?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}
