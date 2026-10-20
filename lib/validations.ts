import { z } from "zod";

export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "login",
  "pricing",
  "settings",
  "qr",
  "futureme",
  "manage",
  "terms",
  "privacy",
  "contact",
  "explore",
  "report",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "sw.js",
  "service-worker.js",
  "manifest.json",
  "auth",
  "app",
  "static",
  "dashboard",
  "u",
  "c",
  "s",
  "m",
]);

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDisplayDate(input: Date | string): string {
  try {
    const d = new Date(input);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  } catch {
    return "";
  }
}

export const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(40, "Slug must not exceed 40 characters")
  .regex(SLUG_REGEX, "Slug can only contain lowercase letters, numbers, and hyphens (no leading or trailing hyphens)")
  .refine((val) => !RESERVED_SLUGS.has(val.toLowerCase()), {
    message: "This slug is reserved for system use. Please choose another.",
  });

export const snippetSlugSchema = z
  .string()
  .min(1, "Snippet slug must be at least 1 character")
  .max(50, "Snippet slug must not exceed 50 characters")
  .regex(SLUG_REGEX, "Slug can only contain lowercase letters, numbers, and hyphens");

export const SUPPORTED_LANGUAGES = [
  { id: "typescript", label: "TypeScript", prism: "typescript" },
  { id: "javascript", label: "JavaScript", prism: "javascript" },
  { id: "python", label: "Python", prism: "python" },
  { id: "java", label: "Java", prism: "java" },
  { id: "c", label: "C", prism: "c" },
  { id: "cpp", label: "C++", prism: "cpp" },
  { id: "csharp", label: "C#", prism: "csharp" },
  { id: "go", label: "Go", prism: "go" },
  { id: "rust", label: "Rust", prism: "rust" },
  { id: "sql", label: "SQL", prism: "sql" },
  { id: "html", label: "HTML", prism: "markup" },
  { id: "css", label: "CSS", prism: "css" },
  { id: "json", label: "JSON", prism: "json" },
  { id: "yaml", label: "YAML", prism: "yaml" },
  { id: "markdown", label: "Markdown", prism: "markdown" },
  { id: "bash", label: "Bash / Shell", prism: "bash" },
  { id: "php", label: "PHP", prism: "php" },
  { id: "ruby", label: "Ruby", prism: "ruby" },
  { id: "swift", label: "Swift", prism: "swift" },
  { id: "kotlin", label: "Kotlin", prism: "kotlin" },
  { id: "plaintext", label: "Plain Text", prism: "plaintext" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["id"];

const languageIds = SUPPORTED_LANGUAGES.map((l) => l.id) as [string, ...string[]];

export const MAX_SNIPPET_SIZE_BYTES = 50 * 1024; // 50 KB

export const EXPIRY_OPTIONS = [
  { value: "never", label: "Never", seconds: null },
  { value: "1h", label: "1 hour", seconds: 3600 },
  { value: "24h", label: "24 hours", seconds: 86400 },
  { value: "7d", label: "7 days", seconds: 7 * 86400 },
  { value: "30d", label: "30 days", seconds: 30 * 86400 },
] as const;

export type ExpiryOptionValue = (typeof EXPIRY_OPTIONS)[number]["value"];

export const createPageSchema = z.object({
  title: z.string().trim().max(100, "Title must not exceed 100 characters").optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || (val.length >= 2 && val.length <= 40 && SLUG_REGEX.test(val) && !RESERVED_SLUGS.has(val)),
      { message: "Custom link must be 2-40 characters, contain only lowercase letters, numbers, and hyphens, and not be reserved." }
    ),
  content: z
    .string()
    .min(1, "Please enter some content or code")
    .refine((val) => new TextEncoder().encode(val).length <= MAX_SNIPPET_SIZE_BYTES, {
      message: `Content exceeds maximum limit of 50 KB (${MAX_SNIPPET_SIZE_BYTES} bytes)`,
    }),
  deletePassword: z
    .string()
    .min(4, "Deletion password must be at least 4 characters")
    .max(100, "Deletion password must not exceed 100 characters"),
  expiry: z.enum(["never", "1h", "24h", "7d", "30d"]).default("never"),
});

export const deletePageSchema = z.object({
  slug: z.string().trim().toLowerCase().min(1, "Slug is required"),
  password: z.string().min(1, "Deletion password is required"),
});

export const createCollectionSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, "Title is required").max(80, "Title must not exceed 80 characters"),
  description: z.string().trim().max(300, "Description must not exceed 300 characters").optional().or(z.literal("")),
  visibility: z.enum(["PUBLIC", "UNLISTED"]).default("PUBLIC"),
  expiresInSeconds: z.number().int().nonnegative().optional().nullable(),
});

export const createSnippetSchema = z.object({
  collectionSlug: slugSchema,
  collectionTitle: z.string().trim().max(80).optional(),
  slug: snippetSlugSchema,
  title: z.string().trim().min(1, "Title is required").max(100, "Title must not exceed 100 characters"),
  content: z
    .string()
    .min(1, "Code content is required")
    .refine((val) => new TextEncoder().encode(val).length <= MAX_SNIPPET_SIZE_BYTES, {
      message: `Snippet exceeds maximum limit of 50 KB (${MAX_SNIPPET_SIZE_BYTES} bytes)`,
    }),
  language: z.enum(languageIds).default("typescript"),
  visibility: z.enum(["PUBLIC", "UNLISTED"]).default("PUBLIC"),
  expiresInSeconds: z.number().int().nonnegative().optional().nullable(),
  manageToken: z.string().optional(), // Required if adding to an existing collection
});

export const updateSnippetSchema = z.object({
  manageToken: z.string().min(1, "Management token required"),
  title: z.string().trim().min(1, "Title is required").max(100).optional(),
  content: z
    .string()
    .min(1, "Code content is required")
    .refine((val) => new TextEncoder().encode(val).length <= MAX_SNIPPET_SIZE_BYTES, {
      message: "Snippet exceeds maximum limit of 50 KB",
    })
    .optional(),
  language: z.enum(languageIds).optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED"]).optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(["COLLECTION", "SNIPPET"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(200),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const editVerifySchema = z.object({
  slug: z.string().trim().toLowerCase().optional(),
  collectionSlug: z.string().trim().toLowerCase().optional(),
  snippetSlug: z.string().trim().toLowerCase().optional(),
  password: z.string().min(1, "Password is required"),
});

export const editSaveSchema = z.object({
  token: z.string().min(1, "Edit authorization token is required"),
  title: z.string().trim().max(100, "Title must not exceed 100 characters").optional().or(z.literal("")),
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .refine((val) => new TextEncoder().encode(val).length <= MAX_SNIPPET_SIZE_BYTES, {
      message: `Content exceeds maximum limit of 50 KB (${MAX_SNIPPET_SIZE_BYTES} bytes)`,
    }),
});
