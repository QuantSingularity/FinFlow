import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  OAuthError,
} from "../../common/errors";
import config from "../../common/config";
import jwt from "jsonwebtoken";
import userService from "./user.service";
import { comparePassword, hashPassword } from "./utils/password.utils";
import {
  LoginDTO,
  RegisterDTO,
  RefreshTokenDTO,
  AuthTokens,
  TokenPayload,
  OAuthProviderType,
  OAuthLoginDTO,
} from "./auth.types";
import { User, UserCreateInput } from "./types/user.types";
import logger from "../../common/logger";
import { sendMessage } from "../../common/kafka";
import axios from "axios";
import { auditLog } from "./utils/audit.utils";

class AuthService {
  async register(registerDto: RegisterDTO): Promise<User & AuthTokens> {
    try {
      this.validatePasswordStrength(registerDto.password);
      const hashedPassword = await hashPassword(registerDto.password);
      const userData: UserCreateInput = {
        email: registerDto.email,
        hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      };
      const user = await userService.create(userData);
      const accessToken = this.generateAccessToken(user.id, user.role);
      const refreshToken = this.generateRefreshToken(user.id, user.role);
      await userService.updateRefreshToken(user.id, refreshToken);
      await this.publishUserCreatedEvent(user);
      await auditLog({
        action: "USER_REGISTER",
        userId: user.id,
        resourceType: "USER",
        resourceId: user.id,
        metadata: { email: user.email, ipAddress: registerDto.ipAddress },
      });
      return { ...user, accessToken, refreshToken };
    } catch (error) {
      logger.error("Error registering user: " + error);
      throw error;
    }
  }

  async login(loginDto: LoginDTO): Promise<User & AuthTokens> {
    try {
      const user = await userService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedError("Invalid credentials");
      }
      const isPasswordValid = await comparePassword(
        loginDto.password,
        user.hashedPassword || "",
      );
      if (!isPasswordValid) {
        await auditLog({
          action: "LOGIN_FAILED",
          resourceType: "USER",
          resourceId: user.id,
          metadata: {
            email: user.email,
            reason: "INVALID_PASSWORD",
            ipAddress: loginDto.ipAddress,
          },
        });
        throw new UnauthorizedError("Invalid credentials");
      }
      const accessToken = this.generateAccessToken(user.id, user.role);
      const refreshToken = this.generateRefreshToken(user.id, user.role);
      await userService.updateRefreshToken(user.id, refreshToken);
      await auditLog({
        action: "LOGIN_SUCCESS",
        userId: user.id,
        resourceType: "USER",
        resourceId: user.id,
        metadata: { email: user.email, ipAddress: loginDto.ipAddress },
      });
      return { ...user, accessToken, refreshToken };
    } catch (error) {
      logger.error("Error logging in user: " + error);
      throw error;
    }
  }

  async oauthLogin(oauthLoginDto: OAuthLoginDTO): Promise<User & AuthTokens> {
    try {
      const { provider, code, redirectUri, ipAddress } = oauthLoginDto;
      const profile = await this.getOAuthUserProfile(
        provider,
        code,
        redirectUri,
      );
      if (!profile || !profile.email) {
        throw new OAuthError("Failed to get user profile from OAuth provider");
      }
      let user = await userService.findByEmail(profile.email);
      if (!user) {
        const userData: UserCreateInput = {
          email: profile.email,
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          oauthProvider: provider,
          oauthId: profile.id,
        };
        user = await userService.create(userData);
        await this.publishUserCreatedEvent(user);
      } else if (!user.oauthProvider || user.oauthProvider !== provider) {
        user = await userService.update(user.id, {
          oauthProvider: provider,
          oauthId: profile.id,
        });
      }
      const accessToken = this.generateAccessToken(user.id, user.role);
      const refreshToken = this.generateRefreshToken(user.id, user.role);
      await userService.updateRefreshToken(user.id, refreshToken);
      await auditLog({
        action: "OAUTH_LOGIN",
        userId: user.id,
        resourceType: "USER",
        resourceId: user.id,
        metadata: { email: user.email, provider, ipAddress },
      });
      return { ...user, accessToken, refreshToken };
    } catch (error) {
      logger.error("Error in OAuth login: " + error);
      throw error;
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDTO): Promise<AuthTokens> {
    try {
      const { refreshToken, ipAddress } = refreshTokenDto;
      let decoded: TokenPayload;
      try {
        decoded = jwt.verify(refreshToken, config.jwt.secret) as TokenPayload;
      } catch {
        throw new UnauthorizedError("Invalid refresh token");
      }
      const user = await userService.findById(decoded.sub);
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedError("Invalid refresh token");
      }
      const accessToken = this.generateAccessToken(user.id, user.role);
      const newRefreshToken = this.generateRefreshToken(user.id, user.role);
      await userService.updateRefreshToken(user.id, newRefreshToken);
      await auditLog({
        action: "TOKEN_REFRESH_SUCCESS",
        userId: user.id,
        resourceType: "TOKEN",
        metadata: { ipAddress },
      });
      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      logger.error("Error refreshing token: " + error);
      throw error;
    }
  }

  async logout(userId: string, ipAddress?: string): Promise<void> {
    try {
      await userService.updateRefreshToken(userId, null);
      await auditLog({
        action: "LOGOUT",
        userId,
        resourceType: "USER",
        resourceId: userId,
        metadata: { ipAddress },
      });
    } catch (error) {
      logger.error("Error logging out user: " + error);
      throw error;
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const user = await userService.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }
      const isPasswordValid = await comparePassword(
        currentPassword,
        user.hashedPassword || "",
      );
      if (!isPasswordValid) {
        await auditLog({
          action: "PASSWORD_CHANGE_FAILED",
          userId,
          resourceType: "USER",
          resourceId: userId,
          metadata: { reason: "INVALID_CURRENT_PASSWORD", ipAddress },
        });
        throw new UnauthorizedError("Current password is incorrect");
      }
      this.validatePasswordStrength(newPassword);
      const hashedPassword = await hashPassword(newPassword);
      await userService.update(userId, { hashedPassword });
      await userService.updateRefreshToken(userId, null);
      await auditLog({
        action: "PASSWORD_CHANGED",
        userId,
        resourceType: "USER",
        resourceId: userId,
        metadata: { ipAddress },
      });
    } catch (error) {
      logger.error("Error changing password: " + error);
      throw error;
    }
  }

  private generateAccessToken(userId: string, role: string): string {
    return jwt.sign({ sub: userId, role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as any);
  }

  private generateRefreshToken(userId: string, role: string): string {
    return jwt.sign({ sub: userId, role }, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as any);
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestError("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestError(
        "Password must contain at least one uppercase letter",
      );
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestError(
        "Password must contain at least one lowercase letter",
      );
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestError("Password must contain at least one number");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new BadRequestError(
        "Password must contain at least one special character",
      );
    }
  }

  private async getOAuthUserProfile(
    provider: OAuthProviderType,
    code: string,
    redirectUri: string,
  ): Promise<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }> {
    switch (provider) {
      case OAuthProviderType.GOOGLE:
        return this.getGoogleUserProfile(code, redirectUri);
      case OAuthProviderType.GITHUB:
        return this.getGithubUserProfile(code, redirectUri);
      case OAuthProviderType.MICROSOFT:
        return this.getMicrosoftUserProfile(code, redirectUri);
      default:
        throw new BadRequestError("Unsupported OAuth provider: " + provider);
    }
  }

  private async getGoogleUserProfile(code: string, redirectUri: string) {
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      },
    );
    const { access_token } = tokenResponse.data;
    const profileResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: "Bearer " + access_token },
      },
    );
    const { sub, email, given_name, family_name } = profileResponse.data;
    return { id: sub, email, firstName: given_name, lastName: family_name };
  }

  private async getGithubUserProfile(code: string, redirectUri: string) {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      },
      { headers: { Accept: "application/json" } },
    );
    const { access_token } = tokenResponse.data;
    const profileResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: "token " + access_token },
    });
    const emailResponse = await axios.get(
      "https://api.github.com/user/emails",
      {
        headers: { Authorization: "token " + access_token },
      },
    );
    const primaryEmail = emailResponse.data.find((e: any) => e.primary)?.email;
    const { id, name } = profileResponse.data;
    let firstName, lastName;
    if (name) {
      const parts = name.split(" ");
      firstName = parts[0];
      lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    }
    return { id: id.toString(), email: primaryEmail, firstName, lastName };
  }

  private async getMicrosoftUserProfile(code: string, redirectUri: string) {
    const tokenResponse = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    const { access_token } = tokenResponse.data;
    const profileResponse = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: { Authorization: "Bearer " + access_token },
      },
    );
    const { id, mail, givenName, surname } = profileResponse.data;
    return { id, email: mail, firstName: givenName, lastName: surname };
  }

  private async publishUserCreatedEvent(user: User): Promise<void> {
    try {
      await sendMessage("user_created", {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      });
    } catch (error) {
      logger.error("Error publishing user_created event: " + error);
    }
  }
}

export default new AuthService();
