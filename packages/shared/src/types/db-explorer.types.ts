// ── DB Explorer Types (§7/§8 Tab 10) ───────────────────────
// Types for the Dev Portal DB Explorer — readonly browsing of
// tenant MongoDB databases (collections, documents, stats).

/** Summary of a single MongoDB collection */
export interface ICollectionInfo {
  name: string;
  type: 'collection' | 'view';
  documentCount: number;
  avgDocumentSize: number;
  totalSize: number;
  storageSize: number;
  indexCount: number;
  indexes: IIndexInfo[];
}

/** Index information */
export interface IIndexInfo {
  name: string;
  key: Record<string, number>;
  unique: boolean;
  sparse: boolean;
  size: number;
}

/** Database-level statistics */
export interface IDatabaseStats {
  db: string;
  collections: number;
  documents: number;
  dataSize: number;
  storageSize: number;
  indexSize: number;
  avgObjSize: number;
}

/** A single document (readonly view) */
export interface IDocumentResult {
  _id: string;
  [key: string]: unknown;
}

/** Query parameters for documents listing */
export interface IDocumentQuery {
  collection: string;
  filter?: Record<string, unknown>;
  projection?: Record<string, number>;
  sort?: Record<string, 1 | -1>;
  page?: number;
  limit?: number;
}

/** Constants */
export const DB_EXPLORER_DEFAULTS = {
  /** Max documents per page */
  PAGE_LIMIT: 50,
  /** Max filter depth to prevent injection */
  MAX_FILTER_DEPTH: 3,
  /** Collections hidden from explorer */
  HIDDEN_COLLECTIONS: ['system.profile', 'system.views'],
} as const;
