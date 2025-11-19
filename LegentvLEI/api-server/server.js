import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for all origins (Windows UI can connect)
app.use(cors());
app.use(express.json());

// Helper function to run verification script
async function runVerification(agentName, oorHolderName) {
  try {
    console.log(`Starting verification for: ${agentName}`);
    
    const scriptPath = path.join(__dirname, '..', 'test-agent-verification-DEEP.sh');
    // ADD --json flag to get structured output
    const command = `bash ${scriptPath} ${agentName} ${oorHolderName} docker --json`;
    
    console.log(`Executing: ${command}`);
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: path.join(__dirname, '..'),
      timeout: 120000, // 120 second timeout (2 minutes)
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      env: { ...process.env, GEDA_PRE: '' } // Set GEDA_PRE to avoid warning
    });
    
    console.log('Verification stdout:', stdout);
    if (stderr) {
      console.log('Verification stderr:', stderr);
    }
    
    // Try to parse JSON output from verification script
    let verificationResult;
    
    try {
      // Extract JSON from output (might have Docker noise)
      const jsonMatch = stdout.match(/\{[\s\S]*"validation"[\s\S]*\}/);
      
      if (jsonMatch) {
        // Successfully got JSON
        verificationResult = JSON.parse(jsonMatch[0]);
        console.log('Parsed verification JSON successfully');
      } else {
        // Fallback: No JSON found, use old string check
        console.warn('No JSON in output, using fallback');
        const success = stdout.includes('✅ DEEP VERIFICATION PASSED') || 
                       stdout.includes('DEEP VERIFICATION PASSED');
        verificationResult = {
          success,
          output: stdout,
          agent: agentName,
          oorHolder: oorHolderName,
          timestamp: new Date().toISOString()
        };
      }
    } catch (parseError) {
      // Fallback: JSON parsing failed
      console.error('JSON parse failed:', parseError.message);
      const success = stdout.includes('✅ DEEP VERIFICATION PASSED') || 
                     stdout.includes('DEEP VERIFICATION PASSED');
      verificationResult = {
        success,
        output: stdout,
        agent: agentName,
        oorHolder: oorHolderName,
        timestamp: new Date().toISOString(),
        parseError: parseError.message
      };
    }
    
    return verificationResult;
    
  } catch (error) {
    console.error(`Verification failed for ${agentName}:`, error);
    
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      agent: agentName,
      oorHolder: oorHolderName,
      timestamp: new Date().toISOString()
    };
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'vLEI Verification API Server is running'
  });
});

// Verify Seller Agent endpoint
app.post('/api/verify/seller', async (req, res) => {
  console.log('=== SELLER AGENT VERIFICATION REQUEST ===');
  
  try {
    const agentName = 'jupiterSellerAgent';
    const oorHolderName = 'Jupiter_Chief_Sales_Officer';
    
    const result = await runVerification(agentName, oorHolderName);
    
    const statusCode = result.success ? 200 : 400;
    console.log(`Verification result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('Error in seller verification endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      agent: 'jupiterSellerAgent',
      timestamp: new Date().toISOString()
    });
  }
});

// Verify Buyer Agent endpoint
app.post('/api/verify/buyer', async (req, res) => {
  console.log('=== BUYER AGENT VERIFICATION REQUEST ===');
  
  try {
    const agentName = 'tommyBuyerAgent';
    const oorHolderName = 'Tommy_Chief_Procurement_Officer';
    
    const result = await runVerification(agentName, oorHolderName);
    
    const statusCode = result.success ? 200 : 400;
    console.log(`Verification result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('Error in buyer verification endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      agent: 'tommyBuyerAgent',
      timestamp: new Date().toISOString()
    });
  }
});

// Generic verification endpoint (for future use)
app.post('/api/verify/:agentType', async (req, res) => {
  const { agentType } = req.params;
  console.log(`=== GENERIC VERIFICATION REQUEST: ${agentType} ===`);
  
  // Map agent types to their configurations
  const agentConfigs = {
    seller: {
      agentName: 'jupiterSellerAgent',
      oorHolderName: 'Jupiter_Chief_Sales_Officer'
    },
    buyer: {
      agentName: 'tommyBuyerAgent',
      oorHolderName: 'Tommy_Chief_Procurement_Officer'
    }
  };
  
  const config = agentConfigs[agentType.toLowerCase()];
  
  if (!config) {
    return res.status(400).json({
      success: false,
      error: `Unknown agent type: ${agentType}`,
      availableTypes: Object.keys(agentConfigs)
    });
  }
  
  try {
    const result = await runVerification(config.agentName, config.oorHolderName);
    const statusCode = result.success ? 200 : 400;
    
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('Error in generic verification endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      agent: config.agentName,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🚀 vLEI Verification API Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Server listening on: http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Seller verification: POST http://localhost:${PORT}/api/verify/seller`);
  console.log(`🔐 Buyer verification: POST http://localhost:${PORT}/api/verify/buyer`);
  console.log('='.repeat(60));
  console.log('Ready to accept verification requests...');
  console.log('');
});
