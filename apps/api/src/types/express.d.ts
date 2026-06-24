import type { CurrentUser } from '../auth/current-user';

declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser;
    }
  }
}
