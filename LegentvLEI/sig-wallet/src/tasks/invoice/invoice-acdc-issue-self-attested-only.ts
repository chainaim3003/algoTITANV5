import fs from "fs";
import { getOrCreateClient } from "../../client/identifiers.js";
import { issueCredential } from "../../client/credentials.js";
import { resolveOobi } from "../../client/oobis.js";

// Process arguments
const args = process.argv.slice(2);
const env = args[0] as 'docker' | 'testnet';
const issuerAidName = args[1]; // jupiterSalesAgent (self-attested)
const passcode = args[2];
const registryName = args[3];
const invoiceSchemaSaid = args[4];
const invoiceDataJson = args[5];
const outputPath = args[6];

console.log(`Issuing self-attested invoice credential...`);
console.log(`  Issuer (self-attested): ${issuerAidName}`);
console.log(`  Issuee: ${issuerAidName} (SAME as issuer)`);
console.log(`  Registry: ${registryName}`);

// Get client
const client = await getOrCreateClient(passcode, env);

// Get issuer AID
const issuerAid = await client.identifiers().get(issuerAidName);
const issuerPrefix = issuerAid.prefix;

console.log(`  Issuer AID: ${issuerPrefix}`);

// Resolve schema OOBI
console.log(`Resolving invoice schema OOBI...`);
await resolveOobi(client, `http://schema:7723/oobi/${invoiceSchemaSaid}`, 'schema');

// Parse invoice data
const invoiceData = JSON.parse(invoiceDataJson);

// NO EDGE SECTION - Self-attested credential does NOT chain to OOR
const credEdge = undefined;

// Construct rules
const credRules = {
    d: '', // SAID will be calculated by KERIpy
    usageDisclaimer: {
        l: 'This is a self-attested invoice credential issued by the agent. The issuer and holder are the same entity. This credential represents a business transaction and is NOT chained to an OOR credential.'
    },
    invoiceTerms: {
        l: `Payment is due by ${invoiceData.dueDate}. All amounts are in ${invoiceData.currency}. This invoice is self-attested by ${issuerAidName}.`
    },
    selfAttestation: {
        l: 'This credential is self-attested. The trust chain derives from the agent delegation, not from credential chaining. The agent is delegated from an OOR holder who has a complete trust chain to the GLEIF root.'
    }
};

console.log(`Issuing self-attested credential to registry ${registryName}...`);
console.log(`  Issuer = Issuee = ${issuerPrefix} (self-attested)`);
console.log(`  Edge: NONE (no OOR chain)`);

// Issue credential - issuer and holder are the SAME (self-attested)
const { said, issuer, issuee, acdc, anc, iss } = await issueCredential(
    client,
    issuerAidName,
    registryName,
    invoiceSchemaSaid,
    issuerPrefix, // SAME as issuer - self-attested!
    invoiceData,
    credEdge, // No edge - self-attested
    credRules
);

console.log(`✓ Self-attested invoice credential created: ${said}`);
console.log(`  Issuer: ${issuer}`);
console.log(`  Issuee: ${issuee}`);
console.log(`  Self-attested: ${issuer === issuee ? 'YES ✓' : 'NO'}`);

if (issuer !== issuee) {
    console.error(`❌ ERROR: Credential is not self-attested!`);
    console.error(`  Expected issuer === issuee, but got:`);
    console.error(`  Issuer: ${issuer}`);
    console.error(`  Issuee: ${issuee}`);
    process.exit(1);
}

// Save credential info
const credInfo = {
    said,
    issuer,
    issuee,
    selfAttested: true,
    hasEdge: false,
    invoiceNumber: invoiceData.invoiceNumber,
    totalAmount: invoiceData.totalAmount,
    currency: invoiceData.currency,
    dueDate: invoiceData.dueDate,
    paymentMethod: invoiceData.paymentMethod,
    paymentChainID: invoiceData.paymentChainID,
    paymentWalletAddress: invoiceData.paymentWalletAddress,
    ref_uri: invoiceData.ref_uri,
    paymentTerms: invoiceData.paymentTerms || null,
    acdc,
    anc,
    iss
};

await fs.promises.writeFile(outputPath, JSON.stringify(credInfo, null, 2));
console.log(`✓ Self-attested invoice credential info saved to ${outputPath}`);
console.log(``);
console.log(`Summary:`);
console.log(`  ✓ SAID: ${said}`);
console.log(`  ✓ Self-attested: YES`);
console.log(`  ✓ Edge: NONE`);
console.log(`  ✓ Stored in ${issuerAidName}'s KERIA`);
console.log(`  ℹ Next step: Use invoice-ipex-grant.sh to share with another agent`);
