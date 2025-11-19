#!/bin/bash
# diagnose-hang.sh - Find out WHY geda-aid-create.sh is hanging

echo "================================================"
echo "Diagnosing geda-aid-create.sh Hang Issue"
echo "================================================"
echo ""

echo "1. Checking Docker containers..."
echo "--------------------------------"
echo ""
echo "tsx-shell container:"
docker ps --filter "name=tsx_shell" --format "  Status: {{.Status}}" || echo "  NOT FOUND"

echo ""
echo "keria container:"
docker ps --filter "name=keria" --format "  Status: {{.Status}}" || echo "  NOT FOUND"

echo ""
echo "All running containers:"
docker ps --format "  {{.Names}}: {{.Status}}"

echo ""
echo "2. Testing KERIA connectivity from HOST..."
echo "-------------------------------------------"
echo ""

echo "Testing http://127.0.0.1:3902/spec.yaml (KERIA HTTP API)..."
if curl -s -m 5 http://127.0.0.1:3902/spec.yaml >/dev/null 2>&1; then
    echo "  ✓ KERIA HTTP API port 3902 is accessible"
else
    echo "  ✗ KERIA HTTP API port 3902 is NOT accessible"
    echo "  KERIA IS NOT READY!"
fi

echo ""
echo "3. Testing KERIA connectivity from INSIDE tsx-shell..."
echo "-------------------------------------------------------"
echo ""

echo "Testing http://keria:3901 from tsx-shell container..."
if docker exec tsx_shell sh -c "curl -s -m 5 http://keria:3901 >/dev/null 2>&1" 2>/dev/null; then
    echo "  ✓ tsx-shell CAN reach KERIA on Docker network"
else
    echo "  ✗ tsx-shell CANNOT reach KERIA on Docker network"
    echo "  THIS IS LIKELY THE PROBLEM!"
fi

echo ""
echo "4. Checking KERIA logs for errors..."
echo "-------------------------------------"
echo ""
docker logs --tail 20 $(docker ps -q --filter "name=keria") 2>&1

echo ""
echo "5. Testing tsx-shell responsiveness..."
echo "---------------------------------------"
echo ""
if docker exec tsx_shell sh -c "echo 'tsx-shell is responsive'" 2>/dev/null; then
    echo "  ✓ tsx-shell responds to commands"
else
    echo "  ✗ tsx-shell is NOT responding"
fi

echo ""
echo "================================================"
echo "Diagnosis Complete"
echo "================================================"
echo ""
echo "SOLUTIONS:"
echo ""
echo "If KERIA is not accessible:"
echo "  1. Wait 20 seconds and try again (KERIA may still be starting)"
echo "  2. Check KERIA logs above for errors"
echo "  3. Restart KERIA: docker restart \$(docker ps -q --filter 'name=keria')"
echo "  4. Full reset: ./stop.sh && ./deploy.sh"
echo ""
