# @codepad/onscreen-keyboard

The on-screen code-block keyboard's data layer, ported from the old
standalone WPF overlay's design and adapted to run inside the editor instead
of injecting synthetic keystrokes.

## What's here

- **`keyDefinition.ts`** — the `KeyDefinition` model (`character`, `literal`,
  `command`, `snippet`, `spacer`, `shift`, `capsLock`) and factory functions.
  No `virtualKey` kind and no caret-marker character: text goes in through
  the editor API directly instead of `SendInput`, and VS Code snippets
  already have a final tab stop (`$0`) for where the old app used a caret
  marker. Editing actions that used to be Ctrl/Alt/Win key combos are now a
  single `command` kind naming a real editor command, which is also why
  there's no generic modifier-latch state in this port — each action is
  already a fixed command rather than a combo assembled from held modifiers.
- **`blocks.ts`** — `blocksFromRuleSet()` builds the Blocks panel directly
  from a [`codepad-rules`](../codepad-rules) language file, so switching the
  active file's language swaps the panel with no code change.
- **`prediction/`** — `PredictionEngine`, a faithful port of the old app's
  frequency-ranked word prediction (seeded with a common-English +
  cross-language-keyword dictionary, re-ranked as words are used).
  Persistence is abstracted behind a `WordStore` interface the same way
  input-core abstracts pointer events; a real store backed by the extension
  host's `ExtensionContext.globalState` gets wired in once the extension
  exists.
- **`layouts/`** — the other three panels: `QWERTY_ROWS` (+ `QWERTY_NAV_ROWS`
  / `QWERTY_ARROW_ROWS`), `OPERATOR_ROWS` (Math/Logic), and `MISC_ROWS`
  (copy/cut/paste/undo/redo/select). Ported from `KeyboardLayouts.cs`,
  `MathsLogicLayouts.cs`, and `MiscLayouts.cs`, with keys that only made
  sense for an external overlay controlling any focused app — PrintScreen,
  ScrollLock, Pause, and the generic Ctrl/Alt/Win modifier-latch rows —
  dropped, since there's no editor-command equivalent for them.

## Not yet built

The actual webview UI and the `vscode.TextEditor`/`vscode.commands`
insertion adapter that would make `command`/`snippet`/`character` keys do
something — those need the VSCodium extension host to exist, which hasn't
been started yet. This package is scoped to the parts that are pure logic
and can be built and tested standalone ahead of that.

## Development

```
npm run build   # tsc -b
npm test        # build, then run the node:test suites
```
