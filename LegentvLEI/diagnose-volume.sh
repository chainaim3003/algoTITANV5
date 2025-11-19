#!/bin/bash
################################################################################
# diagnose-volume.sh - Diagnose task-data volume mount issues
################################################################################

set -e

echo "====================================="
echo " Docker Volume Mount Diagnostic"
echo "====================================="
echo ""

echo "1. Testing host filesystem..."
echo "test-from-host-$(date +%s)" > ./task-data/test-host.txt
ls -la ./task-data/
echo ""

echo "2. Testing container filesystem (tsx-shell)..."
docker compose exec tsx-shell sh -c "
    echo 'Testing write from tsx-shell container'
    echo 'test-from-container-$(date +%s)' > /task-data/test-container.txt
    ls -la /task-data/
    cat /task-data/test-container.txt
"
echo ""

echo "3. Checking if container files are visible on host..."
ls -la ./task-data/
echo ""

echo "4. Testing Node.js fs.writeFile synchronously..."
docker compose exec tsx-shell node -e "
const fs = require('fs');
const path = '/task-data/test-node-sync.txt';
console.log('Writing to:', path);
fs.writeFileSync(path, 'test from node sync');
console.log('File written');
const files = fs.readdirSync('/task-data');
console.log('Files in /task-data:', files);
"
echo ""

echo "5. Checking host again..."
ls -la ./task-data/
echo ""

echo "6. Testing Node.js fs.promises.writeFile (as used in TypeScript)..."
docker compose exec tsx-shell node -e "
const fs = require('fs');
const path = '/task-data/test-node-async.txt';
console.log('Writing to:', path);
fs.promises.writeFile(path, 'test from node async')
  .then(() => {
    console.log('File written successfully');
    return fs.promises.readdir('/task-data');
  })
  .then(files => {
    console.log('Files in /task-data:', files);
  })
  .catch(err => {
    console.error('Error:', err);
  });
" && sleep 2
echo ""

echo "7. Final check on host..."
ls -la ./task-data/
echo ""

echo "8. Inspecting docker volume mount..."
docker compose exec tsx-shell df -h | grep task-data || echo "No task-data mount found"
echo ""

echo "9. Checking mount points in container..."
docker compose exec tsx-shell mount | grep task-data || echo "No task-data mount found"
echo ""

echo "====================================="
echo " Diagnostic Complete"
echo "====================================="
