import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import type { Role } from "@prisma/client";

export type AccessPayload = {
  sub: string;
  role: Role;
  name: string;
  email: string;
  type: "access";
};

export type RefreshPayload = {
  sub: string;
  jti: string;
  type: "refresh";
};

export function signAccessToken(user: { id: string; role: Role; name: string; email: string }) {
  const payload: AccessPayload = {
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    type: "access",
  };
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl } as jwt.SignOptions);
}

export function signRefreshToken(userId: string, jti: string) {
  const payload: RefreshPayload = { sub: userId, jti, type: "refresh" };
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenTtlDays}d`,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.jwtAccessSecret) as AccessPayload;
  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, env.jwtRefreshSecret) as RefreshPayload;
  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newRefreshId(): string {
  return crypto.randomUUID();
}
