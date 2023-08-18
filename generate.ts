import { ThirdwebSDK, StaticJsonRpcBatchProvider, ContractEvent } from "@thirdweb-dev/sdk";
import {TW_EDITION_DROP_ABI, TW_CLONE_FACTORY_ABI, TW_CLONE_FACTORY_ADDRESS, XAI_TOKEN_DROP_CONTRACT_ADDRESS} from "./constants"
import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// ========= EDIT ========= //

const START_BLOCK = 0; 
const END_BLOCK = 360;

// ========= EDIT ========= //

const BATCH_SIZE = 250;
const TX_BATCH_SIZE = 1000;



const contract = new ethers.BaseContract(
  TW_CLONE_FACTORY_ADDRESS,
  TW_CLONE_FACTORY_ABI
);
const proxyDeployedTopic = contract.interface.getEventTopic("ProxyDeployed");

// Get all ProxyDeployed logs on the clone factory contract in the given time interval
async function getAllLogs(provider: StaticJsonRpcBatchProvider) {
  const logs: ethers.providers.Log[] = [];

  for (
    let fromBlock = START_BLOCK;
    fromBlock < END_BLOCK;
    fromBlock += BATCH_SIZE
  ) {
    console.log(
      `Fetching logs for blocks ${fromBlock} to ${fromBlock + BATCH_SIZE}`
    );
    const data = await provider.getLogs({
      address: TW_CLONE_FACTORY_ADDRESS,
      topics: [proxyDeployedTopic],
      fromBlock,
      toBlock: Math.min(fromBlock + BATCH_SIZE, END_BLOCK),
    });
    console.log(`Received ${data.length} logs`);

    logs.push(...data);
  }

  return logs;
}

async function getAllClaimersTestToken(sdk: ThirdwebSDK): Promise<string[]> {

  console.log("collecting all claimers of the test token");
  let claimers: string[] = [];

  // get all the tokens claimed events
  const tokenDropContract = await sdk.getContract(XAI_TOKEN_DROP_CONTRACT_ADDRESS as string);
  const claimedEvents: ContractEvent[] = await tokenDropContract.events.getEvents("TokensClaimed", {fromBlock: START_BLOCK, toBlock: END_BLOCK});

  // for each event in claimedEvents add the claimer field in the event data to the claimers array
  claimers = claimedEvents.map(claimer => claimer.data.claimer );
  console.log("found " + claimers.length + " claimers of the test token");

  return claimers;
}

function formatCsv(items: string[]): string {
  return `wallet_addresses\n${Array.from(new Set(items)).join("\n")}`;
}

async function main() {

  const rpc = process.env.RPC_URL as string;
  const provider = new StaticJsonRpcBatchProvider(
    rpc,
    59140
  );
  const sdk = new ThirdwebSDK(provider, {secretKey: process.env.THIRDWEB_API_SECRET as string});

  // Step 1: Get all addresses that claimed tokens from TokenDrop
  const step1 = await getAllClaimersTestToken(sdk);

  // Step 2: Get all addresses that deployed an Edition Drop 
  // Filter on parsed logs with the TokenDrop implementation address
  if (!fs.existsSync(`logs-from-${START_BLOCK}-to-${END_BLOCK}.json`)) {
    const logs = await getAllLogs(provider);
    const parsedLogs = logs
      .map((log) => {
        return contract.interface.parseLog(log);
      })
      .filter((log) => {
        return (
          log.args.implementation.toLowerCase() ===
          "0x32b6bd0e80e761848b564b858aaddf89b7561f1d".toLowerCase()
        );
      });

    fs.writeFileSync(
      `logs-from-${START_BLOCK}-to-${END_BLOCK}.json`,
      JSON.stringify(parsedLogs, undefined, 2),
      "utf-8"
    );
  }

  let parsedLogs: ethers.utils.LogDescription[] = JSON.parse(
    fs.readFileSync(`logs-from-${START_BLOCK}-to-${END_BLOCK}.json`, "utf-8")
  );



  const contracts = parsedLogs.map((log) => ({
    contractAddress: log.args[1].toLowerCase(),
    deployerAddress: log.args[2].toLowerCase(),
  }));

  const step2: string[] = [];
  const step3: string[] = [];

  fs.writeFileSync("contracts.json", JSON.stringify(contracts,undefined,2), "utf-8");

  const START_BATCH_INDEX = 0;
  let counter = 0;

  // Process the deployed transactions in batches
  for (let i = 0; i < contracts.length; i += TX_BATCH_SIZE) {
    console.log(
      `Processing batch ${i / TX_BATCH_SIZE + 1}/${Math.ceil(
        contracts.length / TX_BATCH_SIZE
      )}...`
    );
    
    counter++;

    if(counter < START_BATCH_INDEX) {
      continue;
    }

    await Promise.all(
      contracts
        .slice(i, i + TX_BATCH_SIZE)
        .map(async ({ contractAddress, deployerAddress }) => {
          try {
            //const c = await sdk.getContract(contractAddress, "token-drop");
            const c = await sdk.getContractFromAbi(contractAddress, TW_EDITION_DROP_ABI);
            
            try {
              // Step 2: see if token 0 has been lazy minted
              const uri = await c.erc1155.get(0);
              if(uri) {
               step2.push(deployerAddress);
              }
            } catch (err) {
              return;
            }

            // Step 3: Claimed a token means balance of deployer is >= 1
            const balance = await c.erc1155.balanceOf(deployerAddress, 0);
            if (balance.toNumber() >= 1) {
              step3.push(deployerAddress);
            } else {
              return;
            }

          } catch (err) {
            console.log(
              `Errored on processing contract address '${contractAddress}' with deployer address '${deployerAddress}'`
            );
            console.log(err);
          }
        })
    );

    console.log(`Completed step 1: ${Array.from(new Set(step1)).length}`);
    fs.writeFileSync("completed_step_1.csv", formatCsv(step1), "utf-8");
  
    console.log(`Completed step 2: ${Array.from(new Set(step2)).length}`);
    fs.writeFileSync("completed_step_2.csv", formatCsv(step2), "utf-8");
  
    console.log(`Completed step 3: ${Array.from(new Set(step3)).length}`);
    fs.writeFileSync("completed_step_3.csv", formatCsv(step3), "utf-8");
  }


}

main();