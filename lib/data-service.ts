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
  StoredFutureMessage,
  StoredReport,
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

export interface FutureMessageInput {
  slug: string;
  title: string;
  content: string;
  hint?: string;
  unlockAt: Date;
  manageToken: string;
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
 * FutureMe: Create a time-locked message
 */
export async function createFutureMessage(input: FutureMessageInput) {
  const slug = input.slug.toLowerCase();
  const manageTokenHash = hashToken(input.manageToken);

  if (isDatabaseConfigured()) {
    try {
      const msg = await prisma.futureMessage.create({
        data: {
          slug,
          title: input.title,
          content: input.content,
          hint: input.hint || null,
          unlockAt: input.unlockAt,
          manageTokenHash,
        },
      });
      return msg;
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new DuplicateSlugError("FutureMe link slug is already taken. Try again.");
      }
      throw err;
    }
  }

  const db = readDevDb();
  if (db.futureMessages[slug]) {
    throw new DuplicateSlugError("FutureMe link slug is already taken. Try again.");
  }

  const msgId = `fut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const storedMsg: StoredFutureMessage = {
    id: msgId,
    slug,
    title: input.title,
    content: input.content,
    hint: input.hint || null,
    unlockAt: input.unlockAt.toISOString(),
    manageTokenHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.futureMessages[slug] = storedMsg;
  writeDevDb(db);

  return {
    ...storedMsg,
    unlockAt: new Date(storedMsg.unlockAt),
    createdAt: new Date(storedMsg.createdAt),
    updatedAt: new Date(storedMsg.updatedAt),
  };
}

/**
 * FutureMe: Get message with strict time-lock enforcement
 * CRITICAL: The message content MUST NOT be returned if current time < unlockAt!
 */
export async function getFutureMessage(slug: string) {
  const normSlug = slug.toLowerCase();

  let messageRecord: {
    id: string;
    slug: string;
    title: string;
    content: string;
    hint: string | null;
    unlockAt: Date;
    createdAt: Date;
  } | null = null;

  if (isDatabaseConfigured()) {
    try {
      messageRecord = await prisma.futureMessage.findUnique({
        where: { slug: normSlug },
        select: {
          id: true,
          slug: true,
          title: true,
          content: true,
          hint: true,
          unlockAt: true,
          createdAt: true,
        },
      });
    } catch {
      // Fallback
    }
  }

  if (!messageRecord) {
    const db = readDevDb();
    const mem = db.futureMessages[normSlug];
    if (mem) {
      messageRecord = {
        id: mem.id,
        slug: mem.slug,
        title: mem.title,
        content: mem.content,
        hint: mem.hint || null,
        unlockAt: new Date(mem.unlockAt),
        createdAt: new Date(mem.createdAt),
      };
    }
  }

  if (!messageRecord) return null;

  const now = Date.now();
  const unlockTime = new Date(messageRecord.unlockAt).getTime();
  const isLocked = now < unlockTime;

  if (isLocked) {
    return {
      id: messageRecord.id,
      slug: messageRecord.slug,
      title: messageRecord.title,
      hint: messageRecord.hint,
      unlockAt: messageRecord.unlockAt,
      createdAt: messageRecord.createdAt,
      isLocked: true,
      content: null,
    };
  }

  return {
    id: messageRecord.id,
    slug: messageRecord.slug,
    title: messageRecord.title,
    hint: messageRecord.hint,
    unlockAt: messageRecord.unlockAt,
    createdAt: messageRecord.createdAt,
    isLocked: false,
    content: messageRecord.content,
  };
}

/**
 * Report abuse / inappropriate content
 */
export async function createReport(data: {
  targetType: "COLLECTION" | "SNIPPET" | "FUTURE_MESSAGE";
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
