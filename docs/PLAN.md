# Codepad — Project Plan

## Vision

Codepad is a full fork/build of VSCodium — a standalone IDE, not an extension
a user has to separately install — purpose-built for physically disabled
developers who cannot reliably use a physical keyboard. Every core authoring
action (creating a variable, writing a control-flow block, importing a
module) must be reachable through point-based selection alone.

This is an MVP plan: build the smallest thing that actually works for one
input method and three languages, and keep every later addition cheap by
putting language-specific behavior in editable config rather than code.

Decisions locked in (2026-07-10):

| Decision | Choice |
|---|---|
| Relationship to VSCodium | Full fork/build, branded as Codepad, features shipped as bundled built-in extensions (not deep core patches) |
| Input modalities (MVP) | Pointer only, built on a substrate that also supports basic switch scanning and eye-gaze/dwell without a redesign |
| Voice / speech recognition | Out of scope — dropped for maintenance cost, not revisited unless the MVP proves out |
| AT hardware strategy | Input-agnostic (no vendor SDKs; ride on OS-level AT: Windows Eye Control, switch-to-key adapters) |
| Platform | Windows only for v1 |
| MVP languages | C, Java, Kotlin (brace/C-family syntax) |
| Symbol naming | Wizard + on-screen keyboard's predictive word list, not free typing |
| Module reference editor | Stdlib + installed project dependencies (Maven/Gradle, vcpkg/conan) |
| Language-specific behavior | Defined in JSON rule-set files, not hardcoded per-language logic |

## Architecture

**Fork VSCodium for branding and packaging, implement everything as bundled
built-in extensions, not deep core patches.** VS Code/VSCodium already ship
first-party features (Git, Emmet, debuggers) this way — patching
`product.json` for branding/icons/name and shipping Codepad's features as
built-in extensions gets a standalone, controlled product without forking
into `vscode`'s core rendering/editor code. That keeps Codepad rebasable
against upstream VSCodium updates instead of accumulating a diverging patch
set. Core editor behavior (text buffer, LSP, debugging) stays entirely
upstream's — Codepad only adds new panels, commands, and a thin insertion
layer on top of the existing `TextEditor` API.

A from-scratch editor was considered and rejected: it would mean writing a
text buffer, syntax highlighter, and language-server client before any
accessibility feature exists, which is a far larger undertaking than the fork
it was meant to avoid.

### Language rule sets (JSON)

Every place the plan previously had per-language hardcoded logic — block
snippet templates, symbol kind modifiers, import statement syntax, stdlib
indexes — is instead a JSON file the relevant extension reads at runtime:

```
extensions/codepad-rules/
  c.json
  java.json
  kotlin.json
```

Each file defines, for its language: block snippet templates (with a caret
marker), symbol kinds and their available modifiers (visibility, static,
final, etc.) and the template used to render a new symbol declaration, and
import/include syntax plus the stdlib index used by the module reference
editor. Adding a language later, or tweaking how Kotlin renders a `class`
declaration, is a config edit — not a code change. A JSON Schema for this
format ships alongside so the files are validatable and (eventually)
editable through a form UI instead of raw JSON, if that turns out to be
worth building.

### Repo layout (proposed)

```
codepad/
  docs/
    PLAN.md                  (this file)
  build/                     (VSCodium fork build scripts, product.json overrides, branding assets)
  patches/                   (minimal upstream patches, if any prove unavoidable)
  extensions/
    codepad-input-core/      (shared: selection/focus model, scan-order, dwell-click event bus)
    codepad-rules/           (JSON language rule sets + schema)
    codepad-onscreen-keyboard/  (code-block keyboard panel — ported concept from the old WPF app)
    codepad-symbol-maker/     (variable/function/class creation wizard + symbol registry)
    codepad-module-reference/ (stdlib + project-dependency browser, import insertion)
  scripts/                   (dev setup, build, package)
```

`codepad-input-core` is the load-bearing package: every other panel is built
against its selection/focus primitives, so switch scanning and dwell-click
can be added later without redesigning each feature.

## Feature specs

### 1. Selection substrate (`codepad-input-core`)

MVP ships pointer-only (click), but every custom panel exposes an explicit,
linear focus order for its elements rather than relying on ad-hoc DOM click
handlers. That's the one piece of "build for the future" worth doing now,
because retrofitting it into three already-built panels later is real rework
— everything else in this plan is scoped to MVP only.

One internal event, `activate(elementId)`, is what every panel's click
handler actually calls. Basic switch scanning (row/column auto-highlight +
one mapped key to activate) and dwell-click (activate after the pointer
rests on a target) are both just alternate ways of firing that same event —
neither is built in the MVP, but neither requires touching the three feature
panels when it is.

### 2. On-screen code-block keyboard (`codepad-onscreen-keyboard`)

Direct conceptual port of the old WPF app's model, adapted to run as a
webview panel with real editor access instead of key injection:

- Port `KeyDefinition`/`KeyKind` (Character, Literal, VirtualKey, Snippet,
  Spacer, Shift/CapsLock/Ctrl/Alt/Win) as a TypeScript data model.
- Port the layout categories: QWERTY, Blocks (per-language snippet
  templates sourced from `codepad-rules`, with a caret-marker for post-insert
  cursor placement), Math/Logic operators, Misc editing commands
  (copy/cut/paste/undo/redo/select).
- Replace `KeyboardInjector`'s SendInput/clipboard-paste hack with
  `TextEditor.insertSnippet()` (VS Code snippets natively support a `$0`
  final-tab-stop, a drop-in replacement for the old caret marker) — this also
  sidesteps the old auto-bracket duplication problem for free.
- Port word-prediction (`PredictionEngine`, frequency-ranked usage) and feed
  its suggestions into the symbol maker's naming step.
- Single-shot modifier latching behavior carries over unchanged.
- Block layouts are C-family only for MVP (C, Java, Kotlin), all driven by
  the `codepad-rules` JSON rather than one hardcoded layout per language.

### 3. Symbol maker (`codepad-symbol-maker`)

- "New Variable / Function / Class / Parameter / ..." entry points (command
  palette + a dedicated panel), each opening a short wizard: pick
  kind-specific modifiers via click-only menus, sourced from the active
  language's `codepad-rules` entry.
- Naming step reuses the on-screen keyboard's predictive word list — no free
  typing required.
- Every created symbol is registered (name, kind, type, declaring file/scope)
  in a per-project symbol registry. Where the active language has LSP
  support in VSCodium already (C/C++, Java, Kotlin all do), prefer resolving
  against the real language server's symbol index over hand-rolled tracking.
- Reference insertion: a searchable list of existing symbols (filtered by
  kind/scope/recency) that inserts a reference at the cursor on selection.

### 4. Module reference editor (`codepad-module-reference`)

- Per-language browsable index sourced from `codepad-rules`: C standard
  headers, `java.*`/JDK modules, Kotlin stdlib.
- Project-dependency awareness: parse `pom.xml`/`build.gradle(.kts)` for
  Java/Kotlin, `vcpkg.json`/`conanfile.txt` for C, so the browsable list
  reflects what's actually available, not just the stdlib.
- Selecting an entry inserts the correctly-formed statement (`#include`,
  `import`) at the right location, deduplicating against existing imports.

## Phased roadmap (MVP)

1. **Foundations** — VSCodium fork builds locally under Codepad branding
   (`product.json`, icons, name), CI produces a runnable Windows build.
2. **Language rule sets** — JSON schema + `c.json`/`java.json`/`kotlin.json`
   populated with block templates, symbol kinds/modifiers, import syntax.
3. **Input core** — pointer-only `activate(elementId)` event and focus-order
   model, used by every panel from the start.
4. **On-screen keyboard** — QWERTY/Blocks/Math/Misc layouts and prediction,
   Blocks driven by the rule sets.
5. **Symbol maker** — wizard + registry + reference-insertion list, wired to
   LSP symbol data for C/Java/Kotlin, driven by the rule sets.
6. **Module reference editor** — stdlib browsing first, then project
   dependency parsing.
7. **Packaging + QA** — installer, manual accessibility pass (keyboard-only
   and switch-emulator smoke test), documentation.

Switch scanning and eye-gaze/dwell are explicitly **not** in the MVP roadmap
— they're deferred until the pointer-only version is real and used, at which
point they're additions to `codepad-input-core`, not a redesign of the three
feature panels. Voice/speech is dropped from the plan entirely.

## Open risks

- **Fork maintenance cost**: rebasing built-in extensions against upstream
  VSCodium releases is cheap relative to core patches, but still nonzero —
  budget for periodic upstream syncs.
- **LSP symbol data availability** varies by language server; C's LSP
  (clangd) and Kotlin's are less uniformly reliable than Java's — the symbol
  registry needs a fallback path (own tracking) for cases where the language
  server doesn't expose what's needed.
- **Rule-set format churn**: the JSON schema for `codepad-rules` is shared by
  three features (keyboard, symbol maker, module editor) before any of them
  are built — getting the shape wrong early means updating all three later.
  Worth prototyping against just `c.json` before writing `java.json`/
  `kotlin.json`.

## Next steps

- Confirm repo layout above, then scaffold `build/` with the VSCodium fork
  pull + branding patch.
- Draft the `codepad-rules` JSON schema against C only, validate it covers
  blocks + symbol kinds + imports, before replicating to Java/Kotlin.
