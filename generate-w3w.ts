import { config } from "dotenv";
import { SmartContract, ThirdwebSDK, getBlockNumber } from "@thirdweb-dev/sdk";
import fs from "fs";

config();

const PET_CONTRACT_ADDRESS = "0x40da2B4a5feB3ABD0FF7fD12C158C0ddbF6391e0";
const ARMOR_CONTRACT_ADDRESS = "0x9E7ADF51b3517355A0b5F6541D1FB089F3aDbA40";
const WEAPON_CONTRACT_ADDRESS = "0x5727d991BC6D46Ab8163d468Bd49Ab4A427B5798";
const RPC = process.env.RPC_URL;

const BLOCK_BATCH_SIZE = 100000;
const BLOCK_BATCH_DELAY_MS = 10000;

const main = async () => {
	try {
		const sdk = new ThirdwebSDK(RPC as string, {
			secretKey: process.env.THIRDWEB_API_SECRET,
		});

		const petContract = await sdk.getContract(PET_CONTRACT_ADDRESS);
		const armorContract = await sdk.getContract(ARMOR_CONTRACT_ADDRESS);
		const weaponContract = await sdk.getContract(WEAPON_CONTRACT_ADDRESS);

		console.log("Fetching all pet owners...");
		const petOwners = await getFinalOwnersFromTransferEvents(petContract);
		console.log("Fetching all armor owners...");
		const armorOwners = await getFinalOwnersFromTransferEvents(armorContract);
		console.log("Fetching all weapon owners...");
		const weaponOwners = await getFinalOwnersFromTransferEvents(weaponContract);

		// Combine all unique owners
		const allOwners = [...new Set([...petOwners, ...armorOwners, ...weaponOwners])];
		console.log(`Total unique owners: ${allOwners.length}`);

		let armorsOwned: Map<string, string[]> = new Map<string, string[]>();
		let weaponsOwned: Map<string, string[]> = new Map<string, string[]>();
		let uniquePetsOwned: Map<string, number> = new Map<string, number>();

		const armorCount = (await armorContract.erc1155.totalCount()).toNumber();
		const weaponCount = (await weaponContract.erc1155.totalCount()).toNumber();
		const petCount = (await petContract.erc1155.totalCount()).toNumber();

		for (let i = 0; i < armorCount; i++) {
			const balances = await armorContract.call("balanceOfBatch", [allOwners, new Array(allOwners.length).fill(i.toString())]);
			for (let j = 0; j < balances.length; j++) {
				if (balances[j].toNumber() > 0) {
					if (armorsOwned.has(allOwners[j])) {
						armorsOwned.get(allOwners[j])?.push(i.toString());
					} else {
						armorsOwned.set(allOwners[j], [i.toString()]);
					}
				}
			}
		}

		console.log("Done checking armors");

		for (let i = 0; i < weaponCount; i++) {
			const balances = await weaponContract.call("balanceOfBatch", [allOwners, new Array(allOwners.length).fill(i.toString())]);
			for (let j = 0; j < balances.length; j++) {
				if (balances[j].toNumber() > 0) {
					if (weaponsOwned.has(allOwners[j])) {
						weaponsOwned.get(allOwners[j])?.push(i.toString());
					} else {
						weaponsOwned.set(allOwners[j], [i.toString()]);
					}
				}
			}
		}

		console.log("Done checking weapons");

		for (let i = 0; i < petCount; i++) {
			const balances = await petContract.call("balanceOfBatch", [allOwners, new Array(allOwners.length).fill(i.toString())]);
			for (let j = 0; j < balances.length; j++) {
				if (balances[j].toNumber() > 0) {
					if (uniquePetsOwned.has(allOwners[j])) {
						uniquePetsOwned.set(allOwners[j], (uniquePetsOwned.get(allOwners[j]) ?? 0) + 1);
					} else {
						uniquePetsOwned.set(allOwners[j], 1);
					}
				}
			}
		}

		console.log("Done checking pets");

		// W3W Goal 1: Obtain Voidcleaver Axe [Blue]
		const goal1Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("0"));
		fs.writeFileSync("w3w_goal_1.csv", formatCsv(goal1Owners));

		// W3W Goal 2: Obtain Arcane Staff [Blue]
		const goal2Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("6"));
		fs.writeFileSync("w3w_goal_2.csv", formatCsv(goal2Owners));

		// W3W Goal 3: Obtain Arcane Robes [Blue] - Male
		const goal3Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("0"));
		fs.writeFileSync("w3w_goal_3.csv", formatCsv(goal3Owners));

		// W3W Goal 4: Obtain Voidcleaver Armor [Blue] - Male
		const goal4Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("6"));
		fs.writeFileSync("w3w_goal_4.csv", formatCsv(goal4Owners));

		// W3W Goal 5: Obtain At least 1 Pet
		const goal5Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 1);
		fs.writeFileSync("w3w_goal_5.csv", formatCsv(goal5Owners));

		// W3W Goal 6: Obtain Voidcleaver Axe [Green]
		const goal6Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("1"));
		fs.writeFileSync("w3w_goal_6.csv", formatCsv(goal6Owners));

		// W3W Goal 7: Obtain Arcane Staff [Green]
		const goal7Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("7"));
		fs.writeFileSync("w3w_goal_7.csv", formatCsv(goal7Owners));

		// W3W Goal 8: Obtain Arcane Robes [Blue] - Female
		const goal8Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("1"));
		fs.writeFileSync("w3w_goal_8.csv", formatCsv(goal8Owners));

		// W3W Goal 9: Obtain Voidcleaver Armor [Blue] - Female
		const goal9Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("7"));
		fs.writeFileSync("w3w_goal_9.csv", formatCsv(goal9Owners));

		// W3W Goal 10: Obtain At least 3 Pets
		const goal10Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 3);
		fs.writeFileSync("w3w_goal_10.csv", formatCsv(goal10Owners));

		// W3W Goal 11: Obtain Voidcleaver Axe [Red]
		const goal11Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("2"));
		fs.writeFileSync("w3w_goal_11.csv", formatCsv(goal11Owners));

		// W3W Goal 12: Obtain Arcane Staff [Red]
		const goal12Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("8"));
		fs.writeFileSync("w3w_goal_12.csv", formatCsv(goal12Owners));

		// W3W Goal 13: Obtain Arcane Robes [Green] - Male
		const goal13Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("2"));
		fs.writeFileSync("w3w_goal_13.csv", formatCsv(goal13Owners));

		// W3W Goal 14: Obtain Voidcleaver Armor [Green] - Male
		const goal14Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("8"));
		fs.writeFileSync("w3w_goal_14.csv", formatCsv(goal14Owners));

		// W3W Goal 15: Obtain At least 5 Pets
		const goal15Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 5);
		fs.writeFileSync("w3w_goal_15.csv", formatCsv(goal15Owners));

		// W3W Goal 16: Obtain Bloodreaper Axe [Blue]
		const goal16Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("3"));
		fs.writeFileSync("w3w_goal_16.csv", formatCsv(goal16Owners));

		// W3W Goal 17: Obtain Elemental Staff [Blue]
		const goal17Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("9"));
		fs.writeFileSync("w3w_goal_17.csv", formatCsv(goal17Owners));

		// W3W Goal 18: Obtain Arcane Robes [Green] - Female
		const goal18Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("3"));
		fs.writeFileSync("w3w_goal_18.csv", formatCsv(goal18Owners));

		// W3W Goal 19: Obtain Voidcleaver Armor [Green] - Female
		const goal19Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("9"));
		fs.writeFileSync("w3w_goal_19.csv", formatCsv(goal19Owners));

		// W3W Goal 20: Obtain At least 7 Pets
		const goal20Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 7);
		fs.writeFileSync("w3w_goal_20.csv", formatCsv(goal20Owners));

		// W3W Goal 21: Obtain Bloodreaper Axe [Purple]
		const goal21Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("4"));
		fs.writeFileSync("w3w_goal_21.csv", formatCsv(goal21Owners));

		// W3W Goal 22: Obtain Elemental Staff [Yellow]
		const goal22Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("10"));
		fs.writeFileSync("w3w_goal_22.csv", formatCsv(goal22Owners));

		// W3W Goal 23: Obtain Arcane Robes [Red] - Male
		const goal23Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("4"));
		fs.writeFileSync("w3w_goal_23.csv", formatCsv(goal23Owners));

		// W3W Goal 24: Obtain Voidcleaver Armor [Red] - Male
		const goal24Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("10"));
		fs.writeFileSync("w3w_goal_24.csv", formatCsv(goal24Owners));

		// W3W Goal 25: Obtain At least 9 Pets
		const goal25Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 9);
		fs.writeFileSync("w3w_goal_25.csv", formatCsv(goal25Owners));

		// W3W Goal 26: Obtain Bloodreaper Axe [Red]
		const goal26Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("5"));
		fs.writeFileSync("w3w_goal_26.csv", formatCsv(goal26Owners));

		// W3W Goal 27: Obtain Elemental Staff [Red]
		const goal27Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("11"));
		fs.writeFileSync("w3w_goal_27.csv", formatCsv(goal27Owners));

		// W3W Goal 28: Obtain Arcane Robes [Red] - Female
		const goal28Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("5"));
		fs.writeFileSync("w3w_goal_28.csv", formatCsv(goal28Owners));

		// W3W Goal 29: Obtain Voidcleaver Armor [Red] - Female
		const goal29Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("11"));
		fs.writeFileSync("w3w_goal_29.csv", formatCsv(goal29Owners));

		// W3W Goal 30: Obtain At least 10 Pets
		const goal30Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 10);
		fs.writeFileSync("w3w_goal_30.csv", formatCsv(goal30Owners));

		// W3W Goal 31: Obtain Elemental Robes [Blue] - Male
		const goal31Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("12"));
		fs.writeFileSync("w3w_goal_31.csv", formatCsv(goal31Owners));

		// W3W Goal 32: Obtain Bloodreaper Armor [Blue] - Male
		const goal32Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("24"));
		fs.writeFileSync("w3w_goal_32.csv", formatCsv(goal32Owners));

		// W3W Goal 33: Obtain At least 11 Pets
		const goal33Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 11);
		fs.writeFileSync("w3w_goal_33.csv", formatCsv(goal33Owners));

		// W3W Goal 34: Obtain Elemental Robes [Blue] - Female
		const goal34Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("13"));
		fs.writeFileSync("w3w_goal_34.csv", formatCsv(goal34Owners));

		// W3W Goal 35: Obtain Bloodreaper Armor [Blue] - Female
		const goal35Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("25"));
		fs.writeFileSync("w3w_goal_35.csv", formatCsv(goal35Owners));

		// W3W Goal 36: Obtain At least 12 Pets
		const goal36Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 12);
		fs.writeFileSync("w3w_goal_36.csv", formatCsv(goal36Owners));

		// W3W Goal 37: Obtain Deathstalker Axe [Blue]
		const goal37Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("12"));
		fs.writeFileSync("w3w_goal_37.csv", formatCsv(goal37Owners));

		// W3W Goal 38: Obtain Elemental Robes [Yellow] - Male
		const goal38Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("14"));
		fs.writeFileSync("w3w_goal_38.csv", formatCsv(goal38Owners));

		// W3W Goal 39: Obtain Necromancer Robes [Blue] - Male
		const goal39Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("18"));
		fs.writeFileSync("w3w_goal_39.csv", formatCsv(goal39Owners));

		// W3W Goal 40: Obtain Bloodreaper Armor [Purple] - Male
		const goal40Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("26"));
		fs.writeFileSync("w3w_goal_40.csv", formatCsv(goal40Owners));

		// W3W Goal 41: Obtain Deathstalker Armor [Blue] - Male
		const goal41Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("30"));
		fs.writeFileSync("w3w_goal_41.csv", formatCsv(goal41Owners));

		// W3W Goal 42: Obtain At least 13 Pets
		const goal42Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 13);
		fs.writeFileSync("w3w_goal_42.csv", formatCsv(goal42Owners));

		// W3W Goal 43: Obtain Deathstalker Axe [Yellow]
		const goal43Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("13"));
		fs.writeFileSync("w3w_goal_43.csv", formatCsv(goal43Owners));

		// W3W Goal 44: Obtain Elemental Robes [Yellow] - Female
		const goal44Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("15"));
		fs.writeFileSync("w3w_goal_44.csv", formatCsv(goal44Owners));

		// W3W Goal 45: Obtain Necromancer Robes [Blue] - Female
		const goal45Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("19"));
		fs.writeFileSync("w3w_goal_45.csv", formatCsv(goal45Owners));

		// W3W Goal 46: Obtain Bloodreaper Armor [Purple] - Female
		const goal46Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("27"));
		fs.writeFileSync("w3w_goal_46.csv", formatCsv(goal46Owners));

		// W3W Goal 47: Obtain Deathstalker Armor [Blue] - Female
		const goal47Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("31"));
		fs.writeFileSync("w3w_goal_47.csv", formatCsv(goal47Owners));

		// W3W Goal 48: Obtain At least 14 Pets
		const goal48Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 14);
		fs.writeFileSync("w3w_goal_48.csv", formatCsv(goal48Owners));

		// W3W Goal 49: Obtain Deathstalker Axe [Red]
		const goal49Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("14"));
		fs.writeFileSync("w3w_goal_49.csv", formatCsv(goal49Owners));

		// W3W Goal 50: Obtain Elemental Robes [Red] - Male
		const goal50Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("16"));
		fs.writeFileSync("w3w_goal_50.csv", formatCsv(goal50Owners));

		// W3W Goal 51: Obtain Necromancer Robes [Gray] - Male
		const goal51Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("20"));
		fs.writeFileSync("w3w_goal_51.csv", formatCsv(goal51Owners));

		// W3W Goal 52: Obtain Bloodreaper Armor [Red] - Male
		const goal52Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("28"));
		fs.writeFileSync("w3w_goal_52.csv", formatCsv(goal52Owners));

		// W3W Goal 53: Obtain Deathstalker Armor [Yellow] - Male
		const goal53Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("32"));
		fs.writeFileSync("w3w_goal_53.csv", formatCsv(goal53Owners));

		// W3W Goal 54: Obtain At least 15 Pets
		const goal54Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 15);
		fs.writeFileSync("w3w_goal_54.csv", formatCsv(goal54Owners));

		// W3W Goal 55: Obtain Necromancer Staff [Blue]
		const goal55Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("15"));
		fs.writeFileSync("w3w_goal_55.csv", formatCsv(goal55Owners));

		// W3W Goal 56: Obtain Elemental Robes [Red] - Female
		const goal56Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("17"));
		fs.writeFileSync("w3w_goal_56.csv", formatCsv(goal56Owners));

		// W3W Goal 57: Obtain Necromancer Robes [Gray] - Female
		const goal57Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("21"));
		fs.writeFileSync("w3w_goal_57.csv", formatCsv(goal57Owners));

		// W3W Goal 58: Obtain Bloodreaper Armor [Red] - Female
		const goal58Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("29"));
		fs.writeFileSync("w3w_goal_58.csv", formatCsv(goal58Owners));

		// W3W Goal 59: Obtain Deathstalker Armor [Yellow] - Female
		const goal59Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("33"));
		fs.writeFileSync("w3w_goal_59.csv", formatCsv(goal59Owners));

		// W3W Goal 60: Obtain At least 16 Pets
		const goal60Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 16);
		fs.writeFileSync("w3w_goal_60.csv", formatCsv(goal60Owners));

		// W3W Goal 61: Obtain Necromancer Staff [Gray]
		const goal61Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("16"));
		fs.writeFileSync("w3w_goal_61.csv", formatCsv(goal61Owners));

		// W3W Goal 62: Obtain Necromancer Robes [Purple] - Male
		const goal62Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("22"));
		fs.writeFileSync("w3w_goal_62.csv", formatCsv(goal62Owners));

		// W3W Goal 63: Obtain Deathstalker Armor [Red] - Male
		const goal63Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("34"));
		fs.writeFileSync("w3w_goal_63.csv", formatCsv(goal63Owners));

		// W3W Goal 64: Obtain At least 17 Pets
		const goal64Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 17);
		fs.writeFileSync("w3w_goal_64.csv", formatCsv(goal64Owners));

		// W3W Goal 65: Obtain Necromancer Staff [Purple]
		const goal65Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("17"));
		fs.writeFileSync("w3w_goal_65.csv", formatCsv(goal65Owners));

		// W3W Goal 66: Obtain Necromancer Robes [Purple] - Female
		const goal66Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("23"));
		fs.writeFileSync("w3w_goal_66.csv", formatCsv(goal66Owners));

		// W3W Goal 67: Obtain Deathstalker Armor [Red] - Female
		const goal67Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("35"));
		fs.writeFileSync("w3w_goal_67.csv", formatCsv(goal67Owners));

		// W3W Goal 68: Obtain At least 18 Pets
		const goal68Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 18);
		fs.writeFileSync("w3w_goal_68.csv", formatCsv(goal68Owners));
	} catch (e) {
		console.error("Something went wrong: ", e);
	}
};

main();

const getFinalOwnersFromTransferEvents = async (contract: SmartContract) => {
	const latestBlock = await getBlockNumber({
		network: RPC as string,
	});
	let fromBlock = 0;
	let toBlock = BLOCK_BATCH_SIZE;

	let transferEvents: any[] = [];
	try {
		do {
			toBlock = toBlock > latestBlock ? latestBlock : toBlock;
			const data = await contract.events.getEvents("TransferSingle", {
				fromBlock: fromBlock,
				toBlock: toBlock,
			});
			transferEvents.push(...data);
			console.log(`Processed blocks ${fromBlock} to ${toBlock}`);
			fromBlock = toBlock + 1;
			toBlock += BLOCK_BATCH_SIZE;
			await new Promise((resolve) => setTimeout(resolve, BLOCK_BATCH_DELAY_MS));
		} while (fromBlock < latestBlock);
	} catch {
		throw new Error("Something went wrong fetching transfer events");
	}

	console.log(`Total transfer events: ${transferEvents.length}`);

	let owners: string[] = [];
	transferEvents.forEach((transferEvent) => {
		owners.push(transferEvent.data["to"]);
	});

	const count = (await contract.erc1155.totalCount()).toNumber();

	console.log("Filtering owners that own at least one token...");

	let ownAtLeastOneToken: string[] = [];
	for (let i = 0; i < count; i++) {
		const balances = await contract.call("balanceOfBatch", [owners, new Array(owners.length).fill(i)]);
		for (let j = 0; j < balances.length; j++) {
			if (balances[j].toNumber() > 0 && !ownAtLeastOneToken.includes(owners[j])) {
				ownAtLeastOneToken.push(owners[j]);
			}
		}
	}

	console.log(`Total owners: ${ownAtLeastOneToken.length}`);

	return ownAtLeastOneToken;
};

function formatCsv(items: string[]): string {
	return `${Array.from(new Set(items)).join("\n")}`;
}
