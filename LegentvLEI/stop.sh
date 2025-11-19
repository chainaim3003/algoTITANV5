#!/bin/bash
# stop.sh - teardown script for vLEI workshop module
# Shuts down all components started by deploy.sh

set -e

echo "Stopping vLEI Hackathon 2025 Workshop Environment"

# clean up task-data directory
rm -fv task-data/*.json
rm -fv task-data/*.txt

# Check if docker-compose is available
if ! command -v docker compose &> /dev/null; then
    echo "docker compose not found. Please install docker compose first."
    exit 1
fi

# Stop and remove containers
echo "Stopping and removing containers..."
docker compose down --remove-orphans --volumes

# Remove Docker network
echo "Removing Docker network vlei_workshop..."
docker network rm vlei_workshop 2>/dev/null || echo "Network already removed or doesn't exist"

echo "Environment stopped successfully!"
echo ""
echo "To start the environment again, run ./deploy.sh"
