import type { RuleSetImports } from "./ruleSetTypes";

/** Renders the full import/include statement for a stdlib or project-dependency path. */
export function buildImportStatement(rules: RuleSetImports, path: string): string {
  return rules.statementTemplate.split("{path}").join(path);
}

/**
 * The reverse of buildImportStatement: recovers the path a line was built
 * from, by treating statementTemplate as a fixed prefix/suffix around a
 * single "{path}" placeholder. Returns undefined for lines that don't
 * match the template shape at all (not an import statement, or a
 * different kind of line entirely).
 */
export function parseImportPath(rules: RuleSetImports, line: string): string | undefined {
  const [prefix, suffix] = rules.statementTemplate.split("{path}");
  const trimmed = line.trim();

  if (!trimmed.startsWith(prefix) || !trimmed.endsWith(suffix) || trimmed.length < prefix.length + suffix.length) {
    return undefined;
  }

  return trimmed.slice(prefix.length, trimmed.length - suffix.length);
}

export type ImportPlan =
  | { readonly alreadyPresent: true }
  | { readonly alreadyPresent: false; readonly statement: string; readonly insertIndex: number };

/**
 * Decides whether a path needs a new import statement and, if so, the
 * statement text and where it goes relative to the *other already-existing
 * import lines* the caller passes in (0 = before all of them, N = after
 * all of them — this package only reasons about the import block itself).
 * Where that block anchors within the rest of the file — literally
 * top-of-file for a file with zero imports so far, vs. after a package
 * declaration — needs real document context this package doesn't have;
 * rules.insertPosition is exposed on RuleSetImports for the caller that
 * does have that context to resolve once the extension host exists.
 */
export function planImportInsertion(
  rules: RuleSetImports,
  existingImportLines: readonly string[],
  path: string,
): ImportPlan {
  const alreadyPresent = existingImportLines.some((line) => parseImportPath(rules, line) === path);
  if (alreadyPresent) {
    return { alreadyPresent: true };
  }

  return {
    alreadyPresent: false,
    statement: buildImportStatement(rules, path),
    insertIndex: existingImportLines.length,
  };
}
