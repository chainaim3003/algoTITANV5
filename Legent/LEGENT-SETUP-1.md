# 🚀 Complete Setup Guide: vLEI-Verified A2A Payment System

**End-to-End Demo: Agent-to-Agent payments with KERI delegation verification on Algorand**

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Algorand Wallet Setup](#algorand-wallet-setup)
3. [KERI/vLEI Backend Setup](#keri-vlei-backend-setup)
4. [A2A Agents & UI Setup](#a2a-agents--ui-setup)
5. [Running the System](#running-the-system)
6. [Testing the Flow](#testing-the-flow)

---

## 1️⃣ Prerequisites

### Required Software

#### Windows:
```powershell
# Install Node.js (v18 or higher)
# Download from: https://nodejs.org/

# Install Git
# Download from: https://git-scm.com/

# Install WSL2 (Ubuntu)
wsl --install
# Restart your computer after installation

# Install Docker Desktop for Windows
# Download from: https://www.docker.com/products/docker-desktop/
# Enable "Use WSL 2 based engine" in Docker Desktop settings
```

#### AlgoKit Installation (Windows):
```powershell
# Install AlgoKit (for Algorand development)
# Open PowerShell as Administrator
winget install algorandfoundation.algokit

# Verify installation
algokit --version
```

---

## 2️⃣ Algorand Wallet Setup

### Create Testnet Wallets

#### Using Node.js (Simplest Method)
```bash
# Install algosdk globally
npm install -g algosdk

# Create wallet generator script
node -e "
const algosdk = require('algosdk');

console.log('=== BUYER WALLET ===');
const buyer = algosdk.generateAccount();
console.log('Address:', buyer.addr);
console.log('Mnemonic:', algosdk.secretKeyToMnemonic(buyer.sk));
console.log('');

console.log('=== SELLER WALLET ===');
const seller = algosdk.generateAccount();
console.log('Address:', seller.addr);
console.log('Mnemonic:', algosdk.secretKeyToMnemonic(seller.sk));
"
```

**💾 SAVE THESE VALUES - YOU'LL NEED THEM LATER!**

### Fund Wallets with TestNet ALGO

1. **Visit Algorand TestNet Dispenser:**
   - https://bank.testnet.algorand.network/

2. **Fund Both Wallets:**
   - Enter **Buyer Address** → Click "Dispense" → Receive 10 ALGO
   - Enter **Seller Address** → Click "Dispense" → Receive 10 ALGO

3. **Verify Balance:**
```bash
# Check buyer balance
curl https://testnet-api.algonode.cloud/v2/accounts/<BUYER_ADDRESS>

# Check seller balance  
curl https://testnet-api.algonode.cloud/v2/accounts/<SELLER_ADDRESS>
```

---

## 3️⃣ KERI/vLEI Backend Setup

### Setup in WSL (One-Time Setup)

```bash
# Open WSL terminal
wsl

# Navigate to projects directory
cd ~/projects

# Copy vLEIWorkLinux1 from Windows to WSL
# Replace <WINDOWS-INSTALL-PATH> with your actual path
# Example: /mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/vLEI1/vLEIWorkLinux1
cp -r /mnt/<WINDOWS-INSTALL-PATH>/vLEIWorkLinux1/* ~/projects/vLEIWorkLinux1/

# Navigate to the project
cd ~/projects/vLEIWorkLinux1

# Run initial setup (installs dependencies)
./setup.sh

# Build Docker containers (this may take 10-15 minutes first time)
docker compose build --no-cache

# Deploy the KERI infrastructure
./deploy.sh
```

**Expected Output from deploy.sh:**
```
✓ KERI witness containers started
✓ Verification API deployed
✓ All services healthy
```

---

## 4️⃣ A2A Agents & UI Setup

### Navigate to A2A Project Directory (Windows PowerShell)

```powershell
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI\A2A\samples\js
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

#### 1. **Buyer Agent Configuration**
Create/Edit: `src/agents/buyer-agent/.env`
```env
# Buyer's Algorand Wallet (from step 2)
BUYER_MNEMONIC=<YOUR_BUYER_MNEMONIC_25_WORDS>
BUYER_ADDRESS=<YOUR_BUYER_ADDRESS>

# Agent Configuration
PORT=9090
```

#### 2. **Seller Agent Configuration**
Create/Edit: `src/agents/seller-agent/.env`
```env
# Seller's Algorand Wallet (from step 2)
SELLER_MNEMONIC=<YOUR_SELLER_MNEMONIC_25_WORDS>
SELLER_ADDRESS=<YOUR_SELLER_ADDRESS>

# Agent Configuration
PORT=8080
```

### Setup React UI

```powershell
# Navigate to UI directory
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI

# Install dependencies
npm install
```

---

## 5️⃣ Running the System

### Terminal 1: KERI/vLEI Backend (WSL)

```bash
# Open WSL
wsl

# Navigate to project
cd ~/projects/vLEIWorkLinux1

# Stop any running instances first
./stop.sh

# Start all KERI services and create buyer/seller identities with agents
./run-all-buyerseller-2-with-agents.sh
```

**Expected Output:**
```
✓ Starting KERI witnesses...
✓ Creating GLEIF root identity...
✓ Creating QVI identity...
✓ Creating Legal Entity: Tommy Hilfiger
✓ Creating Legal Entity: Jupiter Corporation
✓ Creating OOR: Chief Procurement Officer (Tommy Hilfiger)
✓ Creating OOR: Chief Sales Officer (Jupiter)
✓ Creating Agent: Tommy Buyer Agent
✓ Creating Agent: Jupiter Seller Agent
✓ Issuing credentials...
✓ Verification API running on http://localhost:4000

All services ready!
```

**⏱️ This takes about 2-3 minutes to complete**

### Terminal 2: Verify KERI Setup (WSL)

```bash
# In the same WSL session, run verification test
cd ~/projects/vLEIWorkLinux1

# Test the agent verification
./test-agent-verification-DEEP.sh
```

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 TESTING AGENT VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testing Seller Agent: jupiterSellerAgent
✓ Delegation Chain Verified: YES
✓ Agent KEL Verified: YES
✓ OOR Holder KEL Verified: YES
✓ Credential Not Revoked: YES
✓ Credential Not Expired: YES

✅ VERIFICATION SUCCESS
Agent: jupiterSellerAgent
OOR Role: Jupiter_Chief_Sales_Officer
Legal Entity: Jupiter Corporation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Terminal 3: Seller Agent (Windows PowerShell)

```powershell
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI\A2A\samples\js

npm run agents:seller
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║         🏢 JUPITER SELLER AGENT STARTED 🏢                ║
╠════════════════════════════════════════════════════════════╣
║  Name:       Jupiter Seller Agent
║  Agent AID:  EP8qRFWYFdWve1b4TyUj4i6MHSdT6mUzTN35WyBY7qYb
║  OOR AID:    ChiefSalesOfficer
╠════════════════════════════════════════════════════════════╣
║  Agent Card: http://localhost:8080/.well-known/agent-card.json
║  Status:     🟢 READY
╚════════════════════════════════════════════════════════════╝
```

### Terminal 4: Buyer Agent (Windows PowerShell)

```powershell
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI\A2A\samples\js

npm run agents:buyer
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║       👔 TOMMY HILFIGER AGENT (BUYER) STARTED 👔          ║
╠════════════════════════════════════════════════════════════╣
║  Name:       Tommy Buyer Agent
║  Agent AID:  EOW15LS9c4chaeBW80DvPm-t7O6mY8YXG_nbvkXqZB1a
║  OOR AID:    ChiefProcurementOfficer
╠════════════════════════════════════════════════════════════╣
║  Agent Card: http://localhost:9090/.well-known/agent-card.json
║  Status:     🟢 READY
╚════════════════════════════════════════════════════════════╝
```

### Terminal 5: React UI (Windows PowerShell)

```powershell
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI

npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
```

---

## 6️⃣ Testing the Flow

### Option 1: Automated Test Script

```powershell
# Open a new PowerShell terminal
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI\A2A\samples\js

# Run the invoice test
node test-invoice-http.mjs
```

### What You'll See:

```
✅ INVOICE SENT TO BUYER AGENT

Invoice Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Invoice ID: INV-47ffab84
- Amount: ALGO 1.2
- Due Date: 2025-12-31
- Chain: testnet-v1.0
- Wallet: X6BAC4DP6Q3JBS6BLNGSAKUAUHY3W6GI7NRKLNTM3JGVRAIDQ5MUW3J3VI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PAYMENT SUCCESSFUL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 vLEI VERIFICATION (ACTUAL KEL VALIDATION)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verification Status: ✓ APPROVED
Agent Verified:      jupiterSellerAgent
OOR Holder:          Jupiter_Chief_Sales_Officer
Verification Time:   2025-11-15T04:57:48.213Z

Delegation Chain Verified:
  GLEIF ROOT → QVI → Legal Entity → OOR Holder → Agent

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 PAYMENT EXECUTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transaction ID:   VQILF2KJEIEJLHJRAGJNHB7EOK4I36M7SUMVVJ2KQYIICUPUHUXQ
Block:            57532302
Amount:           1.2 ALGO
Network:          Algorand TestNet

🔍 View on Explorer:
https://testnet.explorer.perawallet.app/tx/VQILF2KJEIEJLHJRAGJNHB7EOK4I36M7SUMVVJ2KQYIICUPUHUXQ

✓ Payment authorized based on verified KERI delegation chain
✓ Invoice marked as PAID
```

### Option 2: Manual UI Testing

1. **Open Browser:** http://localhost:3000

2. **Three-Panel Interface:**
   - **Left Panel:** Buyer Organization (Tommy Hilfiger Europe B.V.)
   - **Center Panel:** Verification Progress
   - **Right Panel:** Seller Organization (Jupiter Knitting Company)

3. **Watch the Automated Flow:**
   - ✅ **Step 1:** Found (Agent identities discovered)
   - ✅ **Step 2:** Fetched (Agent cards retrieved)
   - ✅ **Step 3:** Checked (vLEI credentials validated)
   - ✅ **Step 4:** Verified (KERI delegation chain confirmed)
   - ✅ **Trust Established** - Ready for secure transactions

4. **Check Console Logs:**
   - Buyer Agent Terminal: See full vLEI verification details
   - Seller Agent Terminal: See invoice confirmation

---

## 🔍 Verify Payment on Blockchain

Visit the Algorand TestNet Explorer:
- **Pera Explorer:** https://testnet.explorer.perawallet.app/tx/YOUR_TX_ID
- **AlgoExplorer:** https://testnet.algoexplorer.io/tx/YOUR_TX_ID

You'll see:
- ✅ Sender address (Buyer)
- ✅ Receiver address (Seller)
- ✅ Amount: 1.2 ALGO
- ✅ Transaction fee: 0.001 ALGO
- ✅ Block confirmation
- ✅ Timestamp

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              React UI (http://localhost:3000)               │
│         Buyer Panel | Progress | Seller Panel               │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                │      A2A Protocol           │
        ┌───────▼────────┐           ┌────────▼───────┐
        │  Buyer Agent   │◄─────────►│  Seller Agent  │
        │  (Port 9090)   │  Invoice  │  (Port 8080)   │
        └───────┬────────┘  Exchange └────────┬───────┘
                │                             │
                │       vLEI Verification     │
                └──────────────┬──────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Verification API   │
                    │  (localhost:4000)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   KERI Infrastructure│
                    │   (Docker Containers)│
                    │   - Witnesses        │
                    │   - KEL Storage      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Algorand TestNet   │
                    │  Payment Settlement │
                    └─────────────────────┘
```

---

## 🔄 Quick Command Reference

### Fresh Start (Clean Reset)

**WSL Terminal:**
```bash
cd ~/projects/vLEIWorkLinux1
./stop.sh
docker compose build --no-cache
./deploy.sh
./run-all-buyerseller-2-with-agents.sh
```

**Wait for KERI setup to complete (~2-3 minutes), then start agents:**

**PowerShell Terminal 1 (Seller):**
```powershell
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI\A2A\samples\js
npm run agents:seller
```

**PowerShell Terminal 2 (Buyer):**
```powershell
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI\A2A\samples\js
npm run agents:buyer
```

**PowerShell Terminal 3 (UI):**
```powershell
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI
npm start
```

**PowerShell Terminal 4 (Test):**
```powershell
cd C:\SATHYA\CHAINAIM3003\mcp-servers\stellarboston\vLEI1\LegentUI\A2A\samples\js
node test-invoice-http.mjs
```

---

## 🐛 Troubleshooting

### Issue 1: "Port already in use"
```powershell
# Windows - Kill processes
npx kill-port 3000 8080 9090

# WSL - Kill verification API
wsl
lsof -ti:4000 | xargs kill -9
```

### Issue 2: "Verification API not responding"
```bash
# WSL - Restart KERI infrastructure
cd ~/projects/vLEIWorkLinux1
./stop.sh
./deploy.sh
./run-all-buyerseller-2-with-agents.sh
```

### Issue 3: "Transaction failed - no txId"
- Restart the buyer agent (Ctrl+C, then `npm run agents:buyer`)
- The issue was the field name: `txid` vs `txId` (already fixed)

### Issue 4: "Docker containers not starting"
```bash
# Check Docker is running
docker ps

# Rebuild containers
cd ~/projects/vLEIWorkLinux1
docker compose down -v
docker compose build --no-cache
./deploy.sh
```

### Issue 5: "Insufficient balance"
- Fund wallets again: https://bank.testnet.algorand.network/
- Each wallet needs at least 2 ALGO for testing

---

## ✅ Success Checklist

You've successfully set up the system when:

1. ✅ KERI backend running (verify with `./test-agent-verification-DEEP.sh`)
2. ✅ Verification API returns success at http://localhost:4000
3. ✅ Seller agent running on port 8080
4. ✅ Buyer agent running on port 9090
5. ✅ UI accessible at http://localhost:3000
6. ✅ Test script shows "PAYMENT SUCCESSFUL"
7. ✅ Transaction visible on Algorand TestNet explorer
8. ✅ Buyer agent console shows: "Our verifier successfully verified the delegation for jupiterSellerAgent to the Jupiter_Chief_Sales_Officer role at Jupiter Corporation"

---

## 🎓 For Competition Judges

### What This Demo Shows:

1. **Verifiable Legal Entity Identifiers (vLEI)**
   - Cryptographically verifiable digital identity for organizations
   - Issued by GLEIF (Global Legal Entity Identifier Foundation)

2. **KERI (Key Event Receipt Infrastructure)**
   - Self-certifying identifiers
   - Delegated authority chains
   - Cryptographic verification of agent authorization

3. **Agent-to-Agent (A2A) Protocol**
   - Autonomous agents representing organizations
   - Invoice exchange without human intervention
   - Structured data exchange

4. **Algorand Blockchain**
   - 3-second transaction finality
   - Immutable payment record
   - Low transaction fees (~0.001 ALGO)

5. **Zero-Trust Architecture**
   - Payment ONLY executes after vLEI verification
   - No central authority needed
   - Cryptographic proof of authorization

### Key Metrics:
- **KERI Setup Time:** ~2-3 minutes (one-time)
- **Agent Startup:** ~5 seconds each
- **vLEI Verification:** ~2 seconds
- **Payment Execution:** ~3-5 seconds (Algorand block time)
- **Total Transaction Time:** ~10 seconds end-to-end

---

## 📚 Additional Resources

- **GLEIF vLEI:** https://www.gleif.org/en/vlei/introducing-the-verifiable-lei-vlei
- **KERI:** https://keri.one/
- **A2A Protocol:** https://github.com/a2a-protocol
- **Algorand:** https://developer.algorand.org/
- **AlgoKit:** https://developer.algorand.org/algokit/

---

**Setup Time:** ~45 minutes (including Docker builds)  
**Demo Runtime:** ~10 seconds per transaction  
**Difficulty:** Intermediate
