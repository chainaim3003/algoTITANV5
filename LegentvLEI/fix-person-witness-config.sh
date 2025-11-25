#!/bin/bash
################################################################################
# fix-person-witness-config.sh
# Fix Person AID creation to include witnesses
################################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  PERSON AID WITNESS CONFIGURATION FIX                            ║"
echo "║  Ensuring Person AIDs are created with witnesses                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if person-aid-create.ts exists
PERSON_CREATE_FILE="./sig-wallet/src/tasks/person/person-aid-create.ts"

if [ ! -f "$PERSON_CREATE_FILE" ]; then
    echo "✗ Error: Cannot find $PERSON_CREATE_FILE"
    exit 1
fi

echo "Checking current Person AID creation configuration..."
echo ""

# Check if witnesses are configured
if grep -q "const wits = \[\]" "$PERSON_CREATE_FILE"; then
    echo "✗ PROBLEM FOUND: Person AIDs are created WITHOUT witnesses!"
    echo ""
    echo "Current code has:"
    echo "  const wits = []  // No witnesses!"
    echo ""
    echo "This means:"
    echo "  • Person AIDs have no witnesses"
    echo "  • Delegation approvals cannot be witnessed"
    echo "  • Agent delegations cannot complete"
    echo ""
    
    NEEDS_FIX=1
elif grep -q "const wits = \[" "$PERSON_CREATE_FILE"; then
    echo "✓ Person AIDs appear to have witness configuration"
    
    # Check if it's using proper witness URLs
    if grep -q "witness:5642" "$PERSON_CREATE_FILE"; then
        echo "✓ Using Docker witness URLs"
        NEEDS_FIX=0
    else
        echo "⚠ Witness configuration may be incorrect"
        NEEDS_FIX=1
    fi
else
    echo "⚠ Cannot determine witness configuration"
    echo "  Manual inspection needed"
    NEEDS_FIX=1
fi

if [ $NEEDS_FIX -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "No fix needed - Person AIDs already configured with witnesses"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "The problem may be elsewhere. Run investigation:"
    echo "  ./investigate-witness-issue.sh"
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "CREATING FIX"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Create backup
BACKUP_FILE="${PERSON_CREATE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup: $BACKUP_FILE"
cp "$PERSON_CREATE_FILE" "$BACKUP_FILE"

# Check what witness configuration to use
echo ""
echo "Witness configuration options:"
echo "  1. Full security (6 witnesses, toad=3) - SLOW but secure"
echo "  2. Balanced (6 witnesses, toad=2) - Medium speed, good security"
echo "  3. Fast (6 witnesses, toad=1) - FAST, acceptable for dev/test"
echo "  4. Minimal (3 witnesses, toad=1) - Very fast, minimal security"
echo ""
read -p "Choose option (1-4) [recommended: 3 for dev/test]: " CHOICE

case $CHOICE in
    1)
        WITNESS_COUNT=6
        THRESHOLD=3
        echo "Selected: Full security (toad=3)"
        ;;
    2)
        WITNESS_COUNT=6
        THRESHOLD=2
        echo "Selected: Balanced (toad=2)"
        ;;
    3)
        WITNESS_COUNT=6
        THRESHOLD=1
        echo "Selected: Fast (toad=1) - RECOMMENDED for dev/test"
        ;;
    4)
        WITNESS_COUNT=3
        THRESHOLD=1
        echo "Selected: Minimal (3 witnesses, toad=1)"
        ;;
    *)
        echo "Invalid choice. Using default: Fast (toad=1)"
        WITNESS_COUNT=6
        THRESHOLD=1
        ;;
esac

echo ""
echo "Applying fix to $PERSON_CREATE_FILE..."

# Create the fixed version
cat > "${PERSON_CREATE_FILE}.tmp" << 'EOFIXED'
import fs from 'fs';
import {getOrCreateClient} from "../../client/identifiers.js";

const args = process.argv.slice(2);
const env = args[0] as 'docker' | 'testnet';
const passcode = args[1];
const personAidName = args[2];
const outputPath = args[3];

// Witness configuration for Person AID
// Using configured threshold for optimal performance
const getWitnessConfig = (env: string) => {
    if (env === 'docker') {
        return {
            wits: [
                'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',  // wan
                'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',  // wil
                'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX',  // wes
                'BM35JN8XeJSEfpxopjn5jr7tAHCE5749f0OobhMLCorE',  // wit
                'BIj15u5V11bV6G0YqRSpfiUkw0F_hKVGbSYt-PM7WssE',  // wub
                'BF2rZTW79z4IXocYRf5KZ9KXWb32abYGdVVU5GYppNxH'   // wyz
            ],
            urls: [
                'http://witness:5642/oobi',
                'http://witness:5643/oobi',
                'http://witness:5644/oobi',
                'http://witness:5645/oobi',
                'http://witness:5646/oobi',
                'http://witness:5647/oobi'
            ],
            toad: THRESHOLD_PLACEHOLDER
        };
    } else {
        // Testnet configuration
        return {
            wits: [
                'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
                'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',
                'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX'
            ],
            urls: [
                'http://witness:5642/oobi',
                'http://witness:5643/oobi',
                'http://witness:5644/oobi'
            ],
            toad: THRESHOLD_PLACEHOLDER
        };
    }
};

async function createPersonAid(client: any, personAidName: string, env: string) {
    console.log(`Creating Person AID using SignifyTS and KERIA`);
    console.log(`Using alias: ${personAidName}`);
    
    const witnessConfig = getWitnessConfig(env);
    
    console.log(`Witness configuration:`);
    console.log(`  Witnesses: ${witnessConfig.wits.length}`);
    console.log(`  Threshold (toad): ${witnessConfig.toad}`);
    console.log(`  This means: Need ${witnessConfig.toad} of ${witnessConfig.wits.length} witness signatures`);
    
    const result = await client.identifiers().create(personAidName, {
        wits: witnessConfig.wits,
        toad: witnessConfig.toad
    });
    
    const op = await result.op();
    
    // Wait for operation to complete
    await client.operations().wait(op, { signal: AbortSignal.timeout(30000) });
    
    const aid = await client.identifiers().get(personAidName);
    
    // Add endpoint role
    const endRoleOp = await client.identifiers()
        .addEndRole(personAidName, 'agent', client!.agent!.pre);
    await client.operations().wait(await endRoleOp.op(), { signal: AbortSignal.timeout(30000) });
    
    // Get OOBI
    const oobiResp = await client.oobis().get(personAidName, 'agent');
    const oobi = oobiResp.oobis[0];
    
    console.log(`Person info written to ${outputPath.replace('.json', '-*')}`);
    console.log(`   Prefix: ${aid.prefix}`);
    console.log(`   OOBI: ${oobi}`);
    
    return {
        aid: aid.prefix,
        oobi,
        state: aid.state
    };
}

// Main execution
(async () => {
    try {
        const client = await getOrCreateClient(passcode, env);
        const personInfo = await createPersonAid(client, personAidName, env);
        
        // Write to file
        fs.writeFileSync(outputPath, JSON.stringify(personInfo, null, 2));
        
        // Verify file exists
        if (!fs.existsSync(outputPath)) {
            throw new Error(`Failed to write ${outputPath}`);
        }
        
        console.log(`   Prefix: ${personInfo.aid}`);
        console.log(`   OOBI: ${personInfo.oobi}`);
        
        process.exit(0);
    } catch (error: any) {
        console.error(`Error creating Person AID: ${error.message}`);
        process.exit(1);
    }
})();
EOFIXED

# Replace threshold placeholder
sed "s/THRESHOLD_PLACEHOLDER/$THRESHOLD/g" "${PERSON_CREATE_FILE}.tmp" > "$PERSON_CREATE_FILE"
rm "${PERSON_CREATE_FILE}.tmp"

echo "✓ Fix applied"
echo ""

# Verify fix
if grep -q "toad: $THRESHOLD" "$PERSON_CREATE_FILE"; then
    echo "✓ Verification: Threshold set to $THRESHOLD"
else
    echo "✗ Verification failed - please check $PERSON_CREATE_FILE manually"
    exit 1
fi

if grep -q "wits: witnessConfig.wits" "$PERSON_CREATE_FILE"; then
    echo "✓ Verification: Witnesses configured"
else
    echo "✗ Verification failed - please check $PERSON_CREATE_FILE manually"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "FIX COMPLETE"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Configuration applied:"
echo "  • Witnesses: $WITNESS_COUNT"
echo "  • Threshold: $THRESHOLD"
echo ""
echo "Backup saved to:"
echo "  $BACKUP_FILE"
echo ""
echo "NEXT STEPS:"
echo "────────────────────────────────────────────────────────────────────"
echo ""
echo "1. Rebuild Docker container with fix:"
echo "   docker compose build --no-cache tsx-shell"
echo ""
echo "2. Restart services:"
echo "   docker compose restart tsx-shell"
echo ""
echo "3. Start fresh (recommended):"
echo "   ./stop.sh"
echo "   docker compose down -v"
echo "   ./deploy.sh"
echo ""
echo "4. Run delegation again:"
echo "   ./run-all-buyerseller-2C-with-agents.sh"
echo ""
echo "Expected behavior:"
echo "  • Person AID will be created with $WITNESS_COUNT witnesses"
echo "  • Delegation will need $THRESHOLD witness signatures"
echo "  • Delegation should complete in 10-60 seconds"
echo ""
echo "To restore original:"
echo "  cp $BACKUP_FILE $PERSON_CREATE_FILE"
echo ""
