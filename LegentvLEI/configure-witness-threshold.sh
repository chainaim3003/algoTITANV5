#!/bin/bash
################################################################################
# configure-witness-threshold.sh
# Make witnesses optional or reduce threshold requirements
# Based on KERI witness configuration (toad/wits parameters)
################################################################################

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  KERI WITNESS CONFIGURATION                                      ║"
echo "║  Adjusting Witness Threshold for Faster Delegation              ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

cat << 'EOF'
KERI Witness Parameters Explained:
═══════════════════════════════════

• wits: List of witness identifiers (AIDs)
  - Default: 6 witnesses (wan, wil, wes, wit, wub, wyz)
  
• toad: Threshold of Accountable Duplicity
  - Number of witness signatures required
  - Default: 3 (need 3 of 6 witnesses to sign)
  - Minimum: 1 (fastest, least secure)
  
• estOnly: Establishment events only
  - If true, only inception/rotation need witnesses
  - Interaction events (like delegation approval) skip witnesses
  
Current Delegation Flow:
1. OOR Holder creates interaction event (ixn) to approve delegation
2. Event sent to all 6 witnesses
3. Each witness validates and signs receipt
4. Need 'toad' signatures (default: 3) to complete
5. Agent queries for completed event ← THIS IS WHERE TIMEOUT OCCURS

Options to Speed Up:
═══════════════════════

Option 1: REDUCE THRESHOLD (Recommended)
  Change toad from 3 → 1
  • Need only 1 witness signature instead of 3
  • Faster (10-30 seconds vs 60-180 seconds)
  • Still secure for test/dev environments
  • Keep all 6 witnesses running

Option 2: REDUCE WITNESS COUNT
  Change from 6 witnesses → 3 witnesses
  • Fewer nodes to sync
  • Faster propagation
  • Keep toad at 2 (need 2 of 3)

Option 3: NO WITNESSES FOR DELEGATION (Fastest, Test Only)
  Use direct delegation without witness consensus
  • Near-instant delegation (< 5 seconds)
  • NOT recommended for production
  • Useful for development/testing

EOF

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "CURRENT CONFIGURATION"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Check current witness setup
echo "Checking witness containers..."
WITNESS_COUNT=$(docker compose ps witness 2>/dev/null | grep -c "Up" || echo "0")
echo "  Active witnesses: $WITNESS_COUNT"

# Check a sample AID for witness config
echo ""
echo "Checking GEDA AID witness configuration..."
GEDA_PRE=$(docker compose exec -T tsx-shell cat /task-data/geda-info.json 2>/dev/null | grep -o '"prefix":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$GEDA_PRE" ]; then
    CONFIG=$(docker compose exec -T tsx-shell curl -s "http://keria:3902/identifiers/$GEDA_PRE" 2>/dev/null)
    
    WITS=$(echo "$CONFIG" | grep -o '"wits":\[[^]]*\]' | grep -o 'B[A-Za-z0-9_-]*' | wc -l)
    TOAD=$(echo "$CONFIG" | grep -o '"toad":[0-9]*' | grep -o '[0-9]*' || echo "3")
    
    echo "  Witnesses (wits): $WITS"
    echo "  Threshold (toad): $TOAD"
    echo ""
    
    if [ "$TOAD" -eq 1 ]; then
        echo "  ✓ Already optimized for speed (toad=1)"
    else
        echo "  ⚠ Could be faster with toad=1"
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "CONFIGURATION OPTIONS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

PS3="Select configuration option: "
options=(
    "Option 1: Reduce threshold to 1 (Fast, Recommended)"
    "Option 2: Reduce to 3 witnesses with threshold 2"
    "Option 3: Create TypeScript with configurable threshold"
    "Option 4: Show current config only (no changes)"
    "Exit"
)

select opt in "${options[@]}"
do
    case $opt in
        "Option 1: Reduce threshold to 1 (Fast, Recommended)")
            echo ""
            echo "Creating AID creation script with toad=1..."
            
            cat > ~/projects/LegentvLEI/create-aid-with-low-threshold.sh << 'SCRIPT'
#!/bin/bash
# Create AID with reduced witness threshold for faster delegation

ALIAS="${1:-testaid}"
TOAD="${2:-1}"  # Default to 1

cat << EOF
Creating AID with optimized witness configuration:
  Alias: $ALIAS
  Threshold (toad): $TOAD
  Witnesses: 6 (all available)
  
This configuration requires only $TOAD witness signature(s) for events.
Delegation approval will be faster (typically 10-30 seconds).
EOF

docker compose exec tsx-shell tsx /vlei/src/tasks/person/person-aid-create.ts \
  --name "$ALIAS" \
  --toad "$TOAD"

echo "✓ AID created with toad=$TOAD"
SCRIPT

            chmod +x ~/projects/LegentvLEI/create-aid-with-low-threshold.sh
            
            echo "✓ Script created: ~/projects/LegentvLEI/create-aid-with-low-threshold.sh"
            echo ""
            echo "Usage:"
            echo "  ./create-aid-with-low-threshold.sh myAlias 1"
            echo ""
            echo "Note: This only affects NEW AIDs created with this script."
            echo "Existing AIDs keep their original threshold."
            break
            ;;
            
        "Option 2: Reduce to 3 witnesses with threshold 2")
            echo ""
            echo "To use 3 witnesses instead of 6:"
            echo ""
            echo "1. Edit docker-compose.yml witness service:"
            echo "   # Comment out 3 witnesses (keep wan, wil, wes)"
            echo ""
            echo "2. Update AID creation to specify 3 witnesses"
            echo ""
            echo "3. Set toad=2 for 2-of-3 consensus"
            echo ""
            echo "This requires manual docker-compose.yml editing."
            echo "See documentation for details."
            break
            ;;
            
        "Option 3: Create TypeScript with configurable threshold")
            echo ""
            echo "Creating enhanced TypeScript AID creator..."
            
            mkdir -p ~/projects/LegentvLEI/sig-wallet/src/tasks/custom
            
            cat > ~/projects/LegentvLEI/sig-wallet/src/tasks/custom/create-aid-configurable.ts << 'TYPESCRIPT'
import { SignifyClient } from 'signify-ts';

interface CreateAIDOptions {
  name: string;
  witnessThreshold?: number;  // toad
  witnessCount?: number;      // number of witnesses to use
}

async function createConfigurableAID(client: SignifyClient, options: CreateAIDOptions) {
  const { name, witnessThreshold = 1, witnessCount = 6 } = options;
  
  console.log(`Creating AID with configuration:`);
  console.log(`  Name: ${name}`);
  console.log(`  Witness Threshold (toad): ${witnessThreshold}`);
  console.log(`  Witness Count: ${witnessCount}`);
  
  // Get witness OOBIs
  const witnesses = [
    'http://witness:5642/oobi',  // wan
    'http://witness:5643/oobi',  // wil
    'http://witness:5644/oobi',  // wes
    'http://witness:5645/oobi',  // wit
    'http://witness:5646/oobi',  // wub
    'http://witness:5647/oobi',  // wyz
  ].slice(0, witnessCount);
  
  // Create AID with custom threshold
  const icpResult = await client.identifiers().create(name, {
    toad: witnessThreshold,
    wits: witnesses,
  });
  
  await client.operations().wait(icpResult.op);
  
  const aid = await client.identifiers().get(name);
  
  console.log(`✓ AID created successfully`);
  console.log(`  Prefix: ${aid.prefix}`);
  console.log(`  Threshold: ${witnessThreshold}`);
  console.log(`  Witnesses: ${witnessCount}`);
  
  return aid;
}

// Usage example
const options: CreateAIDOptions = {
  name: process.argv[2] || 'testaid',
  witnessThreshold: parseInt(process.argv[3]) || 1,
  witnessCount: parseInt(process.argv[4]) || 6,
};

// Run
(async () => {
  const client = new SignifyClient(/* connection config */);
  await createConfigurableAID(client, options);
})();
TYPESCRIPT

            echo "✓ Created: sig-wallet/src/tasks/custom/create-aid-configurable.ts"
            echo ""
            echo "This TypeScript allows full control over witness configuration."
            break
            ;;
            
        "Option 4: Show current config only (no changes)")
            echo ""
            echo "No changes made. Current configuration preserved."
            break
            ;;
            
        "Exit")
            echo "Exiting..."
            exit 0
            ;;
            
        *) 
            echo "Invalid option $REPLY"
            ;;
    esac
done

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "IMPORTANT NOTES"
echo "════════════════════════════════════════════════════════════════════"
echo ""
cat << 'EOF'
Security vs Speed Tradeoff:
• toad=1: Fast (10-30s), lower security (single point of failure)
• toad=2: Medium (30-60s), good security (need 2 witnesses to collude)
• toad=3: Slow (60-180s), high security (need 3 witnesses to collude)

For Production: Use toad=3 with 6+ witnesses
For Development: Use toad=1 with 3-6 witnesses
For Testing: Can even use toad=0 (no witnesses, instant)

The delegation timeout you're experiencing is NORMAL for toad=3.
The fix with retries handles this correctly.

Alternative: Use the fix we created (5 retries × 60s = 5 min timeout)
            This keeps security while being patient for witness consensus.
EOF

echo ""
