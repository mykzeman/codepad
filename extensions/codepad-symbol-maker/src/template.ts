import type { RuleSetSymbolKind } from "./ruleSetTypes";
import { validateSelections, type SymbolSelections } from "./wizard";

const LEFTOVER_PLACEHOLDER = /\{[a-zA-Z0-9_]+\}/;

/**
 * Renders a symbol kind's template with the wizard's selections
 * substituted in. Doubles as a correctness check on the rule file itself:
 * if a template references a placeholder that doesn't correspond to a
 * modifier group id, "type", or "name", rendering fails loudly instead of
 * silently leaving literal "{...}" text in the inserted declaration.
 */
export function renderDeclaration(symbolKind: RuleSetSymbolKind, selections: SymbolSelections): string {
  const errors = validateSelections(symbolKind, selections);
  if (errors.length > 0) {
    throw new Error(`Cannot render declaration: ${errors.join(" ")}`);
  }

  let result = symbolKind.template;

  for (const group of symbolKind.modifiers ?? []) {
    const selected = selections.modifiers?.[group.id] ?? [];
    const text = selected.map((optionId) => group.options.find((option) => option.id === optionId)!.text).join("");
    result = result.split(`{${group.id}}`).join(text);
  }

  if (symbolKind.types && symbolKind.types.length > 0 && selections.type) {
    result = result.split("{type}").join(selections.type);
  }

  result = result.split("{name}").join(selections.name);

  const leftover = result.match(LEFTOVER_PLACEHOLDER);
  if (leftover) {
    throw new Error(
      `Template has an unresolved placeholder: ${leftover[0]}. Check that the rule set's modifier group ids match the template.`,
    );
  }

  return result;
}
