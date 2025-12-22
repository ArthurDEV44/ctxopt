/**
 * Smart Cache Types
 *
 * Type definitions for the LRU cache with TTL and file hash validation.
 */

/**
 * A single cache entry with metadata
 */
export interface CacheEntry<T = unknown> {
  /** The cached value */
  value: T;

  /** When this entry was created (timestamp) */
  createdAt: number;

  /** When this entry was last accessed (for LRU eviction) */
  lastAccessedAt: number;

  /** TTL in milliseconds (entry-specific, overrides default) */
  ttl?: number;

  /** File hash for validation (optional, used for file-based caches) */
  fileHash?: string;

  /** Original file path (if applicable) */
  filePath?: string;

  /** Size in bytes (approximate, for memory tracking) */
  sizeBytes: number;

  /** Token count (for stats tracking) */
  tokenCount?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of entries */
  entries: number;

  /** Cache hits since session start */
  hits: number;

  /** Cache misses since session start */
  misses: number;

  /** Hit rate percentage (0-100) */
  hitRate: number;

  /** Total tokens saved via cache hits */
  tokensSaved: number;

  /** Approximate memory usage in bytes */
  memorySizeBytes: number;

  /** Number of entries evicted (LRU or TTL) */
  evictions: number;

  /** Number of entries invalidated due to file change */
  invalidations: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum number of entries (default: 100) */
  maxEntries: number;

  /** Default TTL in milliseconds (default: 30 minutes) */
  defaultTtlMs: number;

  /** Maximum memory size in bytes (default: 50MB) */
  maxMemoryBytes: number;

  /** Enable file hash validation (default: true) */
  enableFileHashValidation: boolean;

  /** Cleanup interval in operations (default: 50) */
  cleanupInterval: number;
}

/**
 * Options for setting a cache entry
 */
export interface SmartCacheOptions {
  /** Optional TTL override for this entry */
  ttl?: number;

  /** File path for hash validation */
  filePath?: string;

  /** Pre-computed file hash (if already available) */
  fileHash?: string;

  /** Token count for stats */
  tokenCount?: number;
}

/**
 * Cache key type
 */
export type CacheKey = string;

/**
 * Result of a cache get operation
 */
export interface CacheGetResult<T> {
  /** Whether the entry was found and valid */
  hit: boolean;

  /** The cached value (undefined if miss) */
  value?: T;

  /** Reason for miss (if applicable) */
  missReason?: "not_found" | "expired" | "file_changed" | "evicted";
}

/**
 * File hash information
 */
export interface FileHashInfo {
  /** The computed hash string */
  hash: string;

  /** File modification time in milliseconds */
  mtime: number;

  /** File size in bytes */
  size: number;
}
