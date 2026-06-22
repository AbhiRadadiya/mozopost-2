import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../auth/jwt';

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

/** Wraps an async route handler so thrown errors reach the error middleware. */
export function ah(fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('[unhandled error]', err);
  return res.status(500).json({ error: 'Internal server error' });
}
