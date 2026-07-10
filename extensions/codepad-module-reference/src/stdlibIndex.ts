import type { RuleSetImportEntry } from "./ruleSetTypes";

/**
 * Browses a language's stdlib index straight from codepad-rules — no
 * per-language browsing logic. Matches against path, label, and
 * description, so searching "print" finds C's stdio.h via its
 * description even though "print" isn't in the path or label.
 */
export function searchStdlib(entries: readonly RuleSetImportEntry[], query = "", limit = 20): RuleSetImportEntry[] {
  const lowerQuery = query.trim().toLowerCase();

  const matches = lowerQuery
    ? entries.filter(
        (entry) =>
          entry.path.toLowerCase().includes(lowerQuery) ||
          entry.label.toLowerCase().includes(lowerQuery) ||
          (entry.description?.toLowerCase().includes(lowerQuery) ?? false),
      )
    : entries.slice();

  return matches.slice(0, limit);
}
