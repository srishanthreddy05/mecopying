import fs from "fs";
import path from "path";

const STORE_PATH = path.join(process.cwd(), ".dev-store.json");

export interface StoredCollection {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  visibility: string;
  manageTokenHash: string;
  deletePasswordHash?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSnippet {
  id: string;
  collectionId: string;
  slug: string;
  title: string;
  content: string;
  language: string;
  visibility: string;
  deletePasswordHash?: string | null;
  viewCount: number;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string | null;
  status: string;
  createdAt: string;
}

interface DevDatabase {
  collections: Record<string, StoredCollection>;
  snippets: Record<string, StoredSnippet>;
  reports: StoredReport[];
}

function getInitialData(): DevDatabase {
  return {
    collections: {},
    snippets: {},
    reports: [],
  };
}

export function readDevDb(): DevDatabase {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      const init = getInitialData();
      fs.writeFileSync(STORE_PATH, JSON.stringify(init, null, 2), "utf8");
      return init;
    }
    const content = fs.readFileSync(STORE_PATH, "utf8");
    return JSON.parse(content);
  } catch {
    return getInitialData();
  }
}

export function writeDevDb(data: DevDatabase): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write dev db", err);
  }
}
