# Icons

Drop replacement icon source files here (`build/icons/stable/`), same
pattern as `build/product.json` and `build/patches/` — `build-codepad.sh`
copies them into the vendored checkout before every build, so this repo
stays the single source of truth and nothing gets lost on a rebuild.

## What goes here

VSCodium generates every platform icon (Windows `.ico`, macOS `.icns`,
Linux `.png` set) from three source SVGs — replace these:

| File | Used for |
|---|---|
| `stable/codium_cnl.svg` | Main app icon (normal color) — the primary one |
| `stable/codium_clt.svg` | Light-color variant |
| `stable/codium_cnl_w80_b8.svg` | Normal color, scaled to 80% width with an 8pt border |

Once real SVGs land here, generating the actual platform icons needs
`icns2png`, `composite`, `convert` (ImageMagick), `png2icns`, `icotool`,
and `rsvg-convert` via `icons/build_icons.sh` in the vendored checkout —
none of those are installed on this machine yet. Until then, `-p` (the
installer-packaging flag, not used by `build-codepad.sh` by default
anyway) would fall back to VSCodium's own stock icon.
