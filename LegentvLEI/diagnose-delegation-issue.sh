#!/bin/bash

echo "================================================================"
echo "COMPREHENSIVE DELEGATION DIAGNOSTICS"
echo "================================================================"
echo ""

# 1. CHECK DOCKER SERVICES
echo "─────────────────────────────────────────────────────────────"
echo "1. DOCKER SERVICES STATUS"
echo "─────────────────────────────────────────────────────────────"
docker compose ps
echo ""

# 2. CHECK WITNESS LOGS (last 50 lines)
echo "─────────────────────────────────────────────────────────────"
echo "2. WITNESS LOGS (Last 50 lines)"
echo "─────────────────────────────────────────────────────────────"
docker compose logs witness --tail=50 | grep -E "(error|Error|ERROR|exception|Exception|failed|Failed|FAILED)" || echo "✓ No errors in witness logs"
echo ""

# 3. CHECK KERIA LOGS (last 50 lines, focusing on delegation)
echo "─────────────────────────────────────────────────────────────"
echo "3. KERIA LOGS (Last 50 lines - delegation related)"
echo "─────────────────────────────────────────────────────────────"
docker compose logs keria --tail=50 | grep -E "(delegation|operation|EF_w5Y1i2zlvk8PEelEeLgsT9MKr4nJlwWJK5RQqMKus)" || echo "✓ No delegation operations in recent logs"
echo ""

# 4. VERIFY OOR HOLDER WITNESS CONFIGURATION
echo "─────────────────────────────────────────────────────────────"
echo "4. OOR HOLDER (Jupiter_Chief_Sales_Officer) WITNESS CONFIG"
echo "─────────────────────────────────────────────────────────────"
OOR_AID=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/Jupiter_Chief_Sales_Officer" 2>/dev/null | jq -r '.i // .prefix' 2>/dev/null)

if [ -n "$OOR_AID" ] && [ "$OOR_AID" != "null" ]; then
    echo "OOR AID: $OOR_AID"
    
    # Get the KEL to check witness config
    KEL=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${OOR_AID}/events/0" 2>/dev/null)
    
    WITNESS_COUNT=$(echo "$KEL" | jq -r '.b | length' 2>/dev/null)
    WITNESS_THRESHOLD=$(echo "$KEL" | jq -r '.bt' 2>/dev/null)
    
    echo "Witnesses configured: $WITNESS_COUNT"
    echo "Witness threshold: $WITNESS_THRESHOLD"
    
    if [ "$WITNESS_COUNT" -ge 1 ]; then
        echo "✓ OOR holder has witnesses configured"
    else
        echo "✗ WARNING: OOR holder has no witnesses!"
    fi
else
    echo "✗ Could not find OOR holder in KERIA"
fi
echo ""

# 5. CHECK WITNESS RECEIPTS
echo "─────────────────────────────────────────────────────────────"
echo "5. WITNESS RECEIPT STATUS"
echo "─────────────────────────────────────────────────────────────"
if [ -n "$OOR_AID" ] && [ "$OOR_AID" != "null" ]; then
    # Get latest event
    LATEST_EVENT=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${OOR_AID}/events" 2>/dev/null | jq -r '.[-1]' 2>/dev/null)
    
    EVENT_SEQ=$(echo "$LATEST_EVENT" | jq -r '.s' 2>/dev/null)
    EVENT_TYPE=$(echo "$LATEST_EVENT" | jq -r '.t' 2>/dev/null)
    
    echo "Latest event: type=$EVENT_TYPE, sequence=$EVENT_SEQ"
    
    # Check if this event has witness receipts
    RECEIPTS=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${OOR_AID}/events/${EVENT_SEQ}/receipts" 2>/dev/null | jq '.' 2>/dev/null)
    
    if [ -n "$RECEIPTS" ] && [ "$RECEIPTS" != "null" ]; then
        RECEIPT_COUNT=$(echo "$RECEIPTS" | jq 'length' 2>/dev/null)
        echo "Witness receipts received: $RECEIPT_COUNT"
        echo "✓ Witnesses are responding"
    else
        echo "⚠ No witness receipts found for latest event"
    fi
else
    echo "Skipping (OOR AID not found)"
fi
echo ""

# 6. CHECK NETWORK CONNECTIVITY
echo "─────────────────────────────────────────────────────────────"
echo "6. NETWORK CONNECTIVITY"
echo "─────────────────────────────────────────────────────────────"

# Check if services can reach each other
echo "Testing KERIA accessibility..."
docker compose exec -T tsx-shell curl -s -o /dev/null -w "KERIA HTTP: %{http_code}\n" http://keria:3902/ 2>/dev/null || echo "✗ tsx-shell cannot reach KERIA"

echo "Testing witness accessibility..."
docker compose exec -T tsx-shell curl -s -o /dev/null -w "Witness HTTP: %{http_code}\n" http://witness:5642/oobi 2>/dev/null || echo "✗ tsx-shell cannot reach witness"

echo "Testing schema server..."
docker compose exec -T tsx-shell curl -s -o /dev/null -w "Schema HTTP: %{http_code}\n" http://schema:7723/ 2>/dev/null || echo "✗ tsx-shell cannot reach schema"

echo ""

# AGENT CHECK
echo "─────────────────────────────────────────────────────────────"
echo "7. AGENT STATUS CHECK"
echo "─────────────────────────────────────────────────────────────"
echo "Checking if jupiterSellerAgent exists in KERIA..."

AGENT_CHECK=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/jupiterSellerAgent" 2>/dev/null)
AGENT_AID=$(echo "$AGENT_CHECK" | jq -r '.i // .prefix' 2>/dev/null)

if [ -n "$AGENT_AID" ] && [ "$AGENT_AID" != "null" ]; then
    echo "✓ Agent EXISTS in KERIA!"
    echo "  Agent AID: $AGENT_AID"
    
    # Check if it has delegation field
    AGENT_KEL=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/identifiers/${AGENT_AID}/events/0" 2>/dev/null)
    DELEGATOR=$(echo "$AGENT_KEL" | jq -r '.di' 2>/dev/null)
    
    if [ -n "$DELEGATOR" ] && [ "$DELEGATOR" != "null" ]; then
        echo "✓ Agent has delegation field: $DELEGATOR"
        
        if [ "$DELEGATOR" = "$OOR_AID" ]; then
            echo "✓ Delegator matches OOR holder!"
            echo ""
            echo "================================================================"
            echo "✅ AGENT DELEGATION IS COMPLETE!"
            echo "================================================================"
            echo "The error was misleading - the agent exists and is delegated."
            echo "You can proceed with testing the deep verification."
        else
            echo "✗ Delegator mismatch: expected $OOR_AID"
        fi
    else
        echo "✗ Agent has no delegation field"
    fi
else
    echo "✗ Agent does NOT exist in KERIA"
    echo "The delegation failed to complete."
fi
echo ""

# OPERATION CHECK
echo "─────────────────────────────────────────────────────────────"
echo "8. OPERATION QUEUE CHECK"
echo "─────────────────────────────────────────────────────────────"
echo "Checking if operation still exists..."
OP_CHECK=$(docker compose exec -T keria curl -s "http://127.0.0.1:3902/operations/delegation.EF_w5Y1i2zlvk8PEelEeLgsT9MKr4nJlwWJK5RQqMKus" 2>/dev/null)

if echo "$OP_CHECK" | grep -q "404"; then
    echo "⚠ Operation no longer in queue (404)"
    echo "This is normal if the operation completed successfully."
else
    echo "Operation status:"
    echo "$OP_CHECK" | jq '.' 2>/dev/null || echo "$OP_CHECK"
fi
echo ""

echo "================================================================"
echo "DIAGNOSTIC COMPLETE"
echo "================================================================"
