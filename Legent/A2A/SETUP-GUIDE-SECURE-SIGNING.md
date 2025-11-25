# SETUP GUIDE: Buyer-Seller with Secure Agent Signing

## Problem
Your agents were created with random brans that weren't saved, so they can't sign messages.

## Solution
Re-run the vLEI setup with FIXED brans (salts) so we can use them for signing.

## Steps to Fix

### 1. Update Environment Variables

Replace your `workshop-env-vars.sh`:
```bash
cp task-scripts/workshop-env-vars-buyerseller.sh task-scripts/workshop-env-vars.sh
```

### 2. Clean Existing Setup

```bash
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\LegentAlgoTitanV51\algoTITANV5\LegentvLEI

# Stop and clean
./stop.sh
docker compose down -v

# Clean task data
rm -rf task-data/*
```

### 3. Modify the Setup Script

Edit `run-all-buyerseller-2-with-agents.sh` and add BEFORE the person creation loop:

```bash
# Around line 150-200, BEFORE creating person AIDs, add:

# Set organization-specific salts based on org ID
ORG_ID=$(jq -r ".organizations[$i].id" "$CONFIG_FILE")

if [ "$ORG_ID" == "jupiter" ]; then
    export LE_SALT="$JUPITER_LE_SALT"
    export PERSON_SALT="$JUPITER_OOR_SALT"
    echo "Using Jupiter salts for ${ORG_ALIAS}"
elif [ "$ORG_ID" == "tommy" ]; then
    export LE_SALT="$TOMMY_LE_SALT"
    export PERSON_SALT="$TOMMY_OOR_SALT"
    echo "Using Tommy salts for ${ORG_ALIAS}"
fi
```

### 4. Re-run Setup

```bash
# Source the new env vars
source task-scripts/workshop-env-vars.sh

# Run setup
./run-all-buyerseller-2-with-agents.sh
```

### 5. Update A2A Agent .env Files

After setup completes, update the .env files with the correct brans:

**Seller Agent (.env):**
```bash
OOR_HOLDER_BRAN=0ADjupiterOOR_Salt123
```

**Buyer Agent (.env):**
```bash
OOR_HOLDER_BRAN=0ADtommyOOR_Salt_1234
```

### 6. Test A2A Agents

```bash
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\LegentAlgoTitanV51\algoTITANV5\Legent\A2A\js

npm run agents:seller
```

## What This Achieves

✅ **Persistent Brans** - AIDs created with known salts
✅ **Real Signatures** - Agents can sign via KERIA  
✅ **Security** - Cryptographic signatures prevent spoofing
✅ **vLEI Compliance** - Proper delegation chain verification

## Verification Flow

```
1. Agent creates invoice message
2. Signs with OOR holder's bran via KERIA
3. Produces real qb64 signature
4. Buyer agent receives signed message
5. Sally verifies:
   ✓ Signature valid (cryptographic)
   ✓ OOR credential valid (vLEI chain)
   ✓ Agent properly delegated
   ✓ Message authentic
```

## Quick Salt Reference

| Entity | Salt Variable | Value |
|--------|--------------|-------|
| Jupiter LE | JUPITER_LE_SALT | `0ACjupiterLE_SaltHere` |
| Jupiter OOR | JUPITER_OOR_SALT | `0ADjupiterOOR_Salt123` |
| Jupiter Agent | JUPITER_AGENT_SALT | `0AEjupiterAgent_Salt` |
| Tommy LE | TOMMY_LE_SALT | `0ACtommyLE_Salt_12345` |
| Tommy OOR | TOMMY_OOR_SALT | `0ADtommyOOR_Salt_1234` |
| Tommy Agent | TOMMY_AGENT_SALT | `0AEtommyAgent_Salt01` |

## Troubleshooting

**Issue:** "KERIA authentication failed"
- Check: OOR_HOLDER_BRAN matches the salt used during vLEI setup
- Check: KERIA is running on localhost:3902

**Issue:** "Agent AID not found"
- Re-run vLEI setup with fixed salts
- Check agent-cards/ directory for correct AIDs

**Issue:** "Signature verification failed"
- Check: Message includes timestamp
- Check: Bran is exactly 21 characters
- Check: SignifyClient properly initialized
