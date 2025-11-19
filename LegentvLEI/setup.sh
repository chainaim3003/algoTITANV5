#!/bin/bash
set -e

echo "🚀 Setting up vLEI Environment..."

# =====================================
# 🧱 Step 1: (Optional) Workspace Setup
# =====================================
# Uncomment the following lines if you want to automatically copy your project
# from the Windows directory to your Linux ~/projects folder.

# mkdir -p ~/projects
# cp -r /mnt/c/CHAINAIM3003/mcp-servers/vLEINew1/vlei-hackathon-2025-workshop-master ~/projects/

# cp -r /mnt/c/SATHYA/CHAINAIM3003/mcp-servers/stellarboston/vLEI1/vLEIWorkLinux1/* ~/projects/vLEIWorkLinux1/

# IF you have already created the project, please navigate to that dir.
# cd ~/projects/vLEIWorkLinux1

# =====================================
# ⚙️ Step 2: Install Dependencies
# =====================================
sudo apt update
sudo apt install -y dos2unix 

# =====================================
# 🧹 Step 3: Fix Script Line Endings
# =====================================
find . -type f -name "*.sh" -exec dos2unix {} \;

# =====================================
# 🔑 Step 4: Make All Shell Scripts Executable
# =====================================
chmod +x *.sh
chmod +x scripts/*.sh 2>/dev/null
chmod +x */*.sh 2>/dev/null