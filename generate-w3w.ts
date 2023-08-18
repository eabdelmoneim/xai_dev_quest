import { config } from "dotenv";
import { SmartContract, ThirdwebSDK } from "@thirdweb-dev/sdk";
import fs from "fs";

config();

const CHAIN_IDENTIFIER = "xai-goerli-orbit";
const PET_CONTRACT_ADDRESS = "0x40da2B4a5feB3ABD0FF7fD12C158C0ddbF6391e0";
const ARMOR_CONTRACT_ADDRESS = "0x9E7ADF51b3517355A0b5F6541D1FB089F3aDbA40";
const WEAPON_CONTRACT_ADDRESS = "0x5727d991BC6D46Ab8163d468Bd49Ab4A427B5798";

const main = async () => {
	try {
		const sdk = new ThirdwebSDK(CHAIN_IDENTIFIER, {
			secretKey: process.env.THIRDWEB_API_SECRET,
		});

		const petContract = await sdk.getContract(PET_CONTRACT_ADDRESS);
		const armorContract = await sdk.getContract(ARMOR_CONTRACT_ADDRESS);
		const weaponContract = await sdk.getContract(WEAPON_CONTRACT_ADDRESS);

		const petOwners = await getFinalOwnersFromTransferEvents(petContract);
		const armorOwners = await getFinalOwnersFromTransferEvents(armorContract);
		const weaponOwners = await getFinalOwnersFromTransferEvents(weaponContract);

		let rareArmorIds: string[] = [];
		let rareWeaponIds: string[] = [];
		let epicArmorIds: string[] = [];
		let epicWeaponIds: string[] = [];
		let legendaryArmorIds: string[] = [];
		let legendaryWeaponIds: string[] = [];

		// Get all armor ids
		const allArmors = await armorContract.erc1155.getAll();
		allArmors.forEach((armor: any) => {
			const attributes = armor.metadata.attributes;
			const rarityAttribute = attributes.find(
				(attribute: { trait_type: string }) => attribute.trait_type === "Rarity"
			);
			if (rarityAttribute) {
				const rarity = rarityAttribute.value;
				if (rarity === "Rare") {
					rareArmorIds.push(armor.metadata.id);
				} else if (rarity === "Epic") {
					epicArmorIds.push(armor.metadata.id);
				} else if (rarity === "Legendary") {
					legendaryArmorIds.push(armor.metadata.id);
				}
			}
		});

		// Get all weapon ids
		const allWeapons = await weaponContract.erc1155.getAll();
		allWeapons.forEach((weapon: any) => {
			const attributes = weapon.metadata.attributes;
			const rarityAttribute = attributes.find(
				(attribute: { trait_type: string }) => attribute.trait_type === "Rarity"
			);
			if (rarityAttribute) {
				const rarity = rarityAttribute.value;
				if (rarity === "Rare") {
					rareWeaponIds.push(weapon.metadata.id);
				} else if (rarity === "Epic") {
					epicWeaponIds.push(weapon.metadata.id);
				} else if (rarity === "Legendary") {
					legendaryWeaponIds.push(weapon.metadata.id);
				}
			}
		});

		// Combine all unique owners
		const allOwners = [...new Set([...petOwners, ...armorOwners, ...weaponOwners])];

		let owns_rare_armor: string[] = [];
		let owns_rare_weapon: string[] = [];
		let owns_epic_armor: string[] = [];
		let owns_epic_weapon: string[] = [];
		let owns_legendary_armor: string[] = [];
		let owns_legendary_weapon: string[] = [];
		let owns_1_pet: string[] = [];
		let owns_5_pets: string[] = [];
		let owns_10_pets: string[] = [];
		let owns_15_pets: string[] = [];

		for (const owner of allOwners) {
			// Filter out owned armors
			const ownedArmors = await armorContract.erc1155.getOwned(owner);
			if (ownedArmors.some((nft) => rareArmorIds.includes(nft.metadata.id))) {
				owns_rare_armor.push(owner);
			}
			if (ownedArmors.some((nft) => epicArmorIds.includes(nft.metadata.id))) {
				owns_epic_armor.push(owner);
			}
			if (ownedArmors.some((nft) => legendaryArmorIds.includes(nft.metadata.id))) {
				owns_legendary_armor.push(owner);
			}

			// Filter out owned weapons
			const ownedWeapons = await weaponContract.erc1155.getOwned(owner);
			if (ownedWeapons.some((nft) => rareWeaponIds.includes(nft.metadata.id))) {
				owns_rare_weapon.push(owner);
			}
			if (ownedWeapons.some((nft) => epicWeaponIds.includes(nft.metadata.id))) {
				owns_epic_weapon.push(owner);
			}
			if (ownedWeapons.some((nft) => legendaryWeaponIds.includes(nft.metadata.id))) {
				owns_legendary_weapon.push(owner);
			}

			// Get owned pets
			const ownedPets = await petContract.erc1155.getOwned(owner);
			if (ownedPets.length > 0) {
				owns_1_pet.push(owner);
			}
			if (ownedPets.length >= 5) {
				owns_5_pets.push(owner);
			}
			if (ownedPets.length >= 10) {
				owns_10_pets.push(owner);
			}
			if (ownedPets.length >= 15) {
				owns_15_pets.push(owner);
			}
		}

		fs.writeFileSync("w3w_goal_1_owns_rare_armor.csv", formatCsv(owns_rare_armor));
		fs.writeFileSync("w3w_goal_2_owns_rare_weapon.csv", formatCsv(owns_rare_weapon));
		fs.writeFileSync("w3w_goal_3_owns_epic_armor.csv", formatCsv(owns_epic_armor));
		fs.writeFileSync("w3w_goal_4_owns_epic_weapon.csv", formatCsv(owns_epic_weapon));
		fs.writeFileSync("w3w_goal_5_owns_legendary_armor.csv", formatCsv(owns_legendary_armor));
		fs.writeFileSync("w3w_goal_6_owns_legendary_weapon.csv", formatCsv(owns_legendary_weapon));
		fs.writeFileSync("w3w_goal_7_owns_1_pet.csv", formatCsv(owns_1_pet));
		fs.writeFileSync("w3w_goal_8_owns_5_pets.csv", formatCsv(owns_5_pets));
		fs.writeFileSync("w3w_goal_9_owns_10_pets.csv", formatCsv(owns_10_pets));
		fs.writeFileSync("w3w_goal_10_owns_15_pets.csv", formatCsv(owns_15_pets));
	} catch (e) {
		console.error("Something went wrong: ", e);
	}
};

main();

const getFinalOwnersFromTransferEvents = async (contract: SmartContract) => {
	let transferEvents: any[] = [];
	try {
		transferEvents = await contract.events.getEvents("TransferSingle");
	} catch {
		return [];
	}

	let ownersMap: { [tokenId: string]: string } = {};
	transferEvents.forEach((transferEvent) => {
		if (transferEvent.data["to"] !== "0x0000000000000000000000000000000000000000") {
			ownersMap[transferEvent.data["id"]] = transferEvent.data["to"];
		}
	});

	return Object.values(ownersMap);
};

function formatCsv(items: string[]): string {
	return `wallet_addresses\n${Array.from(new Set(items)).join("\n")}`;
}
