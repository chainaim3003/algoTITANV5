import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid';
import fs from "fs";
import path from "path";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from seller-agent/.env
dotenv.config({ path: path.join(__dirname, '.env') });

import { A2AClient } from "@a2a-js/sdk/client";
import type { InvoiceSchema, InvoiceMessage } from '../../types/invoice.js';


import {
  AgentCard,
  Task,
  TaskStatusUpdateEvent,
  Message
} from "@a2a-js/sdk";
import {
  InMemoryTaskStore,
  TaskStore,
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
  DefaultRequestHandler,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";

/**
 * Simple Seller Agent Executor
 */
class SellerAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();

  public cancelTask = async (
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> => {
    this.cancelledTasks.add(taskId);
  };

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const userMessage = requestContext.userMessage;
    const existingTask = requestContext.task;

    const taskId = existingTask?.id || uuidv4();
    const contextId = userMessage.contextId || existingTask?.contextId || uuidv4();

    console.log(`[SellerAgent] Processing message ${userMessage.messageId} for task ${taskId}`);

    // 1. Publish initial Task event if it's a new task
    if (!existingTask) {
      const initialTask: Task = {
        kind: 'task',
        id: taskId,
        contextId: contextId,
        status: {
          state: "submitted",
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        metadata: userMessage.metadata,
      };
      eventBus.publish(initialTask);
    }

    // 2. Publish "working" status
    const workingStatusUpdate: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId: taskId,
      contextId: contextId,
      status: {
        state: "working",
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: 'Jupiter Agent processing your request...' }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(workingStatusUpdate);

    try {
      // Simple response based on the user's message
      const userText = userMessage.parts
        .filter(p => p.kind === 'text')
        .map(p => (p as any).text)
        .join(' ')
        .toLowerCase();

      let responseText = "Hello! I'm Jupiter Agent, a seller agent. I can help you with product information.";

      if (userText.includes('product') || userText.includes('sell')) {
        responseText = "I have various products available. Our catalog includes electronics, clothing, and accessories. What are you interested in?";
      } else if (userText.includes('price') || userText.includes('cost')) {
        responseText = "Our prices are competitive! Please specify which product you're interested in for exact pricing.";
      } else if (userText.includes('hello') || userText.includes('hi')) {
        responseText = "Hello! I'm Jupiter Agent. How can I assist you with your purchase today?";
      } else if (userText.includes('send invoice') || userText.includes('invoice')) {
        console.log('[SellerAgent] Generating and sending invoice...');

        // Create invoice data
        const invoice: InvoiceMessage = {
          invoiceId: `INV-${uuidv4().substring(0, 8)}`,
          invoice: {
            amount: parseFloat(process.env.INVOICE_AMOUNT || '5000.00'),
            currency: process.env.INVOICE_CURRENCY || 'USD',
            dueDate: '2025-12-31',
            refUri: {
              type: 'transaction_hash',
              value: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            },
            destinationAccount: {
              type: 'digital_asset',
              chainId: process.env.ALGORAND_GENESIS_ID || 'testnet-v1.0',
              walletAddress: process.env.SELLER_ADDRESS || ''
            }
          },
          timestamp: new Date().toISOString(),
          senderAgent: {
            name: jupiterAgentCard.name,
            agentAID: jupiterAgentCard.extensions?.keriIdentifiers?.agentAID || 'UNKNOWN'
          }
        };

        // Send invoice to buyer agent
        try {
          const buyerAgentUrl = 'http://localhost:9090';

          console.log(`[SellerAgent] Connecting to buyer agent at ${buyerAgentUrl}...`);

          // Use direct URL for local testing (agent card URL field points to production domain)
          const buyerClient = new A2AClient(buyerAgentUrl);

          console.log(`[SellerAgent] Connected to buyer agent`);
          console.log(`[SellerAgent] Sending invoice to buyer...`);

          // Create message to send
          const stream = buyerClient.sendMessageStream({
            message: {
              kind: "message",
              role: "agent",
              messageId: uuidv4(),
              parts: [{ kind: "data", data: invoice }],
            },
          });

          let buyerResponse = '';

          // Listen for buyer's response
          for await (const event of stream) {
            if (event.kind === 'status-update' && event.status.message) {
              const responseText = event.status.message.parts
                .filter(p => p.kind === 'text')
                .map(p => (p as any).text)
                .join(' ');

              if (responseText) {
                buyerResponse = responseText;
              }
            }
          }

          responseText = `
📤 INVOICE SENT TO BUYER AGENT

Invoice Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Invoice ID: ${invoice.invoiceId}
- Amount: ${invoice.invoice.currency} ${invoice.invoice.amount}
- Due Date: ${invoice.invoice.dueDate}
- Chain: ${invoice.invoice.destinationAccount.chainId}
- Wallet: ${invoice.invoice.destinationAccount.walletAddress}
- Ref URI: ${invoice.invoice.refUri.type}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      ${buyerResponse ? `🔔 BUYER RESPONSE:\n${buyerResponse}` : '⏳ Waiting for buyer response...'}
                `.trim();

          console.log('[SellerAgent] Invoice sent and response received');

        } catch (error: any) {
          console.error('[SellerAgent] Error sending invoice:', error);
          responseText = `❌ Failed to send invoice: ${error.message}\n\nMake sure buyer agent is running at http://localhost:9090`;
        }
      }
      // Check if cancelled
      if (this.cancelledTasks.has(taskId)) {
        const cancelledUpdate: TaskStatusUpdateEvent = {
          kind: 'status-update',
          taskId: taskId,
          contextId: contextId,
          status: {
            state: "canceled",
            timestamp: new Date().toISOString(),
          },
          final: true,
        };
        eventBus.publish(cancelledUpdate);
        return;
      }

      // 3. Publish final completed status
      const agentMessage: Message = {
        kind: 'message',
        role: 'agent',
        messageId: uuidv4(),
        parts: [{ kind: 'text', text: responseText }],
        taskId: taskId,
        contextId: contextId,
      };

      const finalUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: "completed",
          message: agentMessage,
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(finalUpdate);

      console.log(`[SellerAgent] Task ${taskId} completed`);

    } catch (error: any) {
      console.error(`[SellerAgent] Error processing task ${taskId}:`, error);
      const errorUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: "failed",
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: `Error: ${error.message}` }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(errorUpdate);
    }
  }
}
// --- Server Setup ---

// Jupiter Agent Card with custom metadata
const jupiterCardPath = path.resolve(

  // "C:/CHAINAIM3003/mcp-servers/LegentUI/A2A/agent-cards/jupiterSellerAgent-card.json"

  "C:/CHAINAIM3003/mcp-servers/Legent3/Legent/A2A/agent-cards/jupiterSellerAgent-card.json"

);
const jupiterAgentCard: AgentCard = JSON.parse(
  fs.readFileSync(jupiterCardPath, "utf8")
);

async function main() {
  // Validate environment variables
  if (!process.env.SELLER_ADDRESS) {
    console.error('❌ ERROR: SELLER_ADDRESS not set in .env file');
    process.exit(1);
  }

  if (!process.env.ALGORAND_GENESIS_ID) {
    console.warn('⚠️  WARNING: ALGORAND_GENESIS_ID not set, using default: testnet-v1.0');
  }

  console.log('✅ Environment variables loaded:');
  console.log(`   Seller Address: ${process.env.SELLER_ADDRESS}`);
  console.log(`   Chain ID: ${process.env.ALGORAND_GENESIS_ID}`);
  console.log(`   Invoice Amount: ${process.env.INVOICE_CURRENCY} ${process.env.INVOICE_AMOUNT}\n`);

  // 1. Create TaskStore
  const taskStore: TaskStore = new InMemoryTaskStore();

  // 2. Create AgentExecutor
  const agentExecutor: AgentExecutor = new SellerAgentExecutor();

  // 3. Create DefaultRequestHandler
  const requestHandler = new DefaultRequestHandler(
    jupiterAgentCard,
    taskStore,
    agentExecutor
  );

  // 4. Create and setup A2AExpressApp
  const appBuilder = new A2AExpressApp(requestHandler);
  const app = express();

  // Add CORS middleware to allow requests from UI
  app.use(cors({
    origin: 'http://localhost:3000', // Allow UI origin
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  }));

  const expressApp = appBuilder.setupRoutes(app);

  // 5. Start the server
  const PORT = process.env.PORT || 8080;
  expressApp.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║          🪐 JUPITER AGENT (SELLER) STARTED 🪐             ║
╠════════════════════════════════════════════════════════════╣
║  Name:       ${jupiterAgentCard.name}                     
║  Agent AID:  ${jupiterAgentCard.extensions?.keriIdentifiers?.agentAID}                   
║  OOR Role:   ${jupiterAgentCard.extensions?.gleifIdentity?.officialRole || 'N/A'}
╠════════════════════════════════════════════════════════════╣
║  Agent Card: http://localhost:${PORT}/.well-known/agent-card.json
║  Status:     🟢 READY                                      
║  Feature:    Can receive buyer inquiries!                  
╚════════════════════════════════════════════════════════════╝

💡 Try saying: "fetch buyer agent"
`);
  });
}

main().catch(console.error);
