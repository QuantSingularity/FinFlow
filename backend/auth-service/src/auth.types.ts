import { Role } from "@prisma/client";

export enum OAuthProviderType {
  GOOGLE = "GOOGLE",
  GITHUB = "GITHUB",
  MICROSOFT = "MICROSOFT",
}

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
}

export interface TokenPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  ipAddress?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
  ipAddress?: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
  ipAddress?: string;
}

export interface OAuthLoginDTO {
  provider: OAuthProviderType;
  code: string;
  redirectUri: string;
  ipAddress?: string;
}
