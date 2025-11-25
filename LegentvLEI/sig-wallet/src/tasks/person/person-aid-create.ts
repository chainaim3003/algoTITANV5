import fs from 'fs';
import {getOrCreateClient} from "../../client/identifiers.js";

const args = process.argv.slice(2);
const env = args[0] as 'docker' | 'testnet';
const passcode = args[1];
const dataDir = args[2];
const personAidName = args[3] || 'person';

async function createPersonAid(client: any, personAidName: string, env: string) {
    console.log(`Creating Person AID using SignifyTS and KERIA`);
    console.log(`Using alias: ${personAidName}`);
    
    // Configure witnesses based on environment
    let wits: string[] = [];
    let toad = 0;
    
    if (env === 'docker') {
        // Docker environment: 6 witnesses, toad=1 (fast development)
        // These prefixes MUST match the witness prefixes in config/keria/keria.json
        wits = [
            'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',  // wan:5642
            'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',  // wil:5643
            'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX',  // wes:5644
            'BM35JN8XeJSEfpxopjn5jr7tAHCE5749f0OobhMLCorE',  // wit:5645
            'BIj15u5V11bkbtAxMA7gcNJZcax-7TgaBMLsQnMHpYHP',  // wub:5646 ← CORRECTED!
            'BF2rZTW79z4IXocYRQnjjsOuvFUQv-ptCf8Yltd7PfsM'   // wyz:5647 ← CORRECTED!
        ];
        toad = 1;  // Need 1 witness signature (10-30s)
        console.log(`Witness config: ${wits.length} witnesses, toad=${toad} (fast dev mode)`);
    } else if (env === 'testnet') {
        // Testnet environment: 3 witnesses
        wits = [
            'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN6vkf2Ha',
            'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',
            'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX'
        ];
        toad = 2;
        console.log(`Witness config: ${wits.length} witnesses, toad=${toad} (testnet)`);
    }
    
    const result = await client.identifiers().create(personAidName, {
        wits: wits,
        toad: toad
    });
    
    const op = await result.op();
    
    // Wait for operation to complete
    await client.operations().wait(op, { signal: AbortSignal.timeout(30000) });
    
    const aid = await client.identifiers().get(personAidName);
    
    // Add endpoint role
    const endRoleOp = await client.identifiers()
        .addEndRole(personAidName, 'agent', client!.agent!.pre);
    await client.operations().wait(await endRoleOp.op(), { signal: AbortSignal.timeout(30000) });
    
    // Get OOBI
    const oobiResp = await client.oobis().get(personAidName, 'agent');
    const oobi = oobiResp.oobis[0];
    
    console.log(`Person info written to ${dataDir}/${personAidName}-*`);
    console.log(`   Prefix: ${aid.prefix}`);
    console.log(`   OOBI: ${oobi}`);
    
    return {
        aid: aid.prefix,
        oobi,
        state: aid.state
    };
}

// Main execution
(async () => {
    try {
        const client = await getOrCreateClient(passcode, env);
        const personInfo = await createPersonAid(client, personAidName, env);
        
        // Write to alias-based files
        fs.writeFileSync(`${dataDir}/${personAidName}-aid.txt`, personInfo.aid);
        fs.writeFileSync(`${dataDir}/${personAidName}-info.json`, JSON.stringify(personInfo, null, 2));
        
        // Also write legacy format for backwards compatibility
        fs.writeFileSync(`${dataDir}/person-aid.txt`, personInfo.aid);
        fs.writeFileSync(`${dataDir}/person-info.json`, JSON.stringify(personInfo, null, 2));
        
        // Verify files were written
        if (!fs.existsSync(`${dataDir}/${personAidName}-info.json`)) {
            throw new Error(`Failed to write ${dataDir}/${personAidName}-info.json`);
        }
        
        console.log(`   Prefix: ${personInfo.aid}`);
        console.log(`   OOBI: ${personInfo.oobi}`);
        
        process.exit(0);
    } catch (error: any) {
        console.error(`Error creating Person AID: ${error.message}`);
        process.exit(1);
    }
})();
