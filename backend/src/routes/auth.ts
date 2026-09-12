import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { loginSchema } from "../lib/validators.js";
import { unauthorized } from "../lib/errors.js";
import {
  hashToken,
  newRefreshId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from "../lib/cookies.js";
import { env } from "../config.js";
import { requireAuth, getUser } from "../middleware/auth.js";

export const authRouter = Router();

async function issueSession(
  user: { id: string; role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER"; name: string; email: string },
  res: Parameters<typeof setRefreshCookie>[0],
) {
  const accessToken = signAccessToken(user);
  const jti = newRefreshId();
  const refreshToken = signRefreshToken(user.id, jti);
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });
  setRefreshCookie(res, refreshToken);
  return accessToken;
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) {
      throw unauthorized("Invalid email or password");
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      throw unauthorized("Invalid email or password");
    }
    const accessToken = await issueSession(user, res);
    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      throw unauthorized("Missing refresh token");
    }
    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw unauthorized("Refresh token is no longer valid");
    }
    if (stored.tokenHash !== hashToken(token) || stored.userId !== payload.sub) {
      throw unauthorized("Refresh token mismatch");
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw unauthorized("Account no longer exists");
    }
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const accessToken = await issueSession(user, res);
    res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")) {
      next(unauthorized("Invalid or expired refresh token"));
      return;
    }
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await prisma.refreshToken.updateMany({
          where: { id: payload.jti, userId: payload.sub },
          data: { revokedAt: new Date() },
        });
      } catch {
        // cookie may already be invalid
      }
    }
    clearRefreshCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const auth = getUser(req);
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});
