import type { RuleSetModifierGroup, RuleSetSymbolKind } from "./ruleSetTypes";

/**
 * The click-only steps a symbol maker UI walks through for a given
 * symbol kind, derived entirely from its codepad-rules definition — no
 * per-language UI logic. One step per modifier group (in rule-file
 * order), then a type step if the kind lists any, then naming (handled
 * by the on-screen keyboard's predictive word list, not this package).
 */
export type WizardStep =
  | { readonly kind: "modifierGroup"; readonly group: RuleSetModifierGroup }
  | { readonly kind: "type"; readonly options: readonly string[] }
  | { readonly kind: "name" };

export function wizardSteps(symbolKind: RuleSetSymbolKind): WizardStep[] {
  const steps: WizardStep[] = (symbolKind.modifiers ?? []).map((group) => ({ kind: "modifierGroup" as const, group }));

  if (symbolKind.types && symbolKind.types.length > 0) {
    steps.push({ kind: "type", options: symbolKind.types });
  }

  steps.push({ kind: "name" });
  return steps;
}

/** The user's click-only choices as the wizard is walked through. */
export interface SymbolSelections {
  /** Modifier group id -> selected option ids. Single-select groups must have exactly one. */
  readonly modifiers?: Readonly<Record<string, readonly string[]>>;
  readonly type?: string;
  readonly name: string;
}

/**
 * Checks a completed set of selections against the symbol kind's rules
 * before rendering. Every single-select modifier group must have exactly
 * one choice made (even if that choice's text is "", e.g. Kotlin's
 * default-visibility option) — the wizard always shows an explicit
 * selection, only the rendered text may end up empty.
 */
export function validateSelections(symbolKind: RuleSetSymbolKind, selections: SymbolSelections): string[] {
  const errors: string[] = [];

  for (const group of symbolKind.modifiers ?? []) {
    const selected = selections.modifiers?.[group.id] ?? [];
    if (!group.multiple && selected.length !== 1) {
      errors.push(`"${group.label}" requires exactly one selection.`);
    }
    for (const optionId of selected) {
      if (!group.options.some((option) => option.id === optionId)) {
        errors.push(`"${group.label}" has no option "${optionId}".`);
      }
    }
  }

  if (symbolKind.types && symbolKind.types.length > 0) {
    if (!selections.type) {
      errors.push("A type is required.");
    } else if (!symbolKind.types.includes(selections.type)) {
      errors.push(`"${selections.type}" is not a valid type for this symbol kind.`);
    }
  }

  if (!selections.name || selections.name.trim().length === 0) {
    errors.push("A name is required.");
  }

  return errors;
}
