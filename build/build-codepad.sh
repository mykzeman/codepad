#!/usr/bin/env bash
# Builds VSCodium under Codepad branding, using build/product.json (this
# repo's tracked override file, not the vendored copy inside
# build/vscodium/) merged on top of VSCodium's own product.json by its
# existing `prepare_vscode.sh` merge step.
#
# Run from anywhere, with the toolchain PATH and vs2022_install already
# set up per build/README.md. Pass -s to skip re-fetching the vscode
# source (still resets and reapplies patches, and still does a full
# recompile - there's no fast incremental-resume after a prior run).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODIUM_DIR="${SCRIPT_DIR}/vscodium"

SKIP_SOURCE="no"
while getopts ":s" opt; do
  case "${opt}" in
    s) SKIP_SOURCE="yes" ;;
    *) ;;
  esac
done

cp "${SCRIPT_DIR}/product.json" "${VSCODIUM_DIR}/product.json"

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

if [[ "${SKIP_SOURCE}" == "no" ]]; then
  rm -rf vscode* VSCode*
  . get_repo.sh
  . version.sh
fi

. build.sh
