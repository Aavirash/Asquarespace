#!/bin/bash
# sync-x-bookmarks.sh - Full X bookmarks sync pipeline
# Usage: ./sync-x-bookmarks.sh <supabase-token> [browser]
#
# This script:
# 1. Runs ft sync to fetch new bookmarks from X
# 2. Exports them to bookmarks-data.json
# 3. Pushes new items to Supabase (deduplicated)

SUPERBASE_TOKEN="$1"
BROWSER="${2:-dia}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$SUPERBASE_TOKEN" ]; then
  echo "ERROR: Supabase token required"
  echo "Usage: $0 <supabase-token> [browser]"
  exit 1
fi

echo "=== X Bookmarks Sync Pipeline ==="
echo "Browser: $BROWSER"
echo ""

# Step 1: Sync bookmarks from X
echo "Step 1: Fetching bookmarks from X..."
ft sync --browser "$BROWSER"
if [ $? -ne 0 ]; then
  echo "ERROR: ft sync failed. Make sure you're logged into X in $BROWSER."
  exit 1
fi
echo ""

# Step 2: Export to JSON
echo "Step 2: Exporting bookmarks to JSON..."
node "$SCRIPT_DIR/export-bookmarks.js" "$SCRIPT_DIR/bookmarks-data.json"
if [ $? -ne 0 ]; then
  echo "ERROR: export-bookmarks.js failed"
  exit 1
fi
echo ""

# Step 3: Push to Supabase
echo "Step 3: Pushing new items to Supabase..."
node "$SCRIPT_DIR/push-to-supabase.js" "$SCRIPT_DIR/bookmarks-data.json" "$SUPERBASE_TOKEN"
if [ $? -ne 0 ]; then
  echo "ERROR: push-to-supabase.js failed"
  exit 1
fi
echo ""

echo "=== Sync complete ==="
