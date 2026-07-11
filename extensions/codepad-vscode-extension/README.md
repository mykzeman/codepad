# codepad (VS Code extension)

The extension that actually wires the four `@codepad/*` packages into a
running editor — everything those packages' own READMEs listed as "not yet
built" (a webview UI, the `vscode.TextEditor`/`vscode.commands` insertion
adapter, and real document access for the module reference editor) lives
here.

- **`extension.ts`** — activates on `onStartupFinished` (not lazily on first
  command) since a physically disabled user may not be able to drive the
  keyboard-driven command palette to trigger lazy activation in the first
  place; registers the four commands below.
- **`keyboardPanel.ts`** — `codepad.openKeyboard` opens a webview showing
  QWERTY/Blocks/Math/Misc from `@codepad/onscreen-keyboard`, with Blocks
  built from the active file's `codepad-rules` language. Shift/Caps state
  lives in the webview's own JS; clicks resolve to a normalized message
  (`insertText` / `insertSnippet` / `runCommand`) the extension host applies
  against the last-focused text editor (tracked separately, since focusing
  the webview clears `vscode.window.activeTextEditor`).
- **`symbolMakerCommand.ts`** — `codepad.newSymbol` walks
  `@codepad/symbol-maker`'s `wizardSteps()` via `QuickPick`s (single-select
  for non-multiple modifier groups, multi-select otherwise), names the
  symbol through a `QuickPick` whose item list is re-filled from
  `PredictionEngine.getSuggestions()` on every keystroke (the predictive
  word list, without a custom webview just for naming), then
  `renderDeclaration()`s the result and inserts it as a snippet.
  `codepad.insertSymbolReference` searches the session's `SymbolRegistry`.
- **`moduleReferenceCommand.ts`** — `codepad.insertModuleImport` searches
  the active language's stdlib index, then resolves a real insertion line
  from the document (`planImportInsertion()` only reasons about an
  already-extracted list of import lines; this is where that list comes
  from a real document, and where `top-of-file` vs. an empty
  `after-existing-imports` file gets resolved against a real `package`
  declaration line).
- **`ruleSets.ts`** — bundles `c.json`/`java.json`/`kotlin.json` directly
  into the compiled extension via esbuild's JSON loader, so there's no
  runtime file path to resolve.

## Why a `.vsix` install instead of an in-tree VSCodium build extension

VSCodium's own build (`dev/build.sh`) resets and reapplies patches on every
run (`git reset --hard` inside the vendored `vscode` clone), and its gulp
tasks have specific per-extension bundling configs. Building this as a
normal, standalone extension and installing it into the already-built app
via `codium.cmd --install-extension` is the standard, supported way any
extension gets into a VS Code/VSCodium install — it survives rebuilds of
the vendored tree untouched and doesn't require understanding vscode's
internal build task definitions.

## Development

```
npm run build     # typecheck + esbuild bundle to dist/extension.js
npm run package   # build, then vsce package -> codepad.vsix
```

Install into the local build and verify:

```bash
"../../build/vscodium/VSCode-win32-x64/bin/codium.cmd" --install-extension codepad.vsix --force
"../../build/vscodium/VSCode-win32-x64/VSCodium.exe" --verbose
```

Then check `%APPDATA%\VSCodium\logs\<latest>\window1\exthost\exthost.log`
for `_doActivateExtension codepad.codepad` with no `[error]` lines.

**Always fully close every `VSCodium.exe` process before relaunching to
check logs.** Electron's single-instance lock means a second launch while
one is still running just hands off to the existing window via IPC instead
of starting a fresh session — the new log folder it creates stays empty,
which looks like a failure but isn't one.
