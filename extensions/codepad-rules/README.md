# codepad-rules

JSON rule sets describing language-specific behavior for the on-screen
keyboard's Blocks panel, the symbol maker wizard, and the module reference
editor. Nothing in this package is executable — it's read by those three
extensions at runtime — so adding or tweaking language support is a config
edit, not a code change.

Each `<languageId>.json` file conforms to
[`schema/language-rules.schema.json`](schema/language-rules.schema.json) and
defines:

- **`blocks`** — quick-insert code skeletons shown on the on-screen
  keyboard's Blocks panel, as standard VS Code snippet bodies (`${1:...}`
  tab-stops, final `$0` for the resting caret).
- **`symbolKinds`** — the kinds of symbol the symbol maker wizard can create
  (variable, function, struct/class, ...), each with optional modifier
  groups (storage class, visibility, ...) and a declaration template built
  from the wizard's selections.
- **`imports`** — the import/include statement format, where it gets
  inserted, and the browsable standard-library index for the module
  reference editor.

`c.json` is the first rule set and doubles as the schema's proving ground —
validate any schema change against it before replicating the shape to
`java.json` / `kotlin.json`.

## Adding a language

1. Copy `c.json` as a starting point.
2. Set `languageId` to the VS Code language identifier and `fileExtensions`
   to match.
3. Replace `blocks` with that language's control-flow/definition snippets.
4. Replace `symbolKinds` with the kinds that make sense for the language
   (Java/Kotlin add visibility modifiers and real classes, for instance).
5. Replace `imports` with the language's import syntax and stdlib index.
6. Run `node scripts/validate-rules.js` from the repo root to check the file
   against the schema before committing.
