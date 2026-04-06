import dotenv from "dotenv";
import config from "./config";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import { PrismaClient } from "@prisma/client";
import { TokenPayload } from "./passport.types";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Configure JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.secret,
};

// JWT Strategy for authentication
const jwtStrategy = new JwtStrategy(
  jwtOptions,
  async (payload: TokenPayload, done) => {
    try {
      // Find user by ID from JWT payload
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  },
);

// Configure OAuth2 Strategy (example for Google)
const googleOAuth2Options = {
  authorizationURL: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenURL: "https://oauth2.googleapis.com/token",
  clientID: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  callbackURL:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:4000/auth/oauth2/redirect/google",
  scope: ["profile", "email"],
};

// OAuth2 Strategy for Google authentication
const googleOAuth2Strategy = new OAuth2Strategy(
  googleOAuth2Options,
  async (accessToken, refreshToken, profile, done) => {
    try {
      // This would be replaced with actual profile data from Google
      // For now, we're using a placeholder implementation
      const email = "user@example.com"; // In real implementation, extract from profile

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create new user from OAuth profile
        user = await prisma.user.create({
          data: {
            email,
            hashedPassword: "", // OAuth users don't have passwords
            role: "USER",
          },
        });
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  },
);

// Initialize Passport
export const initializePassport = (): void => {
  passport.use(jwtStrategy);

  // Only initialize OAuth if credentials are provided
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use("google", googleOAuth2Strategy);
  }
};

export default {
  passport,
  initializePassport,
};
