#!/usr/bin/env node

/**
 * Agent Card Generator
 * 
 * Generates complete agent cards from vLEI workflow output data.
 * This script reads the generated JSON files and agent card template
 * to produce complete agent cards with real AIDs and credentials.
 * 
 * Usage: node generate-agent-cards.js
 */

const fs = require('fs');
const path = require('path');

// File paths
const CONFIG_FILE = './appconfig/configBuyerSellerAIAgent1.json';
const TASK_DATA_DIR = './task-data';
const AGENT_CARD_TEMPLATE = './agentcard.json';
const OUTPUT_DIR = './agent-cards';

// Read configuration
function readConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    console.log('✓ Configuration loaded');
    return config;
  } catch (error) {
    console.error('✗ Failed to read configuration:', error.message);
    process.exit(1);
  }
}

// Read agent info file
function readAgentInfo(agentAlias) {
  const filePath = path.join(TASK_DATA_DIR, `${agentAlias}-info.json`);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`✓ Agent info loaded: ${agentAlias}`);
    return data;
  } catch (error) {
    console.error(`✗ Failed to read agent info (${agentAlias}):`, error.message);
    return null;
  }
}

// Read person info file
function readPersonInfo(personAlias) {
  const filePath = path.join(TASK_DATA_DIR, `${personAlias}-info.json`);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`✓ Person info loaded: ${personAlias}`);
    return data;
  } catch (error) {
    console.error(`✗ Failed to read person info (${personAlias}):`, error.message);
    return null;
  }
}

// Read LE info file
function readLEInfo(leAlias) {
  const filePath = path.join(TASK_DATA_DIR, `${leAlias}-info.json`);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`✓ LE info loaded: ${leAlias}`);
    return data;
  } catch (error) {
    console.error(`✗ Failed to read LE info (${leAlias}):`, error.message);
    return null;
  }
}

// Read OOR credential info
function readOORCredentialInfo() {
  const filePath = path.join(TASK_DATA_DIR, 'oor-credential-info.json');
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('✓ OOR credential info loaded');
    return data;
  } catch (error) {
    console.error('✗ Failed to read OOR credential info:', error.message);
    return null;
  }
}

// Read QVI info
function readQVIInfo() {
  const filePath = path.join(TASK_DATA_DIR, 'qvi-info.json');
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('✓ QVI info loaded');
    return data;
  } catch (error) {
    console.error('✗ Failed to read QVI info:', error.message);
    return null;
  }
}

// Generate agent card from template
function generateAgentCard(config, org, person, agent) {
  console.log(`\n→ Generating agent card for: ${agent.alias}`);
  
  // Read agent data
  const agentInfo = readAgentInfo(agent.alias);
  const personInfo = readPersonInfo(person.alias);
  const leInfo = readLEInfo(org.alias);
  const oorCredInfo = readOORCredentialInfo();
  const qviInfo = readQVIInfo();
  
  if (!agentInfo || !personInfo || !leInfo) {
    console.error(`✗ Missing required data for ${agent.alias}`);
    return null;
  }
  
  // Determine agent role based on organization
  const isJupiter = org.id === 'jupiter';
  const isTommy = org.id === 'tommy';
  
  // Base agent card structure
  const agentCard = {
    name: isJupiter ? "Jupiter Seller Agent" : "Tommy Buyer Agent",
    description: isJupiter 
      ? "Autonomous AI agent responsible for initiating, negotiating, and managing sales orders for JUPITER KNITTING COMPANY."
      : "AI agent responsible for submitting, negotiating, and tracking purchase orders for TOMMY HILFIGER EUROPE B.V.",
    url: isJupiter ? "https://jupiter-agent.com/" : "https://tommy-agent.com/",
    provider: {
      organization: org.name,
      url: isJupiter ? "https://jupiterknitting.com" : "https://tommyhilfiger.com"
    },
    version: "1.0.0",
    capabilities: {
      streaming: true,
      stateTransitionHistory: true
    },
    skills: isJupiter ? [
      {
        id: "procurement_management",
        name: "Procurement Management",
        description: "Collaborates with verified buyer agents to review incoming trade requirements, evaluate purchase requests, and align production capacity with order feasibility. Ensures all interactions occur within verified GLEIF trust boundaries.",
        tags: ["seller", "procurement", "verification", "gleif", "trade", "compliance"]
      },
      {
        id: "purchase_order_management",
        name: "Purchase Order Management",
        description: "Receives and processes purchase orders from verified buyer agents. Confirms order terms, delivery schedules, and initiates production after GLEIF credential validation.",
        tags: ["seller", "sales", "purchase-order", "gleif", "automation", "order-processing"]
      },
      {
        id: "invoice_approval",
        name: "Invoice Approval & Dispatch",
        description: "Generates and approves digital invoices for completed or approved purchase orders. Ensures all invoices include embedded vLEI credentials and adhere to traceability standards.",
        tags: ["seller", "finance", "invoice", "verification", "traceability", "gleif"]
      },
      {
        id: "payment_authorization",
        name: "Payment Authorization & Reconciliation",
        description: "Validates incoming payment confirmations from buyer agents, authenticates transaction credentials, and updates order fulfillment status in coordination with verified payment channels.",
        tags: ["seller", "payment", "authentication", "finance", "gleif", "compliance"]
      }
    ] : [
      {
        id: "procurement_management",
        name: "Procurement Management",
        description: "Oversees the complete procurement lifecycle — from identifying verified seller agents and evaluating proposals to finalizing trade agreements. Ensures that all counterparties are GLEIF-verified and contract terms align with buyer requirements.",
        tags: ["buyer", "procurement", "trade", "negotiation", "gleif", "compliance"]
      },
      {
        id: "purchase_order",
        name: "Purchase Order Management",
        description: "Manages procurement negotiations, evaluates offers, and finalizes trade requirements.",
        tags: ["buyer", "procurement", "trade"]
      },
      {
        id: "Invoice_Approval",
        name: "Invoice Approval",
        description: "Manages procurement negotiations, evaluates offers, and finalizes trade requirements.",
        tags: ["buyer", "procurement", "trade"]
      },
      {
        id: "Payment_Authentication",
        name: "Payment Authentication",
        description: "Manages procurement negotiations, evaluates offers, and finalizes trade requirements.",
        tags: ["buyer", "procurement", "trade"]
      }
    ],
    extensions: {
      gleifIdentity: {
        lei: org.lei,
        legalEntityName: org.name,
        registryName: org.registryName,
        qvi: qviInfo ? qviInfo.aid : "QVI_AID_PLACEHOLDER",
        officialRole: person.officialRole,
        engagementRole: isJupiter ? "Seller Agent" : "Buyer Agent"
      },
      vLEImetadata: {
        // Real AIDs from generated data
        delegatorAID: personInfo.aid,
        delegateeAID: agentInfo.aid,
        
        // Credential SAIDs
        delegatorSAID: oorCredInfo ? oorCredInfo.said : "CREDENTIAL_SAID_PLACEHOLDER",
        delegateeSAID: agentInfo.aid, // Agent's own AID serves as identifier
        
        // OOBIs
        delegatorOOBI: personInfo.oobi,
        delegateeOOBI: agentInfo.oobi,
        leAID: leInfo.aid,
        leOOBI: leInfo.oobi,
        
        // Verification path
        verificationPath: [
          "GLEIF_ROOT → QVI",
          `QVI → ${org.name} → ${person.legalName} → ${agent.alias}`
        ],
        
        // Status and timestamp
        status: "verified",
        verificationEndpoint: "http://vlei-verification:9723/verify/agent-delegation",
        timestamp: new Date().toISOString()
      },
      gleifVerification: {
        gleifVerificationEndpoint: `https://gleif.org/api/v1/lei/${org.lei}`
      },
      keriIdentifiers: {
        agentAID: agentInfo.aid,
        oorHolderAID: personInfo.aid,
        legalEntityAID: leInfo.aid,
        qviAID: qviInfo ? qviInfo.aid : "QVI_AID_PLACEHOLDER"
      }
    }
  };
  
  console.log(`✓ Agent card generated for ${agent.alias}`);
  console.log(`  Agent AID: ${agentInfo.aid}`);
  console.log(`  Delegator AID: ${personInfo.aid}`);
  console.log(`  LEI: ${org.lei}`);
  
  return agentCard;
}

// Main execution
function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  vLEI Agent Card Generator');
  console.log('═══════════════════════════════════════════════\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created output directory: ${OUTPUT_DIR}\n`);
  }
  
  // Load configuration
  const config = readConfig();
  
  let generatedCount = 0;
  
  // Process each organization
  for (const org of config.organizations) {
    console.log(`\n─────────────────────────────────────────────`);
    console.log(`Processing: ${org.name}`);
    console.log(`─────────────────────────────────────────────`);
    
    // Process each person in the organization
    for (const person of org.persons) {
      // Process each agent delegated to the person
      if (person.agents && person.agents.length > 0) {
        for (const agent of person.agents) {
          const agentCard = generateAgentCard(config, org, person, agent);
          
          if (agentCard) {
            // Write agent card to file
            const outputFile = path.join(OUTPUT_DIR, `${agent.alias}-card.json`);
            fs.writeFileSync(outputFile, JSON.stringify(agentCard, null, 2));
            console.log(`✓ Agent card saved: ${outputFile}`);
            generatedCount++;
          }
        }
      }
    }
  }
  
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  ✅ Generation Complete`);
  console.log(`  Generated ${generatedCount} agent card(s)`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log('═══════════════════════════════════════════════\n');
}

// Run the script
main();
