import cRules from "../../codepad-rules/c.json";
import javaRules from "../../codepad-rules/java.json";
import kotlinRules from "../../codepad-rules/kotlin.json";
import type { RuleSetWithBlocks } from "@codepad/onscreen-keyboard";
import type { RuleSetSymbolKind } from "@codepad/symbol-maker";
import type { RuleSetImports } from "@codepad/module-reference";

/** The full shape of one codepad-rules language file, as bundled at build time via esbuild's JSON loader. */
export interface RuleSet extends RuleSetWithBlocks {
  readonly languageId: string;
  readonly displayName: string;
  readonly symbolKinds: readonly RuleSetSymbolKind[];
  readonly imports: RuleSetImports;
}

const RULE_SETS: Record<string, RuleSet> = {
  c: cRules as RuleSet,
  java: javaRules as RuleSet,
  kotlin: kotlinRules as RuleSet,
};

/** Looks up the rule set for a VS Code document languageId (e.g. "c", "java", "kotlin"), or undefined if unsupported. */
export function ruleSetForLanguage(languageId: string): RuleSet | undefined {
  return RULE_SETS[languageId];
}
