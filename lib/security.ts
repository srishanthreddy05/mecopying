import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Hash a deletion password securely using bcrypt with cost factor 12
 */
export async function hashDeletionPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a deletion password against its bcrypt hash
 */
export async function verifyDeletionPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Generate a random 8-character URL-safe lowercase slug (e.g. a8k3mz7q)
 */
export function generateShortSlug(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate a cryptographically secure 48-character management token
 */
export function generateManagementToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Hash a management token using SHA-256 for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Constant-time comparison between a provided plain token and a stored SHA-256 hash
 */
export function verifyToken(providedToken: string, storedHash: string): boolean {
  if (!providedToken || !storedHash) return false;
  try {
    const computedHash = hashToken(providedToken);
    const bufA = Buffer.from(computedHash, "hex");
    const bufB = Buffer.from(storedHash, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Generates a random fun developer-friendly slug
 */
const ADJECTIVES = [
  "cool", "swift", "hyper", "neon", "retro", "pixel", "lazy", "cyber",
  "atomic", "cosmic", "turbo", "silent", "funky", "vivid", "crisp",
  "clever", "wild", "smooth", "bold", "quick", "clean", "zen"
];

const NOUNS = [
  "byte", "script", "falcon", "stack", "node", "pixel", "matrix",
  "craft", "orbit", "circuit", "spark", "forge", "cache", "delta",
  "prism", "pulse", "echo", "flow", "drift", "nexus", "quark"
];

export function generateRandomSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}-${noun}-${num}`;
}

/**
 * Basic in-memory rate limiter with TTL cleanup.
 * Note: In serverless multi-instance environments (like Vercel Edge/Serverless),
 * each instance maintains isolated memory. For strict production clustering,
 * Upstash Redis or Vercel KV should be attached. This in-memory limiter acts
 * as an immediate shield against rapid single-client bursts and local dev abuse.
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Periodic cleanup if store grows
  if (rateLimitStore.size > 5000) {
    for (const [key, item] of rateLimitStore.entries()) {
      if (item.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}
