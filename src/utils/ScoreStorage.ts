/**
 * ScoreStorage — pure utility for leaderboard persistence.
 * No Phaser dependency. Uses browser localStorage by default.
 */

export interface ScoreEntry {
  name: string;       // 1–12 chars, [a-zA-Z0-9_-]
  score: number;      // non-negative integer
  timestamp: number;  // Date.now() at save time
}

const NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_NAME_LENGTH = 12;
const ALLOWED_CHAR_PATTERN = /^[a-zA-Z0-9_-]$/;

/** Returns true for 1–12 chars matching [a-zA-Z0-9_-]. */
export function isValidName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= MAX_NAME_LENGTH &&
    NAME_PATTERN.test(name)
  );
}

/** Returns true for a single char matching [a-zA-Z0-9_-]. */
export function isAllowedChar(char: string): boolean {
  return char.length === 1 && ALLOWED_CHAR_PATTERN.test(char);
}

/**
 * Validates that a parsed value is a well-formed ScoreEntry array.
 * Each entry must have a string name, numeric score, and numeric timestamp.
 * Returns false if any entry fails — caller should discard all data.
 */
function isValidScoreList(data: unknown): data is ScoreEntry[] {
  if (!Array.isArray(data)) return false;
  for (const entry of data) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof (entry as ScoreEntry).name !== 'string' ||
      typeof (entry as ScoreEntry).score !== 'number' ||
      typeof (entry as ScoreEntry).timestamp !== 'number'
    ) {
      return false;
    }
  }
  return true;
}

/** Sort comparator: descending by score, ascending by timestamp for ties. */
function compareEntries(a: ScoreEntry, b: ScoreEntry): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.timestamp - b.timestamp;
}

export class ScoreStorage {
  private readonly storageKey: string;
  private readonly storage: Storage;
  private readonly maxEntries: number;

  constructor(
    storage?: Storage,
    storageKey?: string,
    maxEntries?: number,
  ) {
    this.storage = storage ?? window.localStorage;
    this.storageKey = storageKey ?? 'beltline_scores';
    this.maxEntries = maxEntries ?? 10;
  }

  /**
   * Save a new score. Returns the full sorted list after insertion.
   * Creates an entry with Date.now() timestamp, inserts into sorted list,
   * trims to maxEntries, and persists.
   */
  saveScore(name: string, score: number): ScoreEntry[] {
    const entry: ScoreEntry = {
      name,
      score,
      timestamp: Date.now(),
    };

    const list = this.getScores();
    list.push(entry);
    list.sort(compareEntries);

    // Trim to maxEntries
    if (list.length > this.maxEntries) {
      list.length = this.maxEntries;
    }

    this.persist(list);
    return list;
  }

  /**
   * Get all stored scores, sorted descending by score
   * (ties: earlier timestamp first). Returns empty array on any failure.
   */
  getScores(): ScoreEntry[] {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (raw === null) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!isValidScoreList(parsed)) return [];

      parsed.sort(compareEntries);
      return parsed;
    } catch {
      return [];
    }
  }

  /** Clear all stored scores. */
  clearScores(): void {
    this.storage.removeItem(this.storageKey);
  }

  /** Persist the list to storage. Logs a warning on failure (e.g. quota exceeded). */
  private persist(list: ScoreEntry[]): void {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(list));
    } catch (err) {
      console.warn('ScoreStorage: failed to persist scores', err);
    }
  }
}
