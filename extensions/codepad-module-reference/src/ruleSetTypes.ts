/** The subset of a codepad-rules language file this package reads — mirrors the imports part of language-rules.schema.json. */

export interface RuleSetImportEntry {
  readonly path: string;
  readonly label: string;
  readonly description?: string;
}

export interface RuleSetImports {
  /** e.g. "#include <{path}>" or "import {path};" — must contain a "{path}" placeholder. */
  readonly statementTemplate: string;
  readonly insertPosition: "top-of-file" | "after-existing-imports";
  readonly stdlib: readonly RuleSetImportEntry[];
}
