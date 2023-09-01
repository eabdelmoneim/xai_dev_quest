import { config } from "dotenv";
import { SmartContract, ThirdwebSDK, getBlock, getBlockNumber } from "@thirdweb-dev/sdk";
import fs from "fs";
import { log } from "console";

config();

type OwnedIdData = {
	id: string;
	timestamp: number;
};

const PET_CONTRACT_ADDRESS = "0x40da2B4a5feB3ABD0FF7fD12C158C0ddbF6391e0";
const ARMOR_CONTRACT_ADDRESS = "0x9E7ADF51b3517355A0b5F6541D1FB089F3aDbA40";
const WEAPON_CONTRACT_ADDRESS = "0x5727d991BC6D46Ab8163d468Bd49Ab4A427B5798";
const RPC = process.env.RPC_URL;

const BLOCK_BATCH_SIZE = 5000;
const BLOCK_BATCH_DELAY_MS = 10000;

const main = async () => {
	try {
		const sdk = new ThirdwebSDK(RPC as string, {
			secretKey: process.env.THIRDWEB_API_SECRET,
		});

		const petContract = await sdk.getContract(PET_CONTRACT_ADDRESS);
		const armorContract = await sdk.getContract(ARMOR_CONTRACT_ADDRESS);
		const weaponContract = await sdk.getContract(WEAPON_CONTRACT_ADDRESS);

		console.log("Fetching pet owners data...");
		const petOwnersData = await getOwnerDataFromTransferEvents(petContract);
		console.log("Fetching armor owners data...");
		const armorOwnersData = await getOwnerDataFromTransferEvents(armorContract);
		console.log("Fetching weapon owners data...");
		const weaponOwnersData = await getOwnerDataFromTransferEvents(weaponContract);

		await new Promise((resolve) => setTimeout(resolve, 10000));

		// Combine all unique owners
		const allOwners = [...new Set([...petOwnersData.keys(), ...armorOwnersData.keys(), ...weaponOwnersData.keys()])];
		console.log(`Total unique owners: ${allOwners.length}`);

		let armorsOwned: Map<string, string[]> = new Map<string, string[]>();
		let weaponsOwned: Map<string, string[]> = new Map<string, string[]>();
		let uniquePetsOwned: Map<string, number> = new Map<string, number>();

		let counter = 0;
		for (const owner of allOwners) {
			const ownedArmors = await armorContract.erc1155.getOwned(owner);
			const ownedWeapons = await weaponContract.erc1155.getOwned(owner);
			const ownedPets = await petContract.erc1155.getOwned(owner);

			if (ownedArmors.length > 0) {
				const armorIdsOwned = ownedArmors.map((armor) => armor.metadata.id);
				armorsOwned.set(owner, armorIdsOwned);
			}

			if (ownedWeapons.length > 0) {
				const weaponIdsOwned = ownedWeapons.map((weapon) => weapon.metadata.id);
				weaponsOwned.set(owner, weaponIdsOwned);
			}

			if (ownedPets.length > 0) {
				const petIdsOwned = ownedPets.map((pet) => pet.metadata.id);
				const uniquePetIdsOwned = [...new Set(petIdsOwned)];
				uniquePetsOwned.set(owner, uniquePetIdsOwned.length);
			}

			counter++;
			if (counter % 25 === 0) {
				console.log(`Processed ${counter} owners, waiting 10 seconds...`);
				await new Promise((resolve) => setTimeout(resolve, 10000));
			}
		}

		// W3W Goal 1: Obtain Voidcleaver Axe [Blue]
		const goal1Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("0"));
		const goal1OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal1Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_1.csv", formatCsv(goal1OwnersData));

		// W3W Goal 2: Obtain Arcane Staff [Blue]
		const goal2Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("6"));
		const goal2OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal2Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_2.csv", formatCsv(goal2OwnersData));

		// W3W Goal 3: Obtain Arcane Robes [Blue] - Male
		const goal3Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("0"));
		const goal3OwnersData = [...armorOwnersData.entries()].filter((entry) => goal3Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_3.csv", formatCsv(goal3OwnersData));

		// W3W Goal 4: Obtain Voidcleaver Armor [Blue] - Male
		const goal4Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("6"));
		const goal4OwnersData = [...armorOwnersData.entries()].filter((entry) => goal4Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_4.csv", formatCsv(goal4OwnersData));

		// W3W Goal 5: Obtain At least 1 Pet
		const goal5Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 1);
		const goal5OwnersData = [...petOwnersData.entries()].filter((entry) => goal5Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_5.csv", formatCsv(goal5OwnersData));

		// W3W Goal 6: Obtain Voidcleaver Axe [Green]
		const goal6Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("1"));
		const goal6OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal6Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_6.csv", formatCsv(goal6OwnersData));

		// W3W Goal 7: Obtain Arcane Staff [Green]
		const goal7Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("7"));
		const goal7OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal7Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_7.csv", formatCsv(goal7OwnersData));

		// W3W Goal 8: Obtain Arcane Robes [Blue] - Female
		const goal8Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("1"));
		const goal8OwnersData = [...armorOwnersData.entries()].filter((entry) => goal8Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_8.csv", formatCsv(goal8OwnersData));

		// W3W Goal 9: Obtain Voidcleaver Armor [Blue] - Female
		const goal9Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("7"));
		const goal9OwnersData = [...armorOwnersData.entries()].filter((entry) => goal9Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_9.csv", formatCsv(goal9OwnersData));

		// W3W Goal 10: Obtain At least 3 Pets
		const goal10Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 3);
		const goal10OwnersData = [...petOwnersData.entries()].filter((entry) => goal10Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_10.csv", formatCsv(goal10OwnersData));

		// W3W Goal 11: Obtain Voidcleaver Axe [Red]
		const goal11Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("2"));
		const goal11OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal11Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_11.csv", formatCsv(goal11OwnersData));

		// W3W Goal 12: Obtain Arcane Staff [Red]
		const goal12Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("8"));
		const goal12OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal12Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_12.csv", formatCsv(goal12OwnersData));

		// W3W Goal 13: Obtain Arcane Robes [Green] - Male
		const goal13Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("2"));
		const goal13OwnersData = [...armorOwnersData.entries()].filter((entry) => goal13Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_13.csv", formatCsv(goal13OwnersData));

		// W3W Goal 14: Obtain Voidcleaver Armor [Green] - Male
		const goal14Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("8"));
		const goal14OwnersData = [...armorOwnersData.entries()].filter((entry) => goal14Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_14.csv", formatCsv(goal14OwnersData));

		// W3W Goal 15: Obtain At least 5 Pets
		const goal15Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 5);
		const goal15OwnersData = [...petOwnersData.entries()].filter((entry) => goal15Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_15.csv", formatCsv(goal15OwnersData));

		// W3W Goal 16: Obtain Bloodreaper Axe [Blue]
		const goal16Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("3"));
		const goal16OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal16Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_16.csv", formatCsv(goal16OwnersData));

		// W3W Goal 17: Obtain Elemental Staff [Blue]
		const goal17Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("9"));
		const goal17OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal17Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_17.csv", formatCsv(goal17OwnersData));

		// W3W Goal 18: Obtain Arcane Robes [Green] - Female
		const goal18Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("3"));
		const goal18OwnersData = [...armorOwnersData.entries()].filter((entry) => goal18Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_18.csv", formatCsv(goal18OwnersData));

		// W3W Goal 19: Obtain Voidcleaver Armor [Green] - Female
		const goal19Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("9"));
		const goal19OwnersData = [...armorOwnersData.entries()].filter((entry) => goal19Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_19.csv", formatCsv(goal19OwnersData));

		// W3W Goal 20: Obtain At least 7 Pets
		const goal20Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 7);
		const goal20OwnersData = [...petOwnersData.entries()].filter((entry) => goal20Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_20.csv", formatCsv(goal20OwnersData));

		// W3W Goal 21: Obtain Bloodreaper Axe [Purple]
		const goal21Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("4"));
		const goal21OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal21Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_21.csv", formatCsv(goal21OwnersData));

		// W3W Goal 22: Obtain Elemental Staff [Yellow]
		const goal22Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("10"));
		const goal22OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal22Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_22.csv", formatCsv(goal22OwnersData));

		// W3W Goal 23: Obtain Arcane Robes [Red] - Male
		const goal23Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("4"));
		const goal23OwnersData = [...armorOwnersData.entries()].filter((entry) => goal23Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_23.csv", formatCsv(goal23OwnersData));

		// W3W Goal 24: Obtain Voidcleaver Armor [Red] - Male
		const goal24Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("10"));
		const goal24OwnersData = [...armorOwnersData.entries()].filter((entry) => goal24Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_24.csv", formatCsv(goal24OwnersData));

		// W3W Goal 25: Obtain At least 9 Pets
		const goal25Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 9);
		const goal25OwnersData = [...petOwnersData.entries()].filter((entry) => goal25Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_25.csv", formatCsv(goal25OwnersData));

		// W3W Goal 26: Obtain Bloodreaper Axe [Red]
		const goal26Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("5"));
		const goal26OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal26Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_26.csv", formatCsv(goal26OwnersData));

		// W3W Goal 27: Obtain Elemental Staff [Red]
		const goal27Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("11"));
		const goal27OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal27Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_27.csv", formatCsv(goal27OwnersData));

		// W3W Goal 28: Obtain Arcane Robes [Red] - Female
		const goal28Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("5"));
		const goal28OwnersData = [...armorOwnersData.entries()].filter((entry) => goal28Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_28.csv", formatCsv(goal28OwnersData));

		// W3W Goal 29: Obtain Voidcleaver Armor [Red] - Female
		const goal29Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("11"));
		const goal29OwnersData = [...armorOwnersData.entries()].filter((entry) => goal29Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_29.csv", formatCsv(goal29OwnersData));

		// W3W Goal 30: Obtain At least 10 Pets
		const goal30Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 10);
		const goal30OwnersData = [...petOwnersData.entries()].filter((entry) => goal30Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_30.csv", formatCsv(goal30OwnersData));

		// W3W Goal 31: Obtain Elemental Robes [Blue] - Male
		const goal31Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("12"));
		const goal31OwnersData = [...armorOwnersData.entries()].filter((entry) => goal31Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_31.csv", formatCsv(goal31OwnersData));

		// W3W Goal 32: Obtain Bloodreaper Armor [Blue] - Male
		const goal32Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("18"));
		const goal32OwnersData = [...armorOwnersData.entries()].filter((entry) => goal32Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_32.csv", formatCsv(goal32OwnersData));

		// W3W Goal 33: Obtain At least 11 Pets
		const goal33Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 11);
		const goal33OwnersData = [...petOwnersData.entries()].filter((entry) => goal33Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_33.csv", formatCsv(goal33OwnersData));

		// W3W Goal 34: Obtain Elemental Robes [Blue] - Female
		const goal34Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("13"));
		const goal34OwnersData = [...armorOwnersData.entries()].filter((entry) => goal34Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_34.csv", formatCsv(goal34OwnersData));

		// W3W Goal 35: Obtain Bloodreaper Armor [Blue] - Female
		const goal35Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("19"));
		const goal35OwnersData = [...armorOwnersData.entries()].filter((entry) => goal35Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_35.csv", formatCsv(goal35OwnersData));

		// W3W Goal 36: Obtain At least 12 Pets
		const goal36Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 12);
		const goal36OwnersData = [...petOwnersData.entries()].filter((entry) => goal36Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_36.csv", formatCsv(goal36OwnersData));

		// W3W Goal 37: Obtain Deathstalker Axe [Blue]
		const goal37Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("12"));
		const goal37OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal37Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_37.csv", formatCsv(goal37OwnersData));

		// W3W Goal 38: Obtain Elemental Robes [Yellow] - Male
		const goal38Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("14"));
		const goal38OwnersData = [...armorOwnersData.entries()].filter((entry) => goal38Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_38.csv", formatCsv(goal38OwnersData));

		// W3W Goal 39: Obtain Necromancer Robes [Blue] - Male
		const goal39Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("20"));
		const goal39OwnersData = [...armorOwnersData.entries()].filter((entry) => goal39Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_39.csv", formatCsv(goal39OwnersData));

		// W3W Goal 40: Obtain Bloodreaper Armor [Purple] - Male
		const goal40Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("26"));
		const goal40OwnersData = [...armorOwnersData.entries()].filter((entry) => goal40Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_40.csv", formatCsv(goal40OwnersData));

		// W3W Goal 41: Obtain Deathstalker Armor [Blue] - Male
		const goal41Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("32"));
		const goal41OwnersData = [...armorOwnersData.entries()].filter((entry) => goal41Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_41.csv", formatCsv(goal41OwnersData));

		// W3W Goal 42: Obtain At least 13 Pets
		const goal42Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 13);
		const goal42OwnersData = [...petOwnersData.entries()].filter((entry) => goal42Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_42.csv", formatCsv(goal42OwnersData));

		// W3W Goal 43: Obtain Deathstalker Axe [Yellow]
		const goal43Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("13"));
		const goal43OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal43Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_43.csv", formatCsv(goal43OwnersData));

		// W3W Goal 44: Obtain Elemental Robes [Yellow] - Female
		const goal44Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("15"));
		const goal44OwnersData = [...armorOwnersData.entries()].filter((entry) => goal44Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_44.csv", formatCsv(goal44OwnersData));

		// W3W Goal 45: Obtain Necromancer Robes [Blue] - Female
		const goal45Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("21"));
		const goal45OwnersData = [...armorOwnersData.entries()].filter((entry) => goal45Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_45.csv", formatCsv(goal45OwnersData));

		// W3W Goal 46: Obtain Bloodreaper Armor [Purple] - Female
		const goal46Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("27"));
		const goal46OwnersData = [...armorOwnersData.entries()].filter((entry) => goal46Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_46.csv", formatCsv(goal46OwnersData));

		// W3W Goal 47: Obtain Deathstalker Armor [Blue] - Female
		const goal47Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("33"));
		const goal47OwnersData = [...armorOwnersData.entries()].filter((entry) => goal47Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_47.csv", formatCsv(goal47OwnersData));

		// W3W Goal 48: Obtain At least 14 Pets
		const goal48Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 14);
		const goal48OwnersData = [...petOwnersData.entries()].filter((entry) => goal48Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_48.csv", formatCsv(goal48OwnersData));

		// W3W Goal 49: Obtain Deathstalker Axe [Red]
		const goal49Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("14"));
		const goal49OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal49Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_49.csv", formatCsv(goal49OwnersData));

		// W3W Goal 50: Obtain Elemental Robes [Red] - Male
		const goal50Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("16"));
		const goal50OwnersData = [...armorOwnersData.entries()].filter((entry) => goal50Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_50.csv", formatCsv(goal50OwnersData));

		// W3W Goal 51: Obtain Necromancer Robes [Gray] - Male
		const goal51Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("22"));
		const goal51OwnersData = [...armorOwnersData.entries()].filter((entry) => goal51Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_51.csv", formatCsv(goal51OwnersData));

		// W3W Goal 52: Obtain Bloodreaper Armor [Red] - Male
		const goal52Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("28"));
		const goal52OwnersData = [...armorOwnersData.entries()].filter((entry) => goal52Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_52.csv", formatCsv(goal52OwnersData));

		// W3W Goal 53: Obtain Deathstalker Armor [Yellow] - Male
		const goal53Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("34"));
		const goal53OwnersData = [...armorOwnersData.entries()].filter((entry) => goal53Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_53.csv", formatCsv(goal53OwnersData));

		// W3W Goal 54: Obtain At least 15 Pets
		const goal54Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 15);
		const goal54OwnersData = [...petOwnersData.entries()].filter((entry) => goal54Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_54.csv", formatCsv(goal54OwnersData));

		// W3W Goal 55: Obtain Necromancer Staff [Blue]
		const goal55Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("15"));
		const goal55OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal55Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_55.csv", formatCsv(goal55OwnersData));

		// W3W Goal 56: Obtain Elemental Robes [Red] - Female
		const goal56Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("17"));
		const goal56OwnersData = [...armorOwnersData.entries()].filter((entry) => goal56Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_56.csv", formatCsv(goal56OwnersData));

		// W3W Goal 57: Obtain Necromancer Robes [Gray] - Female
		const goal57Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("23"));
		const goal57OwnersData = [...armorOwnersData.entries()].filter((entry) => goal57Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_57.csv", formatCsv(goal57OwnersData));

		// W3W Goal 58: Obtain Bloodreaper Armor [Red] - Female
		const goal58Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("29"));
		const goal58OwnersData = [...armorOwnersData.entries()].filter((entry) => goal58Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_58.csv", formatCsv(goal58OwnersData));

		// W3W Goal 59: Obtain Deathstalker Armor [Yellow] - Female
		const goal59Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("35"));
		const goal59OwnersData = [...armorOwnersData.entries()].filter((entry) => goal59Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_59.csv", formatCsv(goal59OwnersData));

		// W3W Goal 60: Obtain At least 16 Pets
		const goal60Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 16);
		const goal60OwnersData = [...petOwnersData.entries()].filter((entry) => goal60Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_60.csv", formatCsv(goal60OwnersData));

		// W3W Goal 61: Obtain Necromancer Staff [Gray]
		const goal61Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("16"));
		const goal61OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal61Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_61.csv", formatCsv(goal61OwnersData));

		// W3W Goal 62: Obtain Necromancer Robes [Purple] - Male
		const goal62Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("24"));
		const goal62OwnersData = [...armorOwnersData.entries()].filter((entry) => goal62Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_62.csv", formatCsv(goal62OwnersData));

		// W3W Goal 63: Obtain Deathstalker Armor [Red] - Male
		const goal63Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("30"));
		const goal63OwnersData = [...armorOwnersData.entries()].filter((entry) => goal63Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_63.csv", formatCsv(goal63OwnersData));

		// W3W Goal 64: Obtain At least 17 Pets
		const goal64Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 17);
		const goal64OwnersData = [...petOwnersData.entries()].filter((entry) => goal64Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_64.csv", formatCsv(goal64OwnersData));

		// W3W Goal 65: Obtain Necromancer Staff [Purple]
		const goal65Owners = [...weaponsOwned.keys()].filter((owner) => weaponsOwned.get(owner)?.includes("17"));
		const goal65OwnersData = [...weaponOwnersData.entries()].filter((entry) => goal65Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_65.csv", formatCsv(goal65OwnersData));

		// W3W Goal 66: Obtain Necromancer Robes [Purple] - Female
		const goal66Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("25"));
		const goal66OwnersData = [...armorOwnersData.entries()].filter((entry) => goal66Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_66.csv", formatCsv(goal66OwnersData));

		// W3W Goal 67: Obtain Deathstalker Armor [Red] - Female
		const goal67Owners = [...armorsOwned.keys()].filter((owner) => armorsOwned.get(owner)?.includes("31"));
		const goal67OwnersData = [...armorOwnersData.entries()].filter((entry) => goal67Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_67.csv", formatCsv(goal67OwnersData));

		// W3W Goal 68: Obtain At least 18 Pets
		const goal68Owners = [...uniquePetsOwned.keys()].filter((owner) => (uniquePetsOwned.get(owner) ?? 0) >= 18);
		const goal68OwnersData = [...petOwnersData.entries()].filter((entry) => goal68Owners.includes(entry[0]));
		fs.writeFileSync("w3w_goal_68.csv", formatCsv(goal68OwnersData));
	} catch (e) {
		console.error("Something went wrong: ", e);
	}
};

main();

const getOwnerDataFromTransferEvents = async (contract: SmartContract) => {
	const latestBlock = await getBlockNumber({ network: RPC as string });
	let FROM_BLOCK = 0;
	let TO_BLOCK = FROM_BLOCK + BLOCK_BATCH_SIZE > latestBlock ? latestBlock : FROM_BLOCK + BLOCK_BATCH_SIZE;

	const ownersMap: Map<string, OwnedIdData[]> = new Map<string, OwnedIdData[]>();

	do {
		let transferEvents: any[] = [];
		try {
			transferEvents = await contract.events.getEvents("TransferSingle", { order: "desc", fromBlock: FROM_BLOCK, toBlock: TO_BLOCK });
		} catch (error) {
			console.error("Error fetching transfer events:", error);
			return new Map<string, OwnedIdData[]>();
		}

		for (const event of transferEvents) {
			const tokenId = event.data["id"];
			const fromAddress = event.data["from"];
			const toAddress = event.data["to"];
			const timestamp = (
				await getBlock({
					network: RPC as string,
					block: event.transaction.blockNumber,
				})
			).timestamp;

			if (!ownersMap.has(toAddress)) {
				ownersMap.set(toAddress, []);
			}

			const ownedIdData: OwnedIdData = {
				id: tokenId,
				timestamp,
			};

			if (ownersMap.has(fromAddress)) {
				const prevOwnerOwnedIds = ownersMap.get(fromAddress)!;
				const prevIndex = prevOwnerOwnedIds.findIndex((data) => data.id === tokenId);
				if (prevIndex !== -1) {
					prevOwnerOwnedIds.splice(prevIndex, 1);
					// If the previous owner no longer has any tokens, remove the owner from the map
					if (prevOwnerOwnedIds.length === 0) {
						ownersMap.delete(fromAddress);
					}
				}
			}

			const ownerOwnedIds = ownersMap.get(toAddress);
			if (!ownerOwnedIds) {
				continue;
			}
			const existingData = ownerOwnedIds.find((data) => data.id === tokenId);
			if (!existingData) {
				ownerOwnedIds.push(ownedIdData);
			}
		}

		// Ensure each owner has only unique token IDs with the earliest timestamp
		for (const [owner, ownedIds] of ownersMap.entries()) {
			const groupedById = ownedIds.reduce((acc: { [id: string]: OwnedIdData[] }, curr) => {
				if (!acc[curr.id]) {
					acc[curr.id] = [];
				}
				acc[curr.id].push(curr);
				return acc;
			}, {});

			const filteredIds = Object.values(groupedById).map((idGroup) => {
				return idGroup.reduce((earliest, curr) => {
					return curr.timestamp < earliest.timestamp ? curr : earliest;
				});
			});

			ownersMap.set(owner, filteredIds);
		}
		console.log(`Processed up to block ${TO_BLOCK} blocks, waiting ${BLOCK_BATCH_DELAY_MS / 1000}s before continuing...`);
		FROM_BLOCK = TO_BLOCK;
		TO_BLOCK = FROM_BLOCK + BLOCK_BATCH_SIZE > latestBlock ? latestBlock : FROM_BLOCK + BLOCK_BATCH_SIZE;
		await new Promise((resolve) => setTimeout(resolve, BLOCK_BATCH_DELAY_MS));
	} while (FROM_BLOCK < latestBlock);

	return ownersMap;
};

function formatCsv(ownersData: [string, OwnedIdData[]][]): string {
	return (
		"wallet_addresses,completed_on\n" +
		ownersData
			.map((entry) => {
				// If there are multiple timestamps, we'll pick the earliest.
				const earliestTimestamp = Math.min(...entry[1].map((data) => data.timestamp));
				return entry[0] + "," + earliestTimestamp;
			})
			.join("\n")
	);
}
