import { getOrCreateClient } from "../../client/identifiers.js";
import { createRegistry } from "../../client/credentials.js";

// Process arguments
const args = process.argv.slice(2);
const env = args[0] as 'docker' | 'testnet';
const issuerAidName = args[1];
const passcode = args[2];
const registryName = args[3];

console.log(`Creating invoice credential registry...`);
console.log(`  Issuer: ${issuerAidName}`);
console.log(`  Registry: ${registryName}`);

// Get client
const client = await getOrCreateClient(passcode, env);

// Create registry for invoice credentials
const registryResult = await createRegistry(client, issuerAidName, registryName);
console.log(`✓ Registry created with ID: ${registryResult.regk}`);
