#!/bin/bash

###############################################################################
# Immo-Score - Temporary Files Cleanup Script
#
# This script removes all temporary and debug files from the project to
# maintain code cleanliness and prevent accidental commits of debug artifacts.
###############################################################################

set -e

echo "🧹 Starting cleanup of temporary files..."

# Counter for deleted files
deleted_count=0

# Function to safely delete files matching pattern
delete_files() {
  local pattern=$1
  local description=$2

  echo "  Searching for ${description}..."

  # Find and delete files, counting deletions
  while IFS= read -r -d '' file; do
    if [ -f "$file" ]; then
      rm -f "$file"
      ((deleted_count++))
      echo "    ✓ Deleted: $file"
    fi
  done < <(find . -type f -name "$pattern" ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/dist/*" -print0 2>/dev/null)
}

# Function to delete empty directories
delete_empty_dirs() {
  echo "  Removing empty directories..."

  local empty_dirs
  empty_dirs=$(find . -type d -empty ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/.git/*" 2>/dev/null)

  if [ -n "$empty_dirs" ]; then
    echo "$empty_dirs" | while read -r dir; do
      if [ -d "$dir" ]; then
        rmdir "$dir" 2>/dev/null && echo "    ✓ Removed empty dir: $dir" || true
      fi
    done
  fi
}

# Delete log files
delete_files "*.log" "log files"

# Delete temporary files
delete_files "*.tmp" "temporary .tmp files"
delete_files "*.temp" "temporary .temp files"

# Delete debug files
delete_files "debug-*.json" "debug JSON files"
delete_files "debug-*.txt" "debug text files"
delete_files "console-*.txt" "console output files"
delete_files "console-*.log" "console log files"

# Delete test output files
delete_files "test-output-*" "test output files"

# Delete OS-specific files
delete_files ".DS_Store" "macOS metadata files"
delete_files "Thumbs.db" "Windows thumbnail cache"
delete_files "desktop.ini" "Windows desktop config"

# Delete editor swap files
delete_files "*.swp" "Vim swap files"
delete_files "*.swo" "Vim swap files"
delete_files "*~" "editor backup files"

# Clean up empty directories
delete_empty_dirs

# Clean Next.js cache
if [ -d ".next/cache" ]; then
  echo "  Cleaning Next.js cache..."
  rm -rf .next/cache
  echo "    ✓ Cleared .next/cache"
fi

# Clean node_modules cache
if [ -d "node_modules/.cache" ]; then
  echo "  Cleaning node_modules cache..."
  rm -rf node_modules/.cache
  echo "    ✓ Cleared node_modules/.cache"
fi

echo ""
echo "✅ Cleanup completed!"
echo "   Total files deleted: ${deleted_count}"
echo ""
