# Building the VSCodium fork locally

This records what it actually took to get a Codepad-branded VSCodium build
working on this machine, since several of these steps aren't obvious from
VSCodium's own docs and were genuinely non-trivial to diagnose.

## The vendored checkout lives outside this repo

Clone VSCodium's build-scripts repo to `$HOME/codepad-vscodium-build`, **not**
anywhere under `codepad/` — see "Why outside the workspace" below for why
this is load-bearing, not just tidiness.

```bash
git clone --depth 1 https://github.com/VSCodium/vscodium.git "$HOME/codepad-vscodium-build"
```

`build-codepad.sh` (the driver script in this folder) expects it there by
default; override the location with `CODEPAD_VSCODIUM_DIR` if needed.

## One-time setup

VSCodium's own dependency list ([howto-build.md](https://github.com/VSCodium/vscodium/blob/master/docs/howto-build.md))
covers Git, jq, 7-Zip, Python 3.11, and rustup — install those first. Two
things beyond that list were needed here:

### 1. Node version — use a portable, isolated copy

`vscodium/.nvmrc` pins an exact Node version (currently 24.15.0) that can
differ from whatever Node is installed system-wide. Rather than installing
a version manager (nvm-windows conflicts with a standalone Node install at
the same default path, `C:\Program Files\nodejs`), download a portable
build and keep it local to this repo:

```
curl -L -o build/tools/node24.zip https://nodejs.org/dist/v24.15.0/node-v24.15.0-win-x64.zip
# unzip into build/tools/ (build/tools/ is gitignored)
```

Then prepend it to `PATH` only for build commands (see "Running a build"
below) — this never touches the system's default Node.

### 2. Visual Studio toolchain detection

VS Code's `build/npm/preinstall.ts` checks for Visual Studio by looking for
a `Program Files\Microsoft Visual Studio\2022` or `\2019` folder. A newer
Visual Studio release (installed under a differently-named folder, e.g.
`...\Microsoft Visual Studio\18\Community` for what's marketed as
"Visual Studio 2026") won't be found by that check even though the compiler
works fine — the check hasn't been updated for new VS release folder names.

**Fix**: set `vs2022_install` to the real installation path (found via
`vswhere.exe -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`).
This env var is read explicitly as an override before the folder-name guess.

### 3. Spectre-mitigated libraries

Some native Node modules (`node-gyp`-built, e.g. `@vscode/deviceid`) fail to
link with `MSB8040: Spectre-mitigated libraries are required for this
project` unless that optional VS component is installed. It is **not**
part of the base "Desktop development with C++" workload.

The generic component ID (`Microsoft.VisualStudio.Component.VC.Tools.x86.x64.Spectre`)
may not exist in a given VS release's catalog — check the actual channel
catalog for the ID matching your installed toolset version (visible in
`C:\Program Files\Microsoft Visual Studio\<ver>\Community\VC\Tools\MSVC\<toolset-version>`):

```powershell
# Must run elevated (installer requires it for --quiet) - see below
& "C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe" modify `
  --installPath "C:\Program Files\Microsoft Visual Studio\18\Community" `
  --add Microsoft.VisualStudio.Component.VC.14.51.x86.x64.Spectre `
  --quiet --norestart
```

If the ID is wrong you'll see `Cannot find package: ... in product graph`
in `%TEMP%\dd_installer_*.log` (the command still exits 0, which is
misleading — always check that log, not just the exit code). To find the
correct ID for your toolset, search
`C:\ProgramData\Microsoft\VisualStudio\Packages\_Channels\<id>\catalog.json`
for `Component....Spectre` entries and match the version number to your
installed toolset.

**This requires an elevated (Administrator) terminal.** A non-elevated
`--quiet` modify fails with `Commands with --quiet or --passive should be
run elevated from the beginning` (also exits 0 — check the log). It may
also need Visual Studio's IDE (`devenv.exe`) closed first.

## Why outside the workspace

`build-codepad.sh` merges [`build/product.json`](product.json) (tracked
here) on top of VSCodium's own `product.json` for the Codepad name/identity
fields (`nameShort`, `win32DirName`, app IDs, etc.) — see
[`prepare_vscode.sh`](https://github.com/VSCodium/vscodium/blob/master/prepare_vscode.sh)'s
`jq -s '.[0] * .[1]'` merge step for the mechanism.

The vendored checkout must live **outside** this repo's npm workspace
entirely, not just in a gitignored subfolder. When it was at
`build/vscodium/` (inside this workspace), `tsgo`'s typecheck of vscode's
own `mermaid-markdown-features` extension failed with ~1000 spurious
`Duplicate identifier` errors — it walks up ancestor `node_modules/@types`
directories looking for `vscode`, and found *this repo's own*
`@types/vscode` (a devDependency of `codepad-vscode-extension`) sitting in
the workspace root, colliding with the extension's in-tree `vscode.d.ts`
include. Relocating the checkout outside the workspace's directory chain
entirely fixed it. (Wasted a lot of time first suspecting GitHub API rate
limiting, then an upstream commit regression, and pinning `MS_COMMIT` to
rule that out, before finding the real cause — both are dead ends, not
useful fixes, if this resurfaces.)

## Running a build

```bash
export PATH="/c/Users/mykal/projects/codepad/build/tools/node-v24.15.0-win-x64:/c/Users/mykal/.cargo/bin:/c/Program Files/7-Zip:/c/Users/mykal/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq_Microsoft.Winget.Source_8wekyb3d8bbwe:$PATH"
export vs2022_install="C:\Program Files\Microsoft Visual Studio\18\Community"
./build-codepad.sh
```

Run from anywhere (it `cd`s into `$HOME/codepad-vscodium-build` itself). Use
`-s` on subsequent runs to skip re-fetching the vscode source (it still
resets and reapplies patches and does a full recompile — there's no fast
incremental-resume path after a failure partway through).

A successful build produces a runnable app at
`$HOME/codepad-vscodium-build/VSCode-win32-x64/Codepad.exe` (or
`VSCodium.exe` if built via VSCodium's own unmodified `dev/build.sh`), plus
remote-extension-host builds (`vscode-reh-win32-x64/`,
`vscode-reh-web-win32-x64/`). No installer packages are produced unless
`-p` is passed (skipped by default via `SKIP_ASSETS=yes`).

**Don't `cd` into the vendored checkout and leave your shell sitting
there.** Windows refuses to delete a directory that any process has as its
current working directory — a build's `rm -rf vscode*` step failing with
`Device or resource busy` traced back to exactly that.

## Known flaky step

The `bundle-marketplace-extensions-build` gulp task downloads a few
extensions (js-debug, js-debug-companion, vscode-js-profile-table) from
GitHub. One run failed later in the pipeline with an opaque
`Error: Command failed: npm -v` from `vsce`'s `checkNPM()` — a plain retry
succeeded with no other changes. Root cause wasn't confirmed (GitHub API
rate limiting was checked and ruled out — plenty of quota remained); if it
recurs, it's worth checking whether `GITHUB_TOKEN` being unset is a factor
(the build reads it in `build/lib/fetch.ts` to authenticate GitHub API
calls, but core rate-limit quota wasn't exhausted when this happened).
