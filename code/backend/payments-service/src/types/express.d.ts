// Extend Express Request type to include user property
declare namespace Express {
  export interface Request {
    user: {
      sub: string;
      [key: string]: any;
    };
  }
}
