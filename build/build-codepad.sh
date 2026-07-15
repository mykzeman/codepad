#!/usr/bin/env bash
# Builds VSCodium under Codepad branding, using build/product.json (this
# repo's tracked override file) merged on top of VSCodium's own
# product.json by its existing `prepare_vscode.sh` merge step.
#
# The vendored VSCodium/vscode checkout lives OUTSIDE this repo entirely
# (default: $HOME/codepad-vscodium-build, override with
# CODEPAD_VSCODIUM_DIR) - it must not be anywhere under this workspace's
# npm workspace root. tsgo's typecheck of vscode's own
# mermaid-markdown-features extension walks up ancestor node_modules/@types
# directories looking for "vscode" and picks up this repo's own
# @types/vscode (a devDependency of codepad-vscode-extension) if the
# vendored tree is nested inside the workspace, producing hundreds of
# spurious duplicate-identifier errors against the extension's in-tree
# vscode.d.ts include. Confirmed by relocating outside the workspace.
#
# Run from anywhere, with the toolchain PATH and vs2022_install already
# set up per build/README.md. Pass -s to skip re-fetching the vscode
# source (still resets and reapplies patches, and still does a full
# recompile - there's no fast incremental-resume after a prior run).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODIUM_DIR="${CODEPAD_VSCODIUM_DIR:-${HOME}/codepad-vscodium-build}"

if [[ ! -d "${VSCODIUM_DIR}" ]]; then
  echo "Error: ${VSCODIUM_DIR} not found. Clone it first:"
  echo "  git clone --depth 1 https://github.com/VSCodium/vscodium.git \"${VSCODIUM_DIR}\""
  exit 1
fi

SKIP_SOURCE="no"
while getopts ":s" opt; do
  case "${opt}" in
    s) SKIP_SOURCE="yes" ;;
    *) ;;
  esac
done

cp "${SCRIPT_DIR}/product.json" "${VSCODIUM_DIR}/product.json"

# Codepad's own source patches (welcome page, tagline, etc.), applied last
# by prepare_vscode.sh via its designated `patches/user/` hook, on top of
# VSCodium's own patches. Cleared and repopulated each run so a patch
# removed from build/patches/user/ doesn't linger in the vendored tree.
mkdir -p "${VSCODIUM_DIR}/patches/user"
rm -f "${VSCODIUM_DIR}/patches/user/"*.patch
cp "${SCRIPT_DIR}/patches/user/"*.patch "${VSCODIUM_DIR}/patches/user/"

# Icon source SVGs (build/icons/README.md) - copied over only once real
# files are dropped in; the README alone has nothing to copy.
if compgen -G "${SCRIPT_DIR}/icons/stable/*.svg" > /dev/null; then
  cp "${SCRIPT_DIR}/icons/stable/"*.svg "${VSCODIUM_DIR}/icons/stable/"
fi

cd "${VSCODIUM_DIR}"

export APP_NAME="Codepad"
export ASSETS_REPOSITORY="VSCodium/vscodium"
export BINARY_NAME="codepad"
export CI_BUILD="no"
export GH_REPO_PATH="VSCodium/vscodium"
export ORG_NAME="Codepad"
export SHOULD_BUILD="yes"
export SKIP_ASSETS="yes"
export SKIP_BUILD="no"
export SKIP_SOURCE="${SKIP_SOURCE}"
export VSCODE_LATEST="no"
export VSCODE_QUALITY="stable"
export VSCODE_SKIP_NODE_VERSION_CHECK="yes"

case "${OSTYPE}" in
  darwin*)
    export OS_NAME="osx"
    ;;
  msys* | cygwin*)
    export OS_NAME="windows"
    ;;
  *)
    export OS_NAME="linux"
    ;;
esac

UNAME_ARCH=$(uname -m)
if [[ "${UNAME_ARCH}" == "aarch64" || "${UNAME_ARCH}" == "arm64" ]]; then
  export VSCODE_ARCH="arm64"
else
  export VSCODE_ARCH="x64"
fi

export NODE_OPTIONS="--max-old-space-size=8192"

echo "Building Codepad (APP_NAME=${APP_NAME}, BINARY_NAME=${BINARY_NAME}, SKIP_SOURCE=${SKIP_SOURCE})"

BUILD_ENV_FILE="${VSCODIUM_DIR}/.codepad-build.env"

if [[ "${SKIP_SOURCE}" == "no" ]]; then
  rm -rf vscode* VSCode*
  . get_repo.sh
  . version.sh

  # get_repo.sh/version.sh only export these into this process; -s runs
  # need them too but skip both scripts, so cache them here. Without this,
  # RELEASE_VERSION stays empty on a -s run, prepare_vscode.sh writes an
  # empty package.json "version", and packaging fails late with an opaque
  # `rcedit.exe ... Unable to parse version string for FileVersion`.
  {
    echo "MS_TAG=\"${MS_TAG}\""
    echo "MS_COMMIT=\"${MS_COMMIT}\""
    echo "RELEASE_VERSION=\"${RELEASE_VERSION}\""
    echo "BUILD_SOURCEVERSION=\"${BUILD_SOURCEVERSION}\""
  } > "${BUILD_ENV_FILE}"
else
  if [[ ! -f "${BUILD_ENV_FILE}" ]]; then
    echo "Error: ${BUILD_ENV_FILE} not found - run without -s at least once first."
    exit 1
  fi
  . "${BUILD_ENV_FILE}"
  export MS_TAG MS_COMMIT RELEASE_VERSION BUILD_SOURCEVERSION

  # prepare_vscode.sh (called from build.sh) reapplies patches
  # unconditionally on every run, so a prior run's patched tree must be
  # reset back to its pre-patch state first, or the reapply fails against
  # an already-modified tree. Mirrors dev/build.sh's own -s handling.
  cd vscode || { echo "'vscode' dir not found"; exit 1; }
  git add .
  git reset -q --hard HEAD
  while [[ -n "$(git log -1 | grep "VSCODIUM HELPER")" ]]; do
    git reset -q --hard HEAD~
  done
  rm -rf .build out*
  cd ..
fi

# Regenerates resources/win32/code.ico from build/icons/stable/codium_cnl.svg
# so build.sh's own packaging step (which calls rcedit against that file)
# embeds Codepad's icon instead of VSCodium's stock one. Must run after
# vscode/ exists (both branches above ensure that) and before build.sh.
# Requires Pillow (`python3 -m pip install --user Pillow`); skips quietly
# if python3 or Pillow aren't available, leaving the stock icon in place.
if command -v python3 &> /dev/null && python3 -c "import PIL" &> /dev/null; then
  python3 "${SCRIPT_DIR}/generate-icons.py" "${VSCODIUM_DIR}"
else
  echo "python3/Pillow not available - skipping icon generation, stock icon will be used."
fi

# The custom title bar's own icon (rendered as part of the web UI, not the
# native window icon - untouched by the .ico work above) is just a plain
# SVG file, no rasterization needed. VSCodium's own icons/build_icons.sh
# would populate this from codium_clt.svg too if we ran it; since we don't,
# copy it directly.
if [[ -f "${SCRIPT_DIR}/icons/stable/codium_clt.svg" ]]; then
  cp "${SCRIPT_DIR}/icons/stable/codium_clt.svg" "vscode/src/vs/workbench/browser/media/code-icon.svg"
fi

. build.sh
