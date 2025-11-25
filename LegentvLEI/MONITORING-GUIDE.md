# Quick Monitoring Guide

## 🚀 **Fast Check - What's Happening Right Now?**

```bash
cd ~/projects/LegentvLEI
chmod +x check-delegation-now.sh
./check-delegation-now.sh
```

**Shows:**
- Recent delegation logs
- Pending operations count
- Witness online status
- What to do next

**Takes: 2 seconds**

---

## 📊 **Detailed Status - Complete Overview**

```bash
chmod +x quick-monitor.sh
./quick-monitor.sh
```

**Shows:**
1. OOR Holder AID (auto-detected)
2. All 6 witnesses status with KEL info
3. KERIA operations (pending/complete)
4. Recent delegation activity
5. Overall health summary

**Takes: 5 seconds**

---

## 🔍 **Find OOR Holder AID**

```bash
chmod +x find-oor-holder-aid.sh
./find-oor-holder-aid.sh
```

**Shows:**
- All person/OOR holder AIDs
- Agent delegator AIDs
- Which one to use for monitoring

---

## ⚡ **Continuous Monitoring**

### Option 1: Auto-refresh every 2 seconds
```bash
watch -n 2 './check-delegation-now.sh'
```

### Option 2: Live logs
```bash
docker compose logs tsx-shell --follow | grep -i "delegation\|querying\|finishing"
```

### Option 3: Witness logs
```bash
docker compose logs witness --follow | grep -i "receipt\|validation"
```

---

## 🎯 **What Each Script Does**

| Script | Purpose | Time | Use When |
|--------|---------|------|----------|
| `check-delegation-now.sh` | Quick status check | 2s | Want instant snapshot |
| `quick-monitor.sh` | Detailed status | 5s | Need full picture |
| `find-oor-holder-aid.sh` | Find AIDs | 1s | Need specific AID |
| `monitor-witness-receipts.sh` | Real-time receipts | Continuous | During delegation |
| `diagnose-delegation-flow.sh` | Deep diagnostics | 10s | Troubleshooting |
| `verify-complete-delegation-chain.sh` | End-to-end verify | 15s | After completion |

---

## 📋 **Common Workflows**

### **Workflow 1: Monitoring Active Delegation**

**Terminal 1 - Run delegation:**
```bash
./run-all-buyerseller-2C-with-agents.sh
```

**Terminal 2 - Monitor status:**
```bash
watch -n 2 './check-delegation-now.sh'
```

**Terminal 3 - Watch logs:**
```bash
docker compose logs tsx-shell --follow
```

---

### **Workflow 2: Troubleshooting Timeout**

```bash
# 1. Quick check
./check-delegation-now.sh

# 2. Detailed status
./quick-monitor.sh

# 3. Check if fix is active
./check-if-fix-is-running.sh

# 4. Deep diagnostic
./diagnose-delegation-flow.sh <agent-name> <oor-holder-alias>
```

---

### **Workflow 3: After Delegation Completes**

```bash
# Verify entire chain
./verify-complete-delegation-chain.sh

# Check specific agent
./diagnose-delegation-flow.sh jupiterSellerAgent Jupiter_Chief_Sales_Officer
```

---

## 🐛 **Troubleshooting**

### Issue: "No OOR Holder AID found"

**Solution 1: Wait for delegation to start**
```bash
docker compose logs tsx-shell --tail=50 | grep -i "person\|oor"
```

**Solution 2: List all AIDs**
```bash
docker compose exec tsx-shell ls /task-data/*-info.json
```

**Solution 3: Check if containers running**
```bash
docker compose ps
```

---

### Issue: "Witnesses offline"

**Check witness logs:**
```bash
docker compose logs witness | grep ERROR
```

**Restart witnesses:**
```bash
docker compose restart witness
sleep 10  # Wait for startup
./quick-monitor.sh  # Verify
```

---

### Issue: "Delegation taking too long"

**Expected times:**
- With toad=3: 60-180 seconds (NORMAL)
- With toad=1: 10-30 seconds
- With toad=0: < 5 seconds

**Check if normal:**
```bash
./quick-monitor.sh
# Look for "Pending operations"
```

**If truly stuck:**
```bash
# Check if fix is active
./check-if-fix-is-running.sh

# Apply fix if needed
cp ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish-FIXED.ts \
   ./sig-wallet/src/tasks/agent/agent-aid-delegate-finish.ts
docker compose build --no-cache tsx-shell
docker compose restart tsx-shell
```

---

## 🎓 **Understanding the Output**

### From `check-delegation-now.sh`:

```bash
✓ tsx-shell is running

Recent delegation logs:
Finishing jupiterSellerAgent delegation...
Querying OOR Holder key state...      ← STUCK HERE
                                      
⏳ 1 operation(s) pending             ← NORMAL (waiting for witnesses)
  
Online witnesses: 6/6                 ← GOOD
```

**What this means:**
- Delegation is at "Querying OOR Holder key state" step
- Waiting for 3 of 6 witnesses to respond
- This is NORMAL and can take 60-180 seconds

---

### From `quick-monitor.sh`:

```bash
→ Witness wan (port 5642): ✓ Online
  └─ Has KEL with 5 event(s)           ← Has received events
→ Witness wil (port 5643): ✓ Online
  └─ Has KEL with 5 event(s)           ← Has received events
→ Witness wes (port 5644): ✓ Online
  └─ Has KEL with 4 event(s)           ← Slightly behind, normal
→ Witness wit (port 5645): ✓ Online
  └─ No KEL data yet                   ← Still propagating
→ Witness wub (port 5646): ✓ Online
  └─ No KEL data yet                   ← Still propagating
→ Witness wyz (port 5647): ✓ Online
  └─ No KEL data yet                   ← Still propagating

Witness Summary:
  Online: 6/6
  
Operations Status:
  Pending: 1                           ← Waiting for threshold (3 witnesses)
  Complete: 15
  
⏳ 1 operation(s) still in progress
```

**What this means:**
- All witnesses are online ✓
- First 3 witnesses have received events ✓
- Waiting for their receipts to propagate
- Once 3 complete → threshold reached → query succeeds

---

## 💡 **Tips**

1. **Don't panic if delegation takes 2-3 minutes** - this is normal with 6 witnesses and toad=3
2. **Use the fix** - it retries 5 times with proper timeouts
3. **For faster dev/test** - reduce threshold to toad=1 (10-30 seconds)
4. **Monitor in real-time** - use `watch` command for continuous updates
5. **Check logs** - they show exactly what's happening

---

## 📞 **Quick Commands Reference**

```bash
# Quick status
./check-delegation-now.sh

# Detailed status
./quick-monitor.sh

# Continuous monitoring
watch -n 2 './check-delegation-now.sh'

# Find AIDs
./find-oor-holder-aid.sh

# Check witness logs
docker compose logs witness --tail=50

# Check KERIA operations
docker compose exec tsx-shell curl http://keria:3901/operations | jq

# Restart if needed
docker compose restart witness tsx-shell
```

---

All scripts are safe to run - they only read/query, never modify anything.
