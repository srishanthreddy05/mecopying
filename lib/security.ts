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

const EDIT_TOKEN_SECRET =
  process.env.EDIT_SECRET ||
  process.env.DATABASE_URL ||
  "mecopying-internal-edit-secret-key-2026-fallback";

export interface EditTokenPayload {
  snippetId: string;
  slug: string;
  collectionSlug?: string;
  snippetSlug?: string;
  expiresInMs?: number;
}

/**
 * Creates a cryptographically signed, short-lived edit token tied to a specific snippet.
 */
export function createEditToken(payload: EditTokenPayload): string {
  const exp = Date.now() + (payload.expiresInMs || 15 * 60 * 1000); // 15 min default
  const data = `${payload.snippetId}:${payload.slug}:${payload.collectionSlug || ""}:${payload.snippetSlug || ""}:${exp}`;
  const sig = crypto.createHmac("sha256", EDIT_TOKEN_SECRET).update(data).digest("hex");
  const tokenObj = {
    snippetId: payload.snippetId,
    slug: payload.slug,
    collectionSlug: payload.collectionSlug || null,
    snippetSlug: payload.snippetSlug || null,
    exp,
    sig,
  };
  return Buffer.from(JSON.stringify(tokenObj), "utf8").toString("base64url");
}

/**
 * Verifies the integrity, signature, and expiration of an edit token.
 */
export function verifyEditToken(token: string): {
  valid: boolean;
  snippetId?: string;
  slug?: string;
  collectionSlug?: string | null;
  snippetSlug?: string | null;
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing edit authorization token" };
  }
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw);
    const { snippetId, slug, collectionSlug, snippetSlug, exp, sig } = parsed;

    if (!snippetId || !slug || !exp || !sig) {
      return { valid: false, error: "Malformed edit authorization token" };
    }

    if (Date.now() > exp) {
      return { valid: false, error: "Edit session has expired. Please verify your password again." };
    }

    const expectedData = `${snippetId}:${slug}:${collectionSlug || ""}:${snippetSlug || ""}:${exp}`;
    const expectedSig = crypto.createHmac("sha256", EDIT_TOKEN_SECRET).update(expectedData).digest("hex");

    const sigBuf = Buffer.from(sig, "hex");
    const expSigBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expSigBuf.length || !crypto.timingSafeEqual(sigBuf, expSigBuf)) {
      return { valid: false, error: "Invalid edit authorization signature" };
    }

    return {
      valid: true,
      snippetId,
      slug,
      collectionSlug,
      snippetSlug,
    };
  } catch {
    return { valid: false, error: "Invalid edit authorization token" };
  }
}
