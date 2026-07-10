# @codepad/symbol-maker

The "create a variable/function/class without typing, reference it later
without retyping" feature, split into three pieces:

- **`wizard.ts`** — `wizardSteps()` derives the click-only step order (one
  per modifier group, then a type step if the kind has any, then naming)
  straight from a `codepad-rules` symbol kind — no per-language wizard
  logic. `validateSelections()` checks a completed set of choices before
  rendering: single-select modifier groups must have exactly one choice
  (even a "(default)" one with empty substituted text), multiple-select
  groups may have zero, a type is required whenever the kind lists any, and
  a name is always required.
- **`template.ts`** — `renderDeclaration()` substitutes the wizard's
  selections into the symbol kind's template. It doubles as a check on the
  rule file itself: if the template references a placeholder that doesn't
  match a modifier group id, `type`, or `name`, rendering throws instead of
  silently leaving literal `{...}` text in the inserted declaration.
- **`registry.ts`** — `SymbolRegistry`, the per-project store of created
  symbols, searchable by language/kind/scope/name-substring, most recent
  first. This is the hand-rolled fallback the plan calls out: once the
  extension host and real language servers exist, lookups should prefer
  resolving against a language's own LSP symbol index where one exists, and
  fall back to this registry where it doesn't (C/Kotlin's LSPs are less
  uniformly reliable than Java's) or for symbols the wizard just created
  that the language server hasn't reanalyzed yet.

Naming itself isn't implemented in this package — per the plan, it reuses
[`@codepad/onscreen-keyboard`](../codepad-onscreen-keyboard)'s
`PredictionEngine` so the "name" wizard step never requires free typing.

## Not yet built

The actual wizard UI (webview panel walking `wizardSteps()`), the
reference-insertion picker UI over `SymbolRegistry.search()`, and the LSP
integration for languages that have one — all need the VSCodium extension
host, which hasn't been started yet.

## Development

```
npm run build   # tsc -b
npm test        # build, then run the node:test suites
```
