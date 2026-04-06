import config from "../../../common/config";
import jwt from "jsonwebtoken";
import { TokenPayload } from "../auth.types";

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

export default { generateToken, verifyToken };
