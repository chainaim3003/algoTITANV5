import { getOrCreateClient } from "../../client/identifiers.js";
import { getAID } from "../../client/identifiers.js";

/**
 * Admit IPEX grant for invoice credential
 * Receiver (e.g., tommyBuyerAgent) admits the grant from sender (e.g., jupiterSalesAgent)
 * 
 * Usage: tsx invoice-ipex-admit.ts <env> <passcode> <receiverAgent> <senderAgent>
 */

const args = process.argv.slice(2);
const env = args[0] as 'docker' | 'testnet';
const passcode = args[1];
const receiverAgentName = args[2];
const senderAgentName = args[3];

console.log(`========================================`);
console.log(`IPEX ADMIT: Invoice Credential`);
console.log(`========================================`);
console.log(``);
console.log(`Receiver: ${receiverAgentName}`);
console.log(`Sender: ${senderAgentName}`);
console.log(``);

try {
    // Get client
    console.log(`[1/5] Connecting to KERIA agent...`);
    const client = await getOrCreateClient(passcode, env);
    const receiverAID = await getAID(client, receiverAgentName);
    const senderAID = await getAID(client, senderAgentName);
    console.log(`✓ Connected`);
    console.log(`  Receiver AID: ${receiverAID.prefix}`);
    console.log(`  Sender AID: ${senderAID.prefix}`);
    console.log(``);
    
    // Get pending grant notifications
    console.log(`[2/5] Checking for pending grant notifications...`);
    const notifications = await client.notifications().list();
    
    const pendingGrants = notifications.notes.filter((n: any) => {
        const route = n.a?.r || '';
        const fromSender = n.a?.i === senderAID.prefix;
        return (route === '/ipex/grant' || route === 'ipex/grant') && fromSender;
    });
    
    if (pendingGrants.length === 0) {
        throw new Error(
            `No pending grant from ${senderAgentName} found. ` +
            `Make sure the sender has sent the IPEX grant first.`
        );
    }
    
    console.log(`✓ Found ${pendingGrants.length} pending grant(s) from ${senderAgentName}`);
    console.log(``);
    
    // Process the first grant (should be the invoice)
    const grant = pendingGrants[0];
    console.log(`[3/5] Processing grant notification...`);
    console.log(`  Notification SAID: ${grant.i}`);
    
    // Get the credential SAID from the grant
    const credSAID = grant.a?.d;
    if (!credSAID) {
        throw new Error(`Grant notification missing credential SAID`);
    }
    
    console.log(`  Credential SAID: ${credSAID}`);
    console.log(`  Schema: ${grant.a?.s || 'N/A'}`);
    console.log(``);
    
    // Admit the credential
    console.log(`[4/5] Admitting IPEX grant...`);
    
    try {
        // Admit the grant
        await client.ipex().admit(
            receiverAID.name,
            '',  // message SAID (will be generated)
            grant.i,  // grant SAID from notification
            new Date().toISOString()
        );
        
        console.log(`✓ IPEX grant admitted successfully`);
        console.log(`  Credential SAID: ${credSAID}`);
        console.log(``);
        
        // Mark notification as read
        await client.notifications().mark(grant.i);
        console.log(`✓ Notification marked as read`);
        console.log(``);
        
    } catch (admitError: any) {
        console.error(`❌ Failed to admit grant: ${admitError.message}`);
        throw admitError;
    }
    
    // Verify the credential is now in receiver's storage
    console.log(`[5/5] Verifying credential storage...`);
    const credentials = await client.credentials().list(receiverAID.name);
    const receivedCred = credentials.find((c: any) => c.sad?.d === credSAID);
    
    if (receivedCred) {
        console.log(`✓ Invoice credential confirmed in ${receiverAgentName}'s KERIA storage`);
        console.log(`  SAID: ${receivedCred.sad.d}`);
        console.log(`  Schema: ${receivedCred.sad.s}`);
        
        // Display invoice details if available
        const invoiceNumber = receivedCred.sad.a?.invoiceNumber;
        const amount = receivedCred.sad.a?.totalAmount;
        const currency = receivedCred.sad.a?.currency;
        
        if (invoiceNumber) {
            console.log(`  Invoice Number: ${invoiceNumber}`);
        }
        if (amount && currency) {
            console.log(`  Amount: ${amount} ${currency}`);
        }
        
        console.log(``);
    } else {
        console.log(`⚠ Warning: Credential not found in storage immediately after admit`);
        console.log(`  This might be due to sync delay. Check again shortly.`);
        console.log(``);
    }
    
    console.log(`========================================`);
    console.log(`✅ IPEX ADMIT COMPLETED`);
    console.log(`========================================`);
    console.log(``);
    console.log(`Summary:`);
    console.log(`  ✓ Grant admitted from ${senderAgentName}`);
    console.log(`  ✓ Credential SAID: ${credSAID}`);
    console.log(`  ✓ Now available in ${receiverAgentName}'s KERIA`);
    console.log(`  ✓ Can be queried and validated`);
    console.log(``);
    
} catch (error: any) {
    console.error(`❌ IPEX admit failed: ${error.message}`);
    console.error(error);
    process.exit(1);
}
