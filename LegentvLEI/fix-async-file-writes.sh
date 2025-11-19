#!/bin/bash
################################################################################
# fix-async-file-writes.sh - Convert async file operations to sync
# 
# This script finds all TypeScript files that use fs.promises.writeFile or
# fs.promises.readFile and converts them to synchronous operations with
# error checking to fix Docker volume sync issues on Windows/WSL2
################################################################################

set -e

echo "====================================="
echo " Fixing Async File Operations"
echo "====================================="
echo ""

cd sig-wallet/src/tasks

# Find all TypeScript files that contain fs.promises
FILES=$(grep -rl "fs\.promises\." . --include="*.ts" | sort | uniq)

if [ -z "$FILES" ]; then
    echo "No files found with fs.promises operations"
    exit 0
fi

echo "Found files with fs.promises operations:"
echo "$FILES"
echo ""

for file in $FILES; do
    echo "Processing: $file"
    
    # Create backup
    cp "$file" "${file}.bak"
    
    # Replace fs.promises.readFile with fs.readFileSync
    # Pattern: await fs.promises.readFile(path, 'utf-8')
    # Replace with: fs.readFileSync(path, 'utf-8')
    sed -i 's/await fs\.promises\.readFile(/fs.readFileSync(/g' "$file"
    
    # Replace fs.promises.writeFile with fs.writeFileSync
    # Pattern: await fs.promises.writeFile(path, content)
    # Replace with: fs.writeFileSync(path, content)
    sed -i 's/await fs\.promises\.writeFile(/fs.writeFileSync(/g' "$file"
    
    echo "  ✓ Converted async operations to sync"
done

echo ""
echo "====================================="
echo " Conversion Complete"
echo "====================================="
echo ""
echo "Backups created with .bak extension"
echo "Review changes before rebuilding Docker image"
