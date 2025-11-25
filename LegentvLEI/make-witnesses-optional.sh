#!/bin/bash
################################################################################
# make-witnesses-optional.sh
# Configure Person AIDs with NO witnesses (insecure - dev only)
################################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  MAKE WITNESSES OPTIONAL (NO SECURITY)                           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

echo "⚠️  WARNING: This removes ALL witness security!"
echo ""
echo "What this means:"
echo "  • Delegation will be INSTANT (< 5 seconds)"
echo "  • NO duplicity detection"
echo "  • NO witness validation"
echo "  • NOT suitable even for dev/test"
echo ""
echo "Alternative (RECOMMENDED):"
echo "  • Use toad=1 instead (10-30 seconds, has security)"
echo "  • Run: ./fix-person-witness-config.sh (choose option 3)"
echo ""
read -p "Are you SURE you want NO witnesses? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo ""
    echo "Wise choice! Use toad=1 instead:"
    echo "  ./fix-person-witness-config.sh"
    echo "  Choose option 3 (Fast - toad=1)"
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "APPLYING NO-WITNESS CONFIGURATION"
echo "════════════════════════════════════════════════════════════════════"
echo ""

PERSON_CREATE_FILE="./sig-wallet/src/tasks/person/person-aid-create.ts"

if [ ! -f "$PERSON_CREATE_FILE" ]; then
    echo "✗ Error: Cannot find $PERSON_CREATE_FILE"
    exit 1
fi

# Create backup
BACKUP_FILE="${PERSON_CREATE_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup: $BACKUP_FILE"
cp "$PERSON_CREATE_FILE" "$BACKUP_FILE"

# Create no-witness version
cat > "$PERSON_CREATE_FILE" << 'EOFIXED'
import fs from 'fs';
import {getOrCreateClient} from "../../client/identifiers.js";

const args = process.argv.slice(2);
const env = args[0] as 'docker' | 'testnet';
const passcode = args[1];
const personAidName = args[2];
const outputPath = args[3];

async function createPersonAid(client: any, personAidName: string, env: string) {
    console.log(`Creating Person AID using SignifyTS and KERIA`);
    console.log(`Using alias: ${personAidName}`);
    console.log(`⚠️  NO WITNESSES - Instant delegation (INSECURE)`);
    
    // NO WITNESSES - instant but insecure
    const result = await client.identifiers().create(personAidName, {
        wits: [],  // No witnesses
        toad: 0    // No threshold
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

echo "✓ No-witness configuration applied"
echo ""

echo "════════════════════════════════════════════════════════════════════"
echo "CONFIGURATION SUMMARY"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "Person AIDs will now be created with:"
echo "  • Witnesses: 0"
echo "  • Threshold: 0"
echo ""
echo "⚠️  Security: NONE"
echo "⚡ Speed: < 5 seconds per delegation"
echo ""
echo "Backup saved to:"
echo "  $BACKUP_FILE"
echo ""
echo "NEXT STEPS:"
echo "────────────────────────────────────────────────────────────────────"
echo ""
echo "1. Rebuild container:"
echo "   docker compose build --no-cache tsx-shell"
echo ""
echo "2. Start fresh:"
echo "   ./stop.sh"
echo "   docker compose down -v"
echo "   ./deploy.sh"
echo ""
echo "3. Run delegation:"
echo "   ./run-all-buyerseller-2C-with-agents.sh"
echo ""
echo "Expected timeline:"
echo "  • GEDA & QVI: ~45 seconds"
echo "  • LE & Person: ~35 seconds"
echo "  • OOR credential: ~20 seconds"
echo "  • Agent delegation: < 5 seconds ⚡ INSTANT"
echo "  • TOTAL: ~2 minutes"
echo ""
echo "To restore witnesses (RECOMMENDED):"
echo "  cp $BACKUP_FILE $PERSON_CREATE_FILE"
echo "  ./fix-person-witness-config.sh  # Choose option 3"
echo ""
