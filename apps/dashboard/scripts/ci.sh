#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo ""
echo "  Bastion CI"
echo "  =========="
echo ""

# ── Step 1: TypeScript ──
echo "  [1/2] TypeScript check..."
bunx tsc --noEmit
echo "  [1/2] PASS"
echo ""

# ── Step 2: Build ──
echo "  [2/2] Production build..."
if command -v node &>/dev/null; then
  npx next build
elif command -v nodejs &>/dev/null; then
  nodejs "$(bun pm bin next)" build
else
  echo "  FAIL: Node.js required for next build."
  echo "  Install Node.js v22+, or run 'bun run build' (may fail with Bun)."
  exit 1
fi
echo "  [2/2] PASS"
echo ""
echo "  All checks passed."
echo ""
