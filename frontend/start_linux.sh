#!/bin/bash
set -e

echo "===== Linux Frontend Launcher ====="
echo "Checking environment..."

# Wait for apt lock release (simple check)
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
    echo "Waiting for other package installs to finish..."
    sleep 5
done

# Basic check
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install nodejs and npm first."
    exit 1
fi

# Navigate to script dir
cd "$(dirname "$0")"

# Clean windows modules if present (heuristic: bin/vite missing or windows path)
# Resetting is safer to ensure linux binaries
echo "Cleaning old node_modules to ensure compatibility..."
rm -rf node_modules

echo "Installing dependencies (this may take a minute)..."
npm install

echo "Starting Vite Server..."
# Bind to 0.0.0.0 to ensure host access
npm run dev -- --host 0.0.0.0
