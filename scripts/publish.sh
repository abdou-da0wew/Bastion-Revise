#!/bin/sh
# Usage: scripts/publish.sh <name> <version> <file> [base-url]
# Requires CELECDN_TOKEN (upload scope). Example:
#   CELECDN_TOKEN=cele_… scripts/publish.sh mytool 1.2.3 ./mytool-linux-x64
set -eu
name=$1; version=$2; file=$3; base=${4:-https://cdn.celestialb.cv}
curl -fsSL -X PUT -H "Authorization: Bearer $CELECDN_TOKEN" \
  -H 'Content-Type: application/octet-stream' --data-binary @"$file" \
  "$base/api/files/$name/$version/$(basename "$file")"
echo
