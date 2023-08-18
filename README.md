## Setup
1. Install using `yarn install`
2. [Create a thirdweb api key](https://portal.thirdweb.com/api-keys#creating-an-api-key)
3. Create a .env file and create variables THIRDWEB_API_SECRET=your thirdweb secret API key and RPC_URL=RPC to be used when running

## Configuration Prior to Running
The `generate.ts` file is the main script that will be run.  Because the script reads transaction logs from the blockchain which can be an expensive operation, users should chunk each run between a `START_BLOCK` and `END_BLOCK` which represent the range of mined blocks on the chain that will be queried.

In addition there are two variables `BATCH_SIZE` (i.e the batch request size when querying for logs) and `TX_BATCH_SIZE` (i.e. the number of simultaneous blockchain batch reads) that can be reduced if the RPC being used is throwing errors.  NOTE: the smaller the batch sizes the longer the script will take to run.

All the variables `START_BLOCK`, `END_BLOCK`, `BATCH_SIZE`, `TX_BATCH_SIZE` are set at the top of the `generate.ts` file.

## Running the Script
`yarn generate`

## Output
For each run the script will output three csv files: `completed_step_1.csv`, `completed_step_2.csv`, `completed_step_3.csv` which will contain all the wallet addresses that completed each step in the quest for that period on the chain (i.e. between `START_BLOCK` and `END_BLOCK`)