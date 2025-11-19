import { getOrCreateClient } from "../../client/identifiers.js";
import { getAID } from "../../client/identifiers.js";

/**
 * Send IPEX grant for self-attested invoice credential
 * 
 * Usage: tsx invoice-ipex-grant.ts <env> <passcode> <senderAgent> <receiverAgent>
 */

const args = process.argv.slice(2);
const env = args[0] as 'docker' | 'testnet';
const passcode = args[1];
const senderAgentName = args[2];
const receiverAgentName = args[3];

console.log(`========================================`);
console.log(`IPEX GRANT: Invoice Credential`);
console.log(`========================================`);
console.log(``);
console.log(`Sender: ${senderAgentName}`);
console.log(`Receiver: ${receiverAgentName}`);
console.log(``);

try {
    // Get client
    console.log(`[1/5] Connecting to KERIA agent...`);
    const client = await getOrCreateClient(passcode, env);
    const senderAID = await getAID(client, senderAgentName);
    const receiverAID = await getAID(client, receiverAgentName);
    console.log(`✓ Connected`);
    console.log(`  Sender AID: ${senderAID.prefix}`);
    console.log(`  Receiver AID: ${receiverAID.prefix}`);
    console.log(``);
    
    // Get the self-attested invoice credential
    console.log(`[2/5] Retrieving self-attested invoice credential...`);
    const credentials = await client.credentials().list(senderAID.name);
    const invoiceCred = credentials.find((c: any) => {
        const schema = c.sad?.s || '';
        return schema.toLowerCase().includes('invoice');
    });
    
    if (!invoiceCred) {
        throw new Error(`No invoice credential found for ${senderAgentName}`);
    }
    
    console.log(`✓ Invoice credential found: ${invoiceCred.sad.d}`);
    console.log(`  Invoice Number: ${invoiceCred.sad.a?.invoiceNumber || 'N/A'}`);
    console.log(`  Amount: ${invoiceCred.sad.a?.totalAmount || 'N/A'} ${invoiceCred.sad.a?.currency || ''}`);
    console.log(``);
    
    // Verify this is a self-attested credential
    console.log(`[3/5] Verifying self-attestation...`);
    const issuer = invoiceCred.sad.i;
    const holder = invoiceCred.sad.a?.i;
    
    if (issuer !== holder) {
        console.log(`⚠ Warning: This credential is not self-attested`);
        console.log(`  Issuer: ${issuer}`);
        console.log(`  Holder: ${holder}`);
    } else {
        console.log(`✓ Confirmed self-attested credential`);
        console.log(`  Issuer = Holder: ${issuer}`);
    }
    console.log(``);
    
    // Create IPEX grant message
    console.log(`[4/5] Creating IPEX grant message...`);
    
    const grantExn = {
        v: "KERI10JSON000000_",
        t: "exn",
        d: "",  // Will be computed
        i: senderAID.prefix,
        p: "",
        dt: new Date().toISOString(),
        r: "/ipex/grant",
        q: {},
        a: {
            m: "",
            i: receiverAID.prefix,  // Recipient
            d: invoiceCred.sad.d,   // Credential SAID
            s: invoiceCred.sad.s    // Schema
        },
        e: {}
    };
    
    console.log(`✓ Grant message prepared`);
    console.log(`  Credential: ${invoiceCred.sad.d}`);
    console.log(`  Recipient: ${receiverAID.prefix}`);
    console.log(``);
    
    // Send IPEX grant
    console.log(`[5/5] Sending IPEX grant to ${receiverAgentName}...`);
    
    // Create the exchange
    const grant = await client.exchanges().send(
        senderAID.name,
        "grant",
        senderAID,
        "/ipex/grant",
        {
            grantee: receiverAID.prefix,
            credential: invoiceCred.sad.d,
            schema: invoiceCred.sad.s
        },
        {
            d: invoiceCred.sad.d
        }
    );
    
    console.log(`✓ IPEX grant sent successfully`);
    console.log(``);
    
    // Save grant info
    const grantInfo = {
        sender: senderAgentName,
        senderAID: senderAID.prefix,
        receiver: receiverAgentName,
        receiverAID: receiverAID.prefix,
        credentialSAID: invoiceCred.sad.d,
        invoiceNumber: invoiceCred.sad.a?.invoiceNumber,
        amount: invoiceCred.sad.a?.totalAmount,
        currency: invoiceCred.sad.a?.currency,
        timestamp: new Date().toISOString()
    };
    
    console.log(`Grant Information:`);
    console.log(JSON.stringify(grantInfo, null, 2));
    console.log(``);
    
    console.log(`========================================`);
    console.log(`✅ IPEX GRANT COMPLETED`);
    console.log(`========================================`);
    console.log(``);
    console.log(`Summary:`);
    console.log(`  ✓ Invoice credential: ${invoiceCred.sad.d}`);
    console.log(`  ✓ Granted from: ${senderAgentName}`);
    console.log(`  ✓ Granted to: ${receiverAgentName}`);
    console.log(`  ✓ ${receiverAgentName} can now admit the credential`);
    console.log(``);
    
} catch (error: any) {
    console.error(`❌ IPEX grant failed: ${error.message}`);
    console.error(error);
    process.exit(1);
}
