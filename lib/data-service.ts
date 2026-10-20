import { prisma, isDatabaseConfigured } from "./prisma";
import {
  hashToken,
  verifyToken,
  hashDeletionPassword,
  verifyDeletionPassword,
  generateShortSlug,
  generateManagementToken,
} from "./security";
import { Prisma } from "@prisma/client";
import {
  readDevDb,
  writeDevDb,
  StoredCollection,
  StoredSnippet,
  StoredReport,
  StoredReview,
} from "./dev-store";

export interface CreateStandalonePageInput {
  title?: string;
  slug?: string;
  content: string;
  deletePassword: string;
  expiresInSeconds?: number | null;
}

export interface CreateCollectionInput {
  slug: string;
  title: string;
  description?: string;
  visibility: "PUBLIC" | "UNLISTED";
  manageToken: string;
  expiresInSeconds?: number | null;
}

export interface CreateSnippetInput {
  collectionSlug: string;
  collectionTitle?: string;
  slug: string;
  title: string;
  content: string;
  language: string;
  visibility: "PUBLIC" | "UNLISTED";
  expiresInSeconds?: number | null;
  manageToken?: string;
}

function isExpired(expiresAt?: Date | string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export class DuplicateSlugError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateSlugError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized: Invalid management token") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Resource not found or expired") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Check if a collection slug is available
 */
export async function isCollectionSlugAvailable(slug: string): Promise<boolean> {
  const normalized = slug.toLowerCase();
  if (isDatabaseConfigured()) {
    try {
      const existing = await prisma.collection.findUnique({
        where: { slug: normalized },
        select: { id: true, expiresAt: true },
      });
      return !existing;
    } catch {
      // Fallback to dev store
    }
  }

  const db = readDevDb();
  return !db.collections[normalized];
}

/**
 * Check if a snippet slug is available within a collection
 */
export async function isSnippetSlugAvailable(collectionSlug: string, snippetSlug: string): Promise<boolean> {
  const normCol = collectionSlug.toLowerCase();
  const normSnip = snippetSlug.toLowerCase();

  if (isDatabaseConfigured()) {
    try {
      const collection = await prisma.collection.findUnique({
        where: { slug: normCol },
        select: { id: true },
      });
      if (!collection) return true;

      const existing = await prisma.snippet.findUnique({
        where: {
          collectionId_slug: {
            collectionId: collection.id,
            slug: normSnip,
          },
        },
        select: { id: true },
      });
      return !existing;
    } catch {
      // Fallback
    }
  }

  const db = readDevDb();
  const col = db.collections[normCol];
  if (!col) return true;
  return !Object.values(db.snippets).some(
    (s) => s.collectionId === col.id && s.slug === normSnip
  );
}

/**
 * Create a standalone shareable page with optional custom link and required deletion password
 */
export async function createStandalonePage(input: CreateStandalonePageInput) {
  let finalSlug = input.slug ? input.slug.trim().toLowerCase() : "";

  // If no slug was provided, generate a unique random 8-char slug
  if (!finalSlug) {
    for (let attempts = 0; attempts < 10; attempts++) {
      const candidate = generateShortSlug();
      const available = await isCollectionSlugAvailable(candidate);
      if (available) {
        finalSlug = candidate;
        break;
      }
    }
    if (!finalSlug) {
      finalSlug = generateShortSlug();
    }
  }

  const deletePasswordHash = await hashDeletionPassword(input.deletePassword);
  const manageToken = generateManagementToken();
  const manageTokenHash = hashToken(manageToken);
  const expiresAt = input.expiresInSeconds
    ? new Date(Date.now() + input.expiresInSeconds * 1000)
    : null;

  const displayTitle = (input.title || "").trim();

  if (isDatabaseConfigured()) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const collection = await tx.collection.create({
          data: {
            slug: finalSlug,
            title: displayTitle || finalSlug,
            visibility: "PUBLIC",
            manageTokenHash,
            deletePasswordHash,
            expiresAt,
          },
        });

        const snippet = await tx.snippet.create({
          data: {
            collectionId: collection.id,
            slug: "main",
            title: displayTitle,
            content: input.content,
            language: "plaintext",
            visibility: "PUBLIC",
            deletePasswordHash,
            expiresAt,
          },
        });

        return { collection, snippet };
      });

      return {
        slug: result.collection.slug,
        title: displayTitle,
        content: result.snippet.content,
        expiresAt: result.collection.expiresAt,
        createdAt: result.collection.createdAt,
      };
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new DuplicateSlugError("This custom link is already taken. Please choose another.");
      }
      throw err;
    }
  }

  // File-backed Dev Fallback
  const db = readDevDb();
  if (db.collections[finalSlug]) {
    throw new DuplicateSlugError("This custom link is already taken. Please choose another.");
  }

  const colId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const storedCol: StoredCollection = {
    id: colId,
    slug: finalSlug,
    title: displayTitle || finalSlug,
    visibility: "PUBLIC",
    manageTokenHash,
    deletePasswordHash,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.collections[finalSlug] = storedCol;

  const snipId = `snip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const storedSnip: StoredSnippet = {
    id: snipId,
    collectionId: colId,
    slug: "main",
    title: displayTitle,
    content: input.content,
    language: "plaintext",
    visibility: "PUBLIC",
    deletePasswordHash,
    viewCount: 0,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.snippets[snipId] = storedSnip;
  writeDevDb(db);

  return {
    slug: finalSlug,
    title: displayTitle,
    content: input.content,
    expiresAt,
    createdAt: new Date(storedCol.createdAt),
  };
}

/**
 * Get a standalone page by slug
 */
export async function getStandalonePage(rawSlug: string) {
  const slug = rawSlug.toLowerCase().trim();

  if (isDatabaseConfigured()) {
    try {
      const collection = await prisma.collection.findUnique({
        where: { slug },
        include: {
          snippets: {
            where: {
              visibility: "PUBLIC",
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: {
              id: true,
              slug: true,
              title: true,
              content: true,
              language: true,
              viewCount: true,
              createdAt: true,
              updatedAt: true,
              expiresAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!collection || isExpired(collection.expiresAt)) {
        return null;
      }

      if (collection.snippets.length === 0) {
        return null;
      }

      // Increment view count on primary snippet asynchronously
      prisma.snippet
        .update({
          where: { id: collection.snippets[0].id },
          data: { viewCount: { increment: 1 } },
        })
        .catch(() => {});

      const primarySnippet = collection.snippets[0];
      const isMultiSnippet = collection.snippets.length > 1;

      return {
        id: primarySnippet.id,
        collectionId: collection.id,
        slug: collection.slug,
        title: primarySnippet.title || (collection.title !== collection.slug ? collection.title : ""),
        description: collection.description || null,
        content: primarySnippet.content,
        createdAt: collection.createdAt,
        expiresAt: collection.expiresAt,
        viewCount: primarySnippet.viewCount + 1,
        isMultiSnippet,
        hasDeletePassword: Boolean(collection.deletePasswordHash),
        snippets: collection.snippets.map((s) => ({
          id: s.id,
          slug: s.slug,
          title: s.title,
          content: s.content,
          createdAt: s.createdAt,
          viewCount: s.viewCount,
        })),
      };
    } catch {
      // Fallback to dev store
    }
  }

  const db = readDevDb();
  const col = db.collections[slug];
  if (!col || isExpired(col.expiresAt)) return null;

  const colSnippets = Object.values(db.snippets)
    .filter((s) => s.collectionId === col.id && s.visibility === "PUBLIC" && !isExpired(s.expiresAt))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (colSnippets.length === 0) return null;

  const primary = colSnippets[0];
  primary.viewCount += 1;
  writeDevDb(db);

  return {
    id: primary.id,
    collectionId: col.id,
    slug: col.slug,
    title: primary.title || (col.title !== col.slug ? col.title : ""),
    description: col.description || null,
    content: primary.content,
    createdAt: new Date(col.createdAt),
    expiresAt: col.expiresAt ? new Date(col.expiresAt) : null,
    viewCount: primary.viewCount,
    isMultiSnippet: colSnippets.length > 1,
    hasDeletePassword: Boolean(col.deletePasswordHash || primary.deletePasswordHash),
    snippets: colSnippets.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      content: s.content,
      createdAt: new Date(s.createdAt),
      viewCount: s.viewCount,
    })),
  };
}

/**
 * Delete a page using its deletion password
 */
export async function deletePageWithPassword(slug: string, password: string) {
  const normSlug = slug.toLowerCase().trim();

  if (isDatabaseConfigured()) {
    const collection = await prisma.collection.findUnique({
      where: { slug: normSlug },
      include: {
        snippets: true,
      },
    });

    if (!collection) {
      throw new NotFoundError("Page not found or already deleted");
    }

    const hashToTest = collection.deletePasswordHash || collection.snippets[0]?.deletePasswordHash;
    if (!hashToTest) {
      throw new UnauthorizedError("This page does not have a deletion password configured");
    }

    const isValid = await verifyDeletionPassword(password, hashToTest);
    if (!isValid) {
      throw new UnauthorizedError("Incorrect deletion password. Please try again.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.collection.delete({
        where: { id: collection.id },
      });
    });

    return { success: true, slug: normSlug };
  }

  // Dev store
  const db = readDevDb();
  const col = db.collections[normSlug];
  if (!col) {
    throw new NotFoundError("Page not found or already deleted");
  }

  const colSnippets = Object.values(db.snippets).filter((s) => s.collectionId === col.id);
  const hashToTest = col.deletePasswordHash || colSnippets[0]?.deletePasswordHash;
  if (!hashToTest) {
    throw new UnauthorizedError("This page does not have a deletion password configured");
  }

  const isValid = await verifyDeletionPassword(password, hashToTest);
  if (!isValid) {
    throw new UnauthorizedError("Incorrect deletion password. Please try again.");
  }

  delete db.collections[normSlug];
  for (const [id, s] of Object.entries(db.snippets)) {
    if (s.collectionId === col.id) {
      delete db.snippets[id];
    }
  }
  writeDevDb(db);

  return { success: true, slug: normSlug };
}

/**
 * Delete a specific snippet within a collection using password
 */
export async function deleteSnippetWithPassword(collectionSlug: string, snippetSlug: string, password: string) {
  const colSlug = collectionSlug.toLowerCase().trim();
  const snipSlug = snippetSlug.toLowerCase().trim();

  if (isDatabaseConfigured()) {
    const snippet = await prisma.snippet.findFirst({
      where: {
        slug: snipSlug,
        collection: { slug: colSlug },
      },
      include: {
        collection: true,
      },
    });

    if (!snippet) {
      throw new NotFoundError("Snippet not found or already deleted");
    }

    const hashToTest = snippet.deletePasswordHash || snippet.collection.deletePasswordHash;
    if (!hashToTest) {
      throw new UnauthorizedError("This page does not have a deletion password configured");
    }

    const isValid = await verifyDeletionPassword(password, hashToTest);
    if (!isValid) {
      throw new UnauthorizedError("Incorrect deletion password. Please try again.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.snippet.delete({
        where: { id: snippet.id },
      });
      const remaining = await tx.snippet.count({
        where: { collectionId: snippet.collectionId },
      });
      if (remaining === 0) {
        await tx.collection.delete({
          where: { id: snippet.collectionId },
        });
      }
    });

    return { success: true, collectionSlug: colSlug, snippetSlug: snipSlug };
  }

  // Dev store
  const db = readDevDb();
  const col = db.collections[colSlug];
  if (!col) throw new NotFoundError("Page not found");

  const snipEntry = Object.entries(db.snippets).find(
    ([, s]) => s.collectionId === col.id && s.slug === snipSlug
  );
  if (!snipEntry) throw new NotFoundError("Snippet not found");

  const hashToTest = snipEntry[1].deletePasswordHash || col.deletePasswordHash;
  if (!hashToTest) throw new UnauthorizedError("This page does not have a deletion password configured");

  const isValid = await verifyDeletionPassword(password, hashToTest);
  if (!isValid) throw new UnauthorizedError("Incorrect deletion password. Please try again.");

  delete db.snippets[snipEntry[0]];
  const remainingSnippets = Object.values(db.snippets).filter((s) => s.collectionId === col.id);
  if (remainingSnippets.length === 0) {
    delete db.collections[colSlug];
  }
  writeDevDb(db);
  return { success: true, collectionSlug: colSlug, snippetSlug: snipSlug };
}

export interface VerifyEditPasswordResult {
  snippetId: string;
  slug: string;
  collectionSlug?: string;
  snippetSlug?: string;
  title: string;
  content: string;
}

/**
 * Verify deletion password for editing a standalone page or snippet
 */
export async function verifySnippetEditPassword(params: {
  slug?: string;
  collectionSlug?: string;
  snippetSlug?: string;
  password: string;
}): Promise<VerifyEditPasswordResult> {
  const { slug, collectionSlug, snippetSlug, password } = params;

  if (collectionSlug && snippetSlug) {
    const colSlug = collectionSlug.toLowerCase().trim();
    const snipSlug = snippetSlug.toLowerCase().trim();

    if (isDatabaseConfigured()) {
      const snippet = await prisma.snippet.findFirst({
        where: {
          slug: snipSlug,
          collection: { slug: colSlug },
        },
        include: {
          collection: true,
        },
      });

      if (!snippet) {
        throw new NotFoundError("Snippet not found or already deleted");
      }

      if (isExpired(snippet.expiresAt) || isExpired(snippet.collection.expiresAt)) {
        throw new NotFoundError("Snippet has expired");
      }

      const hashToTest = snippet.deletePasswordHash || snippet.collection.deletePasswordHash;
      if (!hashToTest) {
        throw new UnauthorizedError("This page does not have a password configured");
      }

      const isValid = await verifyDeletionPassword(password, hashToTest);
      if (!isValid) {
        throw new UnauthorizedError("Incorrect password. Please try again.");
      }

      return {
        snippetId: snippet.id,
        slug: snippet.slug,
        collectionSlug: colSlug,
        snippetSlug: snipSlug,
        title: snippet.title,
        content: snippet.content,
      };
    }

    // Dev store
    const db = readDevDb();
    const col = db.collections[colSlug];
    if (!col || isExpired(col.expiresAt)) {
      throw new NotFoundError("Snippet not found or already deleted");
    }

    const snipEntry = Object.entries(db.snippets).find(
      ([, s]) => s.collectionId === col.id && s.slug === snipSlug
    );
    if (!snipEntry || isExpired(snipEntry[1].expiresAt)) {
      throw new NotFoundError("Snippet not found or already deleted");
    }

    const snippet = snipEntry[1];
    const hashToTest = snippet.deletePasswordHash || col.deletePasswordHash;
    if (!hashToTest) {
      throw new UnauthorizedError("This page does not have a password configured");
    }

    const isValid = await verifyDeletionPassword(password, hashToTest);
    if (!isValid) {
      throw new UnauthorizedError("Incorrect password. Please try again.");
    }

    return {
      snippetId: snippet.id,
      slug: snippet.slug,
      collectionSlug: colSlug,
      snippetSlug: snipSlug,
      title: snippet.title,
      content: snippet.content,
    };
  }

  // Standalone page
  if (!slug) {
    throw new Error("Page slug is required");
  }

  const normSlug = slug.toLowerCase().trim();

  if (isDatabaseConfigured()) {
    const collection = await prisma.collection.findUnique({
      where: { slug: normSlug },
      include: {
        snippets: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!collection) {
      throw new NotFoundError("Page not found or already deleted");
    }

    if (isExpired(collection.expiresAt)) {
      throw new NotFoundError("Page has expired");
    }

    if (collection.snippets.length === 0) {
      throw new NotFoundError("Page content not found");
    }

    const primarySnippet = collection.snippets[0];
    const hashToTest = collection.deletePasswordHash || primarySnippet.deletePasswordHash;
    if (!hashToTest) {
      throw new UnauthorizedError("This page does not have a password configured");
    }

    const isValid = await verifyDeletionPassword(password, hashToTest);
    if (!isValid) {
      throw new UnauthorizedError("Incorrect password. Please try again.");
    }

    const displayTitle = primarySnippet.title || (collection.title !== collection.slug ? collection.title : "");

    return {
      snippetId: primarySnippet.id,
      slug: collection.slug,
      title: displayTitle,
      content: primarySnippet.content,
    };
  }

  // Dev store
  const db = readDevDb();
  const col = db.collections[normSlug];
  if (!col || isExpired(col.expiresAt)) {
    throw new NotFoundError("Page not found or already deleted");
  }

  const colSnippets = Object.values(db.snippets)
    .filter((s) => s.collectionId === col.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (colSnippets.length === 0) {
    throw new NotFoundError("Page content not found");
  }

  const primary = colSnippets[0];
  const hashToTest = col.deletePasswordHash || primary.deletePasswordHash;
  if (!hashToTest) {
    throw new UnauthorizedError("This page does not have a password configured");
  }

  const isValid = await verifyDeletionPassword(password, hashToTest);
  if (!isValid) {
    throw new UnauthorizedError("Incorrect password. Please try again.");
  }

  const displayTitle = primary.title || (col.title !== col.slug ? col.title : "");

  return {
    snippetId: primary.id,
    slug: col.slug,
    title: displayTitle,
    content: primary.content,
  };
}

/**
 * Update snippet title and content securely
 */
export async function updateSnippetContent(params: {
  snippetId: string;
  title?: string;
  content: string;
}): Promise<{ id: string; title: string; content: string; updatedAt: Date }> {
  const { snippetId, title, content } = params;
  const cleanTitle = (title || "").trim();

  if (isDatabaseConfigured()) {
    const existing = await prisma.snippet.findUnique({
      where: { id: snippetId },
      include: { collection: true },
    });

    if (!existing) {
      throw new NotFoundError("Snippet not found");
    }

    if (isExpired(existing.expiresAt) || isExpired(existing.collection.expiresAt)) {
      throw new NotFoundError("Snippet has expired");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (
        existing.collection.title === existing.title ||
        existing.collection.title === existing.collection.slug
      ) {
        if (cleanTitle) {
          await tx.collection.update({
            where: { id: existing.collectionId },
            data: { title: cleanTitle },
          });
        }
      }

      return await tx.snippet.update({
        where: { id: snippetId },
        data: {
          title: cleanTitle,
          content,
          updatedAt: new Date(),
        },
      });
    });

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      updatedAt: updated.updatedAt,
    };
  }

  // Dev DB
  const db = readDevDb();
  const snip = db.snippets[snippetId];
  if (!snip) {
    throw new NotFoundError("Snippet not found");
  }

  const col = Object.values(db.collections).find((c) => c.id === snip.collectionId);
  if (!col || isExpired(col.expiresAt) || isExpired(snip.expiresAt)) {
    throw new NotFoundError("Snippet not found or expired");
  }

  snip.title = cleanTitle;
  snip.content = content;
  snip.updatedAt = new Date().toISOString();

  if (col.title === col.slug || col.title === cleanTitle) {
    if (cleanTitle) {
      col.title = cleanTitle;
    }
  }

  writeDevDb(db);

  return {
    id: snip.id,
    title: snip.title,
    content: snip.content,
    updatedAt: new Date(snip.updatedAt),
  };
}

/**
 * Create a collection and optionally its initial snippet atomically
 */
export async function createCollectionWithSnippet(params: {
  collection: CreateCollectionInput;
  snippet?: Omit<CreateSnippetInput, "collectionSlug">;
}) {
  const { collection: colInput, snippet: snipInput } = params;
  const colSlug = colInput.slug.toLowerCase();
  const manageTokenHash = hashToken(colInput.manageToken);
  const colExpiresAt = colInput.expiresInSeconds ? new Date(Date.now() + colInput.expiresInSeconds * 1000) : null;

  if (isDatabaseConfigured()) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const collection = await tx.collection.create({
          data: {
            slug: colSlug,
            title: colInput.title,
            description: colInput.description || null,
            visibility: colInput.visibility,
            manageTokenHash,
            expiresAt: colExpiresAt,
          },
        });

        let snippet = null;
        if (snipInput) {
          const snipSlug = snipInput.slug.toLowerCase();
          const snipExpiresAt = snipInput.expiresInSeconds
            ? new Date(Date.now() + snipInput.expiresInSeconds * 1000)
            : null;

          snippet = await tx.snippet.create({
            data: {
              collectionId: collection.id,
              slug: snipSlug,
              title: snipInput.title,
              content: snipInput.content,
              language: snipInput.language,
              visibility: snipInput.visibility,
              expiresAt: snipExpiresAt,
            },
          });
        }

        return { collection, snippet };
      });

      return result;
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new DuplicateSlugError("The slug is already taken. Please choose a different slug.");
      }
      throw err;
    }
  }

  // File-backed Dev Fallback
  const db = readDevDb();
  if (db.collections[colSlug]) {
    throw new DuplicateSlugError(`Collection slug "${colSlug}" is already taken.`);
  }

  const colId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const storedCol: StoredCollection = {
    id: colId,
    slug: colSlug,
    title: colInput.title,
    description: colInput.description || null,
    visibility: colInput.visibility,
    manageTokenHash,
    expiresAt: colExpiresAt ? colExpiresAt.toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.collections[colSlug] = storedCol;

  let storedSnip: StoredSnippet | null = null;
  if (snipInput) {
    const snipSlug = snipInput.slug.toLowerCase();
    const snipId = `snip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const snipExpiresAt = snipInput.expiresInSeconds
      ? new Date(Date.now() + snipInput.expiresInSeconds * 1000)
      : null;

    storedSnip = {
      id: snipId,
      collectionId: colId,
      slug: snipSlug,
      title: snipInput.title,
      content: snipInput.content,
      language: snipInput.language,
      visibility: snipInput.visibility,
      viewCount: 0,
      expiresAt: snipExpiresAt ? snipExpiresAt.toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.snippets[snipId] = storedSnip;
  }

  writeDevDb(db);
  return { collection: storedCol, snippet: storedSnip };
}

/**
 * Add a snippet to an existing collection using management credentials
 */
export async function addSnippetToCollection(input: CreateSnippetInput) {
  const colSlug = input.collectionSlug.toLowerCase();
  const snipSlug = input.slug.toLowerCase();

  if (isDatabaseConfigured()) {
    try {
      const collection = await prisma.collection.findUnique({
        where: { slug: colSlug },
      });

      if (!collection || isExpired(collection.expiresAt)) {
        throw new NotFoundError("Collection not found or expired");
      }

      if (!input.manageToken || !verifyToken(input.manageToken, collection.manageTokenHash)) {
        throw new UnauthorizedError("Invalid management token for this collection");
      }

      const snipExpiresAt = input.expiresInSeconds
        ? new Date(Date.now() + input.expiresInSeconds * 1000)
        : null;

      const snippet = await prisma.snippet.create({
        data: {
          collectionId: collection.id,
          slug: snipSlug,
          title: input.title,
          content: input.content,
          language: input.language,
          visibility: input.visibility,
          expiresAt: snipExpiresAt,
        },
      });

      return { collection, snippet };
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new DuplicateSlugError(`Snippet slug "${snipSlug}" already exists in this collection.`);
      }
      throw err;
    }
  }

  const db = readDevDb();
  const col = db.collections[colSlug];
  if (!col || isExpired(col.expiresAt)) {
    throw new NotFoundError("Collection not found or expired");
  }

  if (!input.manageToken || !verifyToken(input.manageToken, col.manageTokenHash)) {
    throw new UnauthorizedError("Invalid management token for this collection");
  }

  const existingSnippet = Object.values(db.snippets).find(
    (s) => s.collectionId === col.id && s.slug === snipSlug
  );
  if (existingSnippet) {
    throw new DuplicateSlugError(`Snippet slug "${snipSlug}" already exists in this collection.`);
  }

  const snipId = `snip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const snipExpiresAt = input.expiresInSeconds
    ? new Date(Date.now() + input.expiresInSeconds * 1000)
    : null;

  const storedSnip: StoredSnippet = {
    id: snipId,
    collectionId: col.id,
    slug: snipSlug,
    title: input.title,
    content: input.content,
    language: input.language,
    visibility: input.visibility,
    viewCount: 0,
    expiresAt: snipExpiresAt ? snipExpiresAt.toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.snippets[snipId] = storedSnip;

  writeDevDb(db);
  return { collection: col, snippet: storedSnip };
}

/**
 * Get public collection and its visible public snippets
 */
export async function getPublicCollection(collectionSlug: string) {
  const slug = collectionSlug.toLowerCase();

  if (isDatabaseConfigured()) {
    try {
      const collection = await prisma.collection.findUnique({
        where: { slug },
        include: {
          snippets: {
            where: {
              visibility: "PUBLIC",
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: {
              id: true,
              slug: true,
              title: true,
              language: true,
              visibility: true,
              viewCount: true,
              createdAt: true,
              updatedAt: true,
              content: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!collection || isExpired(collection.expiresAt)) {
        return null;
      }

      const { manageTokenHash: _manageHash, ...safeCollection } = collection;
      void _manageHash;
      return safeCollection;
    } catch {
      // Fallback
    }
  }

  const db = readDevDb();
  const col = db.collections[slug];
  if (!col || isExpired(col.expiresAt)) return null;

  const visibleSnippets = Object.values(db.snippets)
    .filter((s) => s.collectionId === col.id && s.visibility === "PUBLIC" && !isExpired(s.expiresAt))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const { manageTokenHash: _manageHash, ...safeCol } = col;
  void _manageHash;
  return { ...safeCol, snippets: visibleSnippets };
}

/**
 * Get a specific snippet by collectionSlug and snippetSlug
 */
export async function getSnippet(collectionSlug: string, snippetSlug: string) {
  const colSlug = collectionSlug.toLowerCase();
  const snipSlug = snippetSlug.toLowerCase();

  if (isDatabaseConfigured()) {
    try {
      const snippet = await prisma.snippet.findFirst({
        where: {
          slug: snipSlug,
          collection: { slug: colSlug },
        },
        include: {
          collection: {
            select: {
              id: true,
              slug: true,
              title: true,
              visibility: true,
              expiresAt: true,
            },
          },
        },
      });

      if (!snippet) return null;
      if (isExpired(snippet.expiresAt) || isExpired(snippet.collection.expiresAt)) {
        return null;
      }

      prisma.snippet.update({
        where: { id: snippet.id },
        data: { viewCount: { increment: 1 } },
      }).catch(() => {});

      return snippet;
    } catch {
      // Fallback
    }
  }

  const db = readDevDb();
  const col = db.collections[colSlug];
  if (!col || isExpired(col.expiresAt)) return null;

  const snippet = Object.values(db.snippets).find(
    (s) => s.collectionId === col.id && s.slug === snipSlug
  );

  if (!snippet || isExpired(snippet.expiresAt)) return null;

  snippet.viewCount += 1;
  writeDevDb(db);

  return {
    ...snippet,
    collection: {
      id: col.id,
      slug: col.slug,
      title: col.title,
      visibility: col.visibility,
      expiresAt: col.expiresAt,
    },
  };
}

/**
 * Get collection for management via management token
 */
export async function getCollectionForManagement(token: string) {
  if (!token) return null;
  const tokenHash = hashToken(token);

  if (isDatabaseConfigured()) {
    try {
      const collection = await prisma.collection.findFirst({
        where: { manageTokenHash: tokenHash },
        include: {
          snippets: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!collection || isExpired(collection.expiresAt)) return null;
      const { manageTokenHash: _manageHash, ...safeCol } = collection;
      void _manageHash;
      return safeCol;
    } catch {
      // Fallback
    }
  }

  const db = readDevDb();
  const matched = Object.values(db.collections).find((col) =>
    verifyToken(token, col.manageTokenHash)
  );

  if (!matched || isExpired(matched.expiresAt)) return null;

  const colSnippets = Object.values(db.snippets)
    .filter((s) => s.collectionId === matched.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const { manageTokenHash: _manageHash, ...safeCol } = matched;
  void _manageHash;
  return { ...safeCol, snippets: colSnippets };
}

/**
 * Update snippet content/metadata with management token
 */
export async function updateSnippet(params: {
  collectionSlug: string;
  snippetSlug: string;
  manageToken: string;
  data: {
    title?: string;
    content?: string;
    language?: string;
    visibility?: "PUBLIC" | "UNLISTED";
  };
}) {
  const { collectionSlug, snippetSlug, manageToken, data } = params;
  const colSlug = collectionSlug.toLowerCase();
  const snipSlug = snippetSlug.toLowerCase();

  if (isDatabaseConfigured()) {
    const collection = await prisma.collection.findUnique({
      where: { slug: colSlug },
    });

    if (!collection || !verifyToken(manageToken, collection.manageTokenHash)) {
      throw new UnauthorizedError();
    }

    const snippet = await prisma.snippet.findUnique({
      where: {
        collectionId_slug: {
          collectionId: collection.id,
          slug: snipSlug,
        },
      },
    });

    if (!snippet) throw new NotFoundError("Snippet not found");

    return prisma.snippet.update({
      where: { id: snippet.id },
      data,
    });
  }

  const db = readDevDb();
  const col = db.collections[colSlug];
  if (!col || !verifyToken(manageToken, col.manageTokenHash)) {
    throw new UnauthorizedError();
  }

  const snippet = Object.values(db.snippets).find(
    (s) => s.collectionId === col.id && s.slug === snipSlug
  );

  if (!snippet) throw new NotFoundError("Snippet not found");

  if (data.title) snippet.title = data.title;
  if (data.content) snippet.content = data.content;
  if (data.language) snippet.language = data.language;
  if (data.visibility) snippet.visibility = data.visibility;
  snippet.updatedAt = new Date().toISOString();

  writeDevDb(db);
  return snippet;
}

/**
 * Delete a snippet with management token
 */
export async function deleteSnippet(params: {
  collectionSlug: string;
  snippetSlug: string;
  manageToken: string;
}) {
  const { collectionSlug, snippetSlug, manageToken } = params;
  const colSlug = collectionSlug.toLowerCase();
  const snipSlug = snippetSlug.toLowerCase();

  if (isDatabaseConfigured()) {
    const collection = await prisma.collection.findUnique({
      where: { slug: colSlug },
    });

    if (!collection || !verifyToken(manageToken, collection.manageTokenHash)) {
      throw new UnauthorizedError();
    }

    const snippet = await prisma.snippet.findUnique({
      where: {
        collectionId_slug: {
          collectionId: collection.id,
          slug: snipSlug,
        },
      },
    });

    if (!snippet) throw new NotFoundError("Snippet not found");

    await prisma.snippet.delete({
      where: { id: snippet.id },
    });

    return { success: true };
  }

  const db = readDevDb();
  const col = db.collections[colSlug];
  if (!col || !verifyToken(manageToken, col.manageTokenHash)) {
    throw new UnauthorizedError();
  }

  const snippetEntry = Object.entries(db.snippets).find(
    ([, s]) => s.collectionId === col.id && s.slug === snipSlug
  );

  if (!snippetEntry) throw new NotFoundError("Snippet not found");

  delete db.snippets[snippetEntry[0]];
  writeDevDb(db);
  return { success: true };
}

/**
 * Delete an entire collection and its snippets
 */
export async function deleteCollection(collectionSlug: string, manageToken: string) {
  const colSlug = collectionSlug.toLowerCase();

  if (isDatabaseConfigured()) {
    const collection = await prisma.collection.findUnique({
      where: { slug: colSlug },
    });

    if (!collection || !verifyToken(manageToken, collection.manageTokenHash)) {
      throw new UnauthorizedError();
    }

    await prisma.collection.delete({
      where: { id: collection.id },
    });

    return { success: true };
  }

  const db = readDevDb();
  const col = db.collections[colSlug];
  if (!col || !verifyToken(manageToken, col.manageTokenHash)) {
    throw new UnauthorizedError();
  }

  for (const [id, s] of Object.entries(db.snippets)) {
    if (s.collectionId === col.id) {
      delete db.snippets[id];
    }
  }
  delete db.collections[colSlug];
  writeDevDb(db);
  return { success: true };
}

/**
 * Report abuse / inappropriate content
 */
export async function createReport(data: {
  targetType: "COLLECTION" | "SNIPPET";
  targetId: string;
  reason: string;
  details?: string;
}) {
  if (isDatabaseConfigured()) {
    try {
      return await prisma.report.create({
        data: {
          targetType: data.targetType,
          targetId: data.targetId,
          reason: data.reason,
          details: data.details || null,
        },
      });
    } catch {
      // Fallback
    }
  }

  const db = readDevDb();
  const report: StoredReport = {
    id: `rep_${Date.now()}`,
    targetType: data.targetType,
    targetId: data.targetId,
    reason: data.reason,
    details: data.details || null,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  db.reports.push(report);
  writeDevDb(db);
  return report;
}

export interface ReviewItem {
  id: string;
  name: string;
  rating: number;
  review: string;
  createdAt: string;
}

export interface GetReviewsResult {
  reviews: ReviewItem[];
  totalCount: number;
  averageRating: number;
  hasMore: boolean;
}

/**
 * Create a new customer review
 */
export async function createReview(data: {
  name: string;
  rating: number;
  review: string;
}): Promise<ReviewItem> {
  const cleanName = data.name.trim().slice(0, 50);
  const cleanReview = data.review.trim().slice(0, 500);
  const ratingNum = Math.min(5, Math.max(1, Math.round(data.rating)));

  if (isDatabaseConfigured()) {
    try {
      const created = await prisma.review.create({
        data: {
          name: cleanName,
          rating: ratingNum,
          review: cleanReview,
          isApproved: true,
        },
      });
      return {
        id: created.id,
        name: created.name,
        rating: created.rating,
        review: created.review,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (e) {
      console.error("Prisma createReview error, falling back to dev store", e);
    }
  }

  const db = readDevDb();
  if (!db.reviews) db.reviews = [];
  const item: StoredReview = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    rating: ratingNum,
    review: cleanReview,
    isApproved: true,
    createdAt: new Date().toISOString(),
  };
  db.reviews.unshift(item);
  writeDevDb(db);

  return {
    id: item.id,
    name: item.name,
    rating: item.rating,
    review: item.review,
    createdAt: item.createdAt,
  };
}

/**
 * Fetch reviews with pagination and statistics
 */
export async function getReviews(params?: {
  limit?: number;
  offset?: number;
}): Promise<GetReviewsResult> {
  const limit = Math.min(50, Math.max(1, params?.limit || 6));
  const offset = Math.max(0, params?.offset || 0);

  if (isDatabaseConfigured()) {
    try {
      const [totalCount, aggregate, items] = await Promise.all([
        prisma.review.count({ where: { isApproved: true } }),
        prisma.review.aggregate({
          where: { isApproved: true },
          _avg: { rating: true },
        }),
        prisma.review.findMany({
          where: { isApproved: true },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit + 1,
        }),
      ]);

      const hasMore = items.length > limit;
      const returnedItems = hasMore ? items.slice(0, limit) : items;
      const rawAvg = aggregate._avg.rating || 0;
      const averageRating = Number(rawAvg.toFixed(1));

      return {
        reviews: returnedItems.map((r) => ({
          id: r.id,
          name: r.name,
          rating: r.rating,
          review: r.review,
          createdAt: r.createdAt.toISOString(),
        })),
        totalCount,
        averageRating,
        hasMore,
      };
    } catch (e) {
      console.error("Prisma getReviews error, falling back to dev store", e);
    }
  }

  const db = readDevDb();
  const allReviews = (db.reviews || [])
    .filter((r) => r.isApproved)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalCount = allReviews.length;
  const avg =
    totalCount > 0
      ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1))
      : 0;

  const items = allReviews.slice(offset, offset + limit + 1);
  const hasMore = items.length > limit;
  const returnedItems = hasMore ? items.slice(0, limit) : items;

  return {
    reviews: returnedItems.map((r) => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      review: r.review,
      createdAt: r.createdAt,
    })),
    totalCount,
    averageRating: avg,
    hasMore,
  };
}
