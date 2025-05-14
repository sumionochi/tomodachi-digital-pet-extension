// lib/sui.ts

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

// ==== CONFIGURATION ====
export const PACKAGE_ID           = process.env.NEXT_PUBLIC_PACKAGE_ID!;
export const MODULE               = 'game';
export const SCOREBOARD_ID        = process.env.NEXT_PUBLIC_SCOREBOARD_ID!;
export const MINT_RECORD_ID       = process.env.NEXT_PUBLIC_MINT_RECORD_ID!;
export const PET_NAMES_ID         = process.env.NEXT_PUBLIC_PET_NAMES_ID!;
export const EQUIPPED_ASSETS_ID   = process.env.NEXT_PUBLIC_EQUIPPED_ASSETS_ID!;

// Helper: find a capability object owned by the user
export async function findCap(address: string, type: string, suiClient: SuiClient) {
  const { data } = await suiClient.getOwnedObjects({ owner: address, filter: { StructType: type }, options: { showType: true } });
  if (!data.length) throw new Error(`No ${type} found for address ${address}`);
  return data[0].data?.objectId!;
}

// ==== GAME ACTIONS ====

// 1. Register user
export async function createUser(address: string, suiClient: SuiClient, signAndExecute: any) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::create_user`,
    arguments: [tx.object(SCOREBOARD_ID)],
  });
  return signAndExecute({ transactionBlock: tx });
}

// 2. Daily check-in
export async function checkIn(address: string, suiClient: SuiClient, signAndExecute: any) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::check_in`,
    arguments: [tx.object(SCOREBOARD_ID)],
  });
  return signAndExecute({ transactionBlock: tx });
}

// 3. Mint asset
export async function mintAsset(
  address: string,
  suiClient: SuiClient,
  signAndExecute: any,
  action: number,
  frames: number,
  url: string,
  name: string,
  description: string,
  attributes: string,
) {
  const mintCapId = await findCap(address, `${PACKAGE_ID}::${MODULE}::UserMintCap`, suiClient);
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::mint_asset`,
    arguments: [
      tx.object(mintCapId),
      tx.object(SCOREBOARD_ID),
      tx.object(MINT_RECORD_ID),
      tx.object(EQUIPPED_ASSETS_ID),
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string(attributes),
      tx.pure.u8(action),
      tx.pure.u8(frames),
      tx.pure.string(url),
    ],
  });
  return signAndExecute({ transactionBlock: tx });
}


// 4. Create pet
export async function createPet(address: string, suiClient: SuiClient, signAndExecute: any, name: string) {
  const mintCapId = await findCap(address, `${PACKAGE_ID}::${MODULE}::UserMintCap`, suiClient);
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::create_pet`,
    arguments: [
      tx.object(mintCapId),
      tx.object(PET_NAMES_ID),
      tx.pure.string(name),
    ],
  });
  return signAndExecute({ transactionBlock: tx });
}

// 5. Equip asset
export async function equipAsset(address: string, suiClient: SuiClient, signAndExecute: any, petId: string, assetId: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::equip_asset`,
    arguments: [
      tx.object(petId),
      tx.object(assetId),
      tx.object(EQUIPPED_ASSETS_ID),
      tx.object('0x6'), // dummy TxContext, will be replaced by Sui
    ],
  });
  return signAndExecute({ transactionBlock: tx });
}

// 6. Unequip asset
export async function unequipAsset(address: string, suiClient: SuiClient, signAndExecute: any, petId: string, assetId: string) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::unequip_asset`,
    arguments: [
      tx.object(petId),
      tx.pure.id(assetId),
      tx.object(EQUIPPED_ASSETS_ID),
      tx.object('0x6'), // dummy TxContext, will be replaced by Sui
    ],
  });
  return signAndExecute({ transactionBlock: tx });
}

// 7. Admin reset score
export async function adminResetScore(address: string, suiClient: SuiClient, signAndExecute: any, userAddress: string) {
  const adminCapId = await findCap(address, `${PACKAGE_ID}::${MODULE}::AdminCap`, suiClient);
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::admin_reset_score`,
    arguments: [
      tx.object(adminCapId),
      tx.object(SCOREBOARD_ID),
      tx.pure.address(userAddress),
    ],
  });
  return signAndExecute({ transactionBlock: tx });
}
