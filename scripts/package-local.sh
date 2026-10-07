#!/usr/bin/env bash
set -euo pipefail

target="${1:-linux-x64}"
case "$target" in
  linux-x64) pkg_target="node22-linux-x64" ;;
  macos-x64) pkg_target="node22-macos-x64" ;;
  macos-arm64) pkg_target="node22-macos-arm64" ;;
  *) echo "Usage: $0 linux-x64|macos-x64|macos-arm64" >&2; exit 2 ;;
esac

export JWT_SECRET="build-only-secret"
export NODE_ENV=production
export PKG_CACHE_PATH="${PKG_CACHE_PATH:-/tmp/passkeys-pkg-cache}"
node scripts/ensure-local-user.mjs
npm run build
node scripts/prepare-package.mjs
node scripts/bundle-server.mjs

output="dist/passkeys-$target"
rm -rf "$output"
mkdir -p "$output"
npx pkg --target "$pkg_target" --output "$output/passkeys" scripts/local-server.cjs
cp -R build "$output/build"
cat > "$output/README.txt" <<'EOF'
Passkeys local server

Run ./passkeys, then open http://localhost:54123 in a browser.
Server data is stored in ~/.config/passkeys.

Environment overrides: PASSKEYS_DATA_DIR, JWT_SECRET, HOST, PORT, ORIGIN.
EOF
chmod +x "$output/passkeys"
echo "Created $output/passkeys"
