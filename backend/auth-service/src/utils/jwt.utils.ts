import bcrypt from "bcryptjs";
import config from "../../../common/config";
import jwt from "jsonwebtoken";
import { TokenPayload } from "../auth.types";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (
  userId: string,
  role: string,
  expiresIn: string = config.jwt.expiresIn,
): string => {
  return jwt.sign({ sub: userId, role }, config.jwt.secret, {
    expiresIn,
  } as any);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
};

export default {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
