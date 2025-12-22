/**
 * File Hash Utilities
 *
 * Computes fast file hashes for cache validation.
 * Uses a combination of file stats (mtime, size) for speed,
 * with optional content hash for accuracy.
 */

import * as fs from "fs/promises";
import * as crypto from "crypto";
import type { FileHashInfo } from "./types.js";

/**
 * Compute a fast hash based on file stats (mtime + size)
 * This is fast but may miss in-place edits with same size
 *
 * @param filePath - Path to the file
 * @returns FileHashInfo or null if file doesn't exist
 */
export async function computeFastFileHash(
  filePath: string
): Promise<FileHashInfo | null> {
  try {
    const stats = await fs.stat(filePath);
    const hash = `${stats.mtimeMs}-${stats.size}`;
    return {
      hash,
      mtime: stats.mtimeMs,
      size: stats.size,
    };
  } catch {
    return null;
  }
}

/**
 * Compute a content-based hash (slower but accurate)
 * Use for critical files or when fast hash fails validation
 *
 * @param filePath - Path to the file
 * @returns MD5 hash string or null if file doesn't exist
 */
export async function computeContentHash(
  filePath: string
): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash("md5").update(content).digest("hex");
  } catch {
    return null;
  }
}

/**
 * Validate if a file has changed since the hash was computed
 *
 * @param filePath - Path to the file
 * @param storedHash - Previously computed hash to compare against
 * @returns true if file is unchanged, false if changed or doesn't exist
 */
export async function validateFileHash(
  filePath: string,
  storedHash: string
): Promise<boolean> {
  const currentHash = await computeFastFileHash(filePath);
  if (!currentHash) return false;
  return currentHash.hash === storedHash;
}
