import fs from 'fs';
import {getOrCreateClient} from "../../client/identifiers.js";
import {waitOperation} from "../../client/operations.js";
import {SignifyClient} from "signify-ts";

const args = process.argv.slice(2);
const env = args[0] as 'docker' | 'testnet';
const passcode = args[1];
const agentAidName = args[2];
const oorHolderInfoPath = args[3];
const agentInceptionInfoPath = args[4];
const agentOutputPath = args[5];

async function finishAgentDelegation(
    agentClient: SignifyClient,
    oorHolderPre: string,
    agentName: string,
    agentIcpOpName: string,
    maxRetries: number = 10,
    retryDelay: number = 1000
) {
    console.log(`Finishing ${agentName} delegation by OOR Holder ${oorHolderPre} on op: ${agentIcpOpName}...`);

    // Step 1: Refresh OOR Holder key state to discover delegation anchor
    console.log(`Querying OOR Holder key state...`);
    const op: any = await agentClient.keyStates().query(oorHolderPre, '1');
    await waitOperation(agentClient, op);
    console.log(`✓ OOR Holder key state refreshed`);

    // Step 2: Wait for agent inception to complete
    console.log(`Waiting for agent inception operation to complete...`);
    const agentOp: any = await agentClient.operations().get(agentIcpOpName);
    await waitOperation(agentClient, agentOp);
    console.log(`✓ Inception operation marked as complete`);

    // Step 3: Extract agent AID from operation
    const agentPre = agentIcpOpName.split('.')[1];
    console.log(`Agent AID: ${agentPre}`);

    // Step 4: CRITICAL - Verify the KEL actually exists with retries
    console.log(`Verifying agent KEL exists in KERIA...`);
    let kelExists = false;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const aid = await agentClient.identifiers().get(agentName);
            if (aid && aid.prefix === agentPre) {
                console.log(`✓ Agent KEL verified (attempt ${i + 1}/${maxRetries})`);
                kelExists = true;
                break;
            }
        } catch (error) {
            console.log(`  Attempt ${i + 1}/${maxRetries}: KEL not found yet, waiting ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    if (!kelExists) {
        throw new Error(`CRITICAL: Agent KEL was not created in KERIA after ${maxRetries} attempts. Delegation failed.`);
    }

    // Step 5: Add endpoint role
    console.log(`Adding endpoint role...`);
    const endRoleOp = await agentClient.identifiers()
        .addEndRole(agentName, 'agent', agentClient!.agent!.pre);
    await waitOperation(agentClient, await endRoleOp.op());
    console.log(`✓ Endpoint role added`);

    // Step 6: Get OOBI
    console.log(`Getting OOBI...`);
    const oobiResp = await agentClient.oobis().get(agentName, 'agent');
    const oobi = oobiResp.oobis[0];
    console.log(`✓ OOBI retrieved: ${oobi}`);

    // Step 7: Final verification
    const finalAid = await agentClient.identifiers().get(agentName);
    console.log(`✓ Final verification: Agent ${agentName} fully created`);
    console.log(`  Prefix: ${finalAid.prefix}`);
    console.log(`  OOBI: ${oobi}`);

    return {
        aid: finalAid.prefix,
        oobi
    }
}

const agentClient = await getOrCreateClient(passcode, env);

// Read OOR Holder info
if (!fs.existsSync(oorHolderInfoPath)) {
    throw new Error(`OOR Holder info file not found: ${oorHolderInfoPath}`);
}
const oorHolderInfo = JSON.parse(fs.readFileSync(oorHolderInfoPath, 'utf-8'));

// Read agent inception info
if (!fs.existsSync(agentInceptionInfoPath)) {
    throw new Error(`Agent inception info file not found: ${agentInceptionInfoPath}`);
}
const agentIcpInfo = JSON.parse(fs.readFileSync(agentInceptionInfoPath, 'utf-8'));
console.log(`${agentAidName} agent inception info`, agentIcpInfo);

// Finish delegation with verification
try {
    const agentDelegationInfo: any = await finishAgentDelegation(
        agentClient, 
        oorHolderInfo.aid, 
        agentAidName, 
        agentIcpInfo.icpOpName
    );

    // Write to file
    fs.writeFileSync(agentOutputPath, JSON.stringify(agentDelegationInfo, null, 2));

    // Verify file was written
    if (!fs.existsSync(agentOutputPath)) {
        throw new Error(`Failed to write ${agentOutputPath}`);
    }

    console.log(`\n✓✓✓ Agent delegation SUCCESSFULLY completed and verified ✓✓✓`);
    console.log(`Agent delegation data written to ${agentOutputPath}`);
} catch (error) {
    console.error(`\n❌ CRITICAL ERROR: Agent delegation failed`);
    console.error(`Error: ${error}`);
    process.exit(1);
}