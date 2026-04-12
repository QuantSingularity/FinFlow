import { OAuthProviderType } from "./auth.types";

export interface User {
  id: string;
  email: string;
  hashedPassword?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  refreshToken?: string | null;
  oauthProvider?: OAuthProviderType | null;
  oauthId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  email: string;
  hashedPassword?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  oauthProvider?: OAuthProviderType | null;
  oauthId?: string | null;
}

export interface UserUpdateInput {
  email?: string;
  hashedPassword?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  refreshToken?: string | null;
  oauthProvider?: OAuthProviderType | null;
  oauthId?: string | null;
}

export interface UserPreference {
  id: string;
  userId: string;
  theme: string;
  language: string;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferenceCreateInput {
  userId: string;
  theme?: string;
  language?: string;
  notificationsEnabled?: boolean;
}

export interface UserPreferenceUpdateInput {
  theme?: string;
  language?: string;
  notificationsEnabled?: boolean;
}
