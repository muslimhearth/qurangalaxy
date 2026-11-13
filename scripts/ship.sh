#!/usr/bin/env bash
# Builds the app and uploads it to the web server.
# Usage: DEPLOY_TARGET=user@host:qurangalaxy/web pnpm ship
set -euo pipefail
: "${DEPLOY_TARGET:?Set DEPLOY_TARGET, e.g. user@host:qurangalaxy/web}"
# The search model is not in git: fetch it into public/models so the build includes it.
pnpm models
pnpm build
# --delete removes files of older builds; checksums skip unchanged files.
rsync -az --delete --checksum dist/ "$DEPLOY_TARGET/"
echo "Uploaded dist/ to $DEPLOY_TARGET"
