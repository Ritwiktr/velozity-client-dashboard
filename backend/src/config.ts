import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, "../../.env") });
loadEnv({ path: path.resolve(here, "../../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: normalizeOrigin(process.env.CLIENT_ORIGIN ?? "http://localhost:5173"),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  cookieSecure: process.env.COOKIE_SECURE === "true",
};

export function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  const configured = env.clientOrigin.split(",").map(normalizeOrigin);
  if (configured.includes(normalized)) return true;
  try {
    return new URL(normalized).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
