#!/bin/bash
################################################################################
# diagnose-agent-delegation.sh
#
# Purpose: Comprehensive diagnostic tool for agent delegation issues
# 
# This script checks:
#   - Docker services health
#   - Witness configuration and receipts
#   - KERIA connectivity
#   - OOR holder AID state
#   - Network connectivity between services
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}${'='.repeat(70)}${NC}"
echo -e "${CYAN}AGENT DELEGATION DIAGNOSTIC TOOL${NC}"
echo -e "${CYAN}${'='.repeat(70)}${NC}"
echo ""

# Function to check service health
check_service() {
    local service=$1
    echo -e "${BLUE}Checking $service...${NC}"
    
    if docker compose ps | grep -q "$service.*Up"; then
        local health=$(docker compose ps | grep "$service" | grep -o "healthy\|starting\|unhealthy" || echo "unknown")
        if [ "$health" == "healthy" ]; then
            echo -e "${GREEN}✓ $service is UP and HEALTHY${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ $service is UP but status: $health${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ $service is NOT running${NC}"
        return 1
    fi
}

# Function to check witness
check_witness() {
    local port=$1
    local name=$2
    echo -e "${BLUE}Checking witness $name (port $port)...${NC}"
    
    if curl -s -f "http://127.0.0.1:$port/oobi" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Witness $name is responding${NC}"
        return 0
    else
        echo -e "${RED}✗ Witness $name is not responding${NC}"
        return 1
    fi
}

echo -e "${YELLOW}[1/6] Checking Docker Services Status${NC}"
echo ""

ALL_SERVICES_OK=true

# Check core services
check_service "tsx-shell" || ALL_SERVICES_OK=false
check_service "legentvlei-keria-1" || ALL_SERVICES_OK=false
check_service "legentvlei-witness-1" || ALL_SERVICES_OK=false
check_service "legentvlei-verifier-1" || ALL_SERVICES_OK=false
check_service "vlei_verification" || ALL_SERVICES_OK=false

echo ""
echo -e "${YELLOW}[2/6] Checking Witness Services${NC}"
echo ""

# Check all 6 witnesses
check_witness 5642 "wan"
check_witness 5643 "wil"
check_witness 5644 "wes"
check_witness 5645 "wit"
check_witness 5646 "wub"
check_witness 5647 "wyz"

echo ""
echo -e "${YELLOW}[3/6] Checking KERIA Connectivity${NC}"
echo ""

if curl -s -f "http://127.0.0.1:3902/spec.yaml" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ KERIA API is accessible${NC}"
else
    echo -e "${RED}✗ KERIA API is not accessible${NC}"
    ALL_SERVICES_OK=false
fi

echo ""
echo -e "${YELLOW}[4/6] Checking Recent Docker Logs${NC}"
echo ""

echo -e "${BLUE}Recent tsx-shell logs:${NC}"
docker compose logs --tail=20 tsx-shell

echo ""
echo -e "${BLUE}Recent KERIA logs:${NC}"
docker compose logs --tail=20 keria

echo ""
echo -e "${BLUE}Recent witness logs:${NC}"
docker compose logs --tail=10 witness

echo ""
echo -e "${YELLOW}[5/6] Checking Data Files${NC}"
echo ""

# Check for important data files
if [ -f "./task-data/geda-info.json" ]; then
    GEDA_AID=$(cat ./task-data/geda-info.json | jq -r '.aid' 2>/dev/null || echo "ERROR")
    echo -e "${GREEN}✓ GEDA info found${NC}"
    echo "  AID: $GEDA_AID"
else
    echo -e "${RED}✗ GEDA info not found${NC}"
fi

if [ -f "./task-data/qvi-info.json" ]; then
    QVI_AID=$(cat ./task-data/qvi-info.json | jq -r '.aid' 2>/dev/null || echo "ERROR")
    echo -e "${GREEN}✓ QVI info found${NC}"
    echo "  AID: $QVI_AID"
else
    echo -e "${RED}✗ QVI info not found${NC}"
fi

# Check for agent-related files
echo ""
echo "Agent-related files:"
ls -lh ./task-data/*agent* 2>/dev/null || echo "No agent files found"

echo ""
echo -e "${YELLOW}[6/6] Network Connectivity Tests${NC}"
echo ""

# Test inter-service connectivity
echo -e "${BLUE}Testing service-to-service connectivity...${NC}"

# Test from tsx-shell to keria
if docker compose exec tsx-shell curl -s -f http://keria:3902/spec.yaml > /dev/null 2>&1; then
    echo -e "${GREEN}✓ tsx-shell can reach KERIA${NC}"
else
    echo -e "${RED}✗ tsx-shell cannot reach KERIA${NC}"
    ALL_SERVICES_OK=false
fi

# Test from tsx-shell to witnesses
if docker compose exec tsx-shell curl -s -f http://witness:5642/oobi > /dev/null 2>&1; then
    echo -e "${GREEN}✓ tsx-shell can reach witnesses${NC}"
else
    echo -e "${RED}✗ tsx-shell cannot reach witnesses${NC}"
    ALL_SERVICES_OK=false
fi

echo ""
echo -e "${CYAN}${'='.repeat(70)}${NC}"
echo -e "${CYAN}DIAGNOSTIC SUMMARY${NC}"
echo -e "${CYAN}${'='.repeat(70)}${NC}"
echo ""

if [ "$ALL_SERVICES_OK" = true ]; then
    echo -e "${GREEN}✓ All critical services appear to be functioning${NC}"
    echo ""
    echo "If delegation is still timing out, the issue may be:"
    echo "  1. Witness receipts not being propagated in time"
    echo "  2. OOR holder KEL not being updated properly"
    echo "  3. Network latency between services"
    echo ""
    echo "Try:"
    echo "  • Running the fix script: ./fix-agent-delegation-timeout.sh"
    echo "  • Adding delays between delegation steps"
    echo "  • Checking witness configuration in person AID"
else
    echo -e "${RED}✗ Some services have issues that need attention${NC}"
    echo ""
    echo "Recommended actions:"
    echo "  1. Restart unhealthy services: docker compose restart <service>"
    echo "  2. Check logs for errors: docker compose logs <service>"
    echo "  3. Verify all services are up: docker compose ps"
    echo "  4. Consider full restart: docker compose down && docker compose up -d"
fi

echo ""
echo "Additional debugging commands:"
echo "  • View all logs: docker compose logs -f"
echo "  • Check specific service: docker compose logs -f <service-name>"
echo "  • Restart services: docker compose restart"
echo "  • View witness details: docker compose exec witness ls -la /keripy/scripts/keri/cf/main"
echo ""

exit 0
