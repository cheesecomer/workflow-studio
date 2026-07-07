import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { DevUserMiddleware } from './dev-user.middleware';

describe('DevUserMiddleware', () => {
  describe('use', () => {
    it('injects development user into request', async () => {
      const prisma = {
        user: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'admin@example.com',
            name: 'Admin',
          }),
        },
      } as unknown as PrismaService;

      const middleware = new DevUserMiddleware(prisma);

      const req = {} as Request;
      const res = {} as Response;
      const next: NextFunction = jest.fn();

      await middleware.use(req, res, next);

      expect(req.user).toEqual({
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
      });
      expect(next).toHaveBeenCalled();
    });
  });
});
