// Tiny stateless admin auth: single ADMIN_PASSWORD env var, one signed cookie.

import crypto from "node:crypto";
import { STORAGE } from "./constants.js";

const COOKIE_NAME = STORAGE.ADMIN_COOKIE;
const COOKIE_MAX_AGE = STORAGE.DEFAULT_ADMIN_COOKIE_MAX_AGE_SEC;
const SECRET_FALLBACK = "photo-experiment-dev-secret";

// Reads env vars from both process.env (Vercel prod) and import.meta.env
// (Astro dev with .env), so the same code works in both environments.
function envVar(name) {
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name];
  }
  try { return import.meta.env[name]; } catch { return undefined; }
}

function secret() {
  return envVar("ADMIN_COOKIE_SECRET") || SECRET_FALLBACK;
}

function tokenFor(password) {
  return crypto
    .createHmac("sha256", secret())
    .update(String(password))
    .digest("hex");
}

export function isPasswordCorrect(input) {
  const expected = envVar("ADMIN_PASSWORD");
  if (!expected) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(tokenFor(input)),
      Buffer.from(tokenFor(expected))
    );
  } catch {
    return false;
  }
}

export function expectedToken() {
  const pw = envVar("ADMIN_PASSWORD");
  return pw ? tokenFor(pw) : null;
}

export function setAuthCookie(cookies) {
  const token = expectedToken();
  if (!token) return;
  cookies.set(COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: envVar("NODE_ENV") === "production",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie(cookies) {
  cookies.delete(COOKIE_NAME, { path: "/" });
}

export function isAuthenticated(cookies) {
  const expected = expectedToken();
  if (!expected) return false;
  const got = cookies.get(COOKIE_NAME)?.value;
  if (!got) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}
