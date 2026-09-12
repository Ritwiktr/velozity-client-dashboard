import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { unauthorized, forbidden } from "../lib/errors.js";
import { verifyAccessToken, type AccessPayload } from "../lib/jwt.js";

export type AuthedRequest = Request & { user: AccessPayload };

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      throw unauthorized();
    }
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw unauthorized("Account no longer exists");
    }
    (req as AuthedRequest).user = payload;
    next();
  } catch (err) {
    if (err instanceof Error && (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")) {
      next(unauthorized("Invalid or expired access token"));
      return;
    }
    next(err);
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthedRequest).user;
    if (!user) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(user.role)) {
      next(forbidden("Insufficient role permissions"));
      return;
    }
    next();
  };
}

export function getUser(req: Request): AccessPayload {
  const user = (req as AuthedRequest).user;
  if (!user) {
    throw unauthorized();
  }
  return user;
}
