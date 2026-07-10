# @codepad/module-reference

Stdlib browsing and import-statement insertion planning for the module
reference editor, driven entirely by `codepad-rules` — no per-language
lookup logic.

- **`stdlibIndex.ts`** — `searchStdlib()` filters a language's stdlib index
  (from `imports.stdlib` in its rule set) by path, label, or description, so
  e.g. searching "printf" finds C's `stdio.h` even though "printf" only
  appears in its description.
- **`importStatement.ts`** — `buildImportStatement()` renders the real
  syntax (`#include <stdio.h>`, `import java.util.List;`, `import
  kotlin.collections.List`) from a path and the rule set's
  `statementTemplate`. `parseImportPath()` reverses that, so an existing
  line in the file can be checked against a path without re-parsing the
  language properly. `planImportInsertion()` combines both to decide
  whether a path needs a new statement and, if so, where it goes relative
  to the other import lines already in the file.

## Scope

Per the plan, this phase is stdlib browsing first — done here. Project-
dependency parsing (reading `pom.xml`/`build.gradle(.kts)` for Java/Kotlin,
`vcpkg.json`/`conanfile.txt` for C, so the browsable list reflects what's
actually installed, not just the stdlib) is a later addition to this same
package.

`planImportInsertion()` only reasons about the list of *existing import
lines* the caller passes in, returning an index within that list. Where an
empty import block anchors in a file that has none yet (literally
top-of-file for C vs. after a Java package declaration) needs real document
access this package doesn't have — `RuleSetImports.insertPosition` is
exposed for whatever does have that context once the extension host exists.

## Development

```
npm run build   # tsc -b
npm test        # build, then run the node:test suites
```
