/** The subset of a codepad-rules language file this package reads — mirrors the symbolKind part of language-rules.schema.json. */

export interface RuleSetModifierOption {
  readonly id: string;
  readonly label: string;
  /** Literal text substituted into the template when this option is selected — may be "" (e.g. Kotlin's default-visibility option). */
  readonly text: string;
}

export interface RuleSetModifierGroup {
  readonly id: string;
  readonly label: string;
  readonly multiple?: boolean;
  readonly options: readonly RuleSetModifierOption[];
}

export interface RuleSetSymbolKind {
  readonly id: string;
  readonly label: string;
  readonly modifiers?: readonly RuleSetModifierGroup[];
  readonly types?: readonly string[];
  readonly template: string;
}
