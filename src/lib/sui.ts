// lib/sui.ts

import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";

// ==== CONFIGURATION ====
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
export const MODULE = "game";
export const SCOREBOARD_ID = process.env.NEXT_PUBLIC_SCOREBOARD_ID!;
export const MINT_RECORD_ID = process.env.NEXT_PUBLIC_MINT_RECORD_ID!;
export const PET_NAMES_ID = process.env.NEXT_PUBLIC_PET_NAMES_ID!;
export const EQUIPPED_ASSETS_ID = process.env.NEXT_PUBLIC_EQUIPPED_ASSETS_ID!;
export const LAST_CHECKIN_ID = process.env.NEXT_PUBLIC_LAST_CHECKIN_ID!;
export const WALRUS_BASE = process.env.NEXT_PUBLIC_WALRUS_BASE_URL!;

// Helper: find points if enough owned by the user
export async function findCap(
  address: string,
  type: string,
  suiClient: SuiClient
) {
  const { data } = await suiClient.getOwnedObjects({
    owner: address,
    filter: { StructType: type },
    options: { showType: true },
  });
  if (!data.length) throw new Error(`No ${type} found for address ${address}`);
  return data[0].data?.objectId!;
}

// ==== GAME ACTIONS ====

// 1. Register user
export function createUser(
  address: string,
  suiClient: SuiClient,
  signAndExecute: any // This should be the `mutate` function from useSignAndExecuteTransaction
) {
  console.log("createUser function reached and Creating user now...");
  console.log("PACKAGE_ID:", PACKAGE_ID);
  console.log("MODULE:", MODULE);
  console.log("SCOREBOARD_ID:", SCOREBOARD_ID);
  try {
    const tx = new Transaction();
    console.log("Here is :" + `${PACKAGE_ID}::${MODULE}::create_user`);
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE}::create_user`,
      arguments: [tx.object(SCOREBOARD_ID)],
    });

    // Use the callback pattern, NOT await
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result: any) => {
          console.log("Registration sent! TX digest: " + result.digest);
          // You can handle further logic here
        },
        onError: (err: any) => {
          alert("Registration failed: " + err.message);
          console.error(err);
        },
      }
    );
  } catch (e) {
    alert(
      "Registration failed: " + (e instanceof Error ? e.message : String(e))
    );
    console.error(e);
  }
}

// 2. Daily check-in
export function checkIn(
  address: string,
  suiClient: SuiClient,
  signAndExecute: any
) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::check_in`,
    arguments: [
      tx.object(SCOREBOARD_ID),
      tx.object(process.env.NEXT_PUBLIC_LAST_CHECKIN_ID!), // <-- Add this!
      tx.object("0x6"), // <-- Pass the Clock object
    ],
  });
  return signAndExecute({ transaction: tx });
}

// 3. Mint asset
export async function mintAsset(
  address: string,
  suiClient: SuiClient,
  signAndExecuteTransaction: (opts: {
    transaction: Transaction;
  }) => Promise<any>,
  action: number,
  frames: number,
  url: string,
  name: string,
  description: string,
  attributes: string
) {
  // 1) find your UserMintCap (unchanged)
  const mintCapId = await findCap(
    address,
    `${PACKAGE_ID}::${MODULE}::UserMintCap`,
    suiClient
  );
  console.log("Minting with:", {
    mintCapId,
    SCOREBOARD_ID,
    MINT_RECORD_ID,
    EQUIPPED_ASSETS_ID,
    name,
    description,
    attributes,
    action,
    frames,
    url,
  });

  // 2) build the moveCall
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
  console.log("📤 [mintAsset] built transaction", tx);

  // 3) submit & await on‐chain effects
  console.log("⛓️ [mintAsset] submitting…");
  const result = await signAndExecuteTransaction({
    transaction: tx,
  });
  console.log("📬 [mintAsset] result", result);

  // Just return result, don't check result.effects.status.status
  return result;

  if (!result.effects || result.effects.status.status !== "success") {
    throw new Error(
      `Transaction failed: ${result.effects?.status?.error || "Unknown error"}`
    );
  }

  return result;
}

// 4. Create pet
export async function createPet(
  address: string,
  suiClient: SuiClient,
  signAndExecute: any, // mutate function from useSignAndExecuteTransaction
  name: string,
  onSuccess?: (result: any) => void,
  onError?: (err: any) => void
) {
  console.log("[createPet] starting, name:", name, "address:", address);
  const mintCapId = await findCap(
    address,
    `${PACKAGE_ID}::${MODULE}::UserMintCap`,
    suiClient
  );
  console.log("[createPet] found UserMintCap:", mintCapId);

  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::create_pet`,
    arguments: [
      tx.object(mintCapId),
      tx.object(PET_NAMES_ID),
      tx.pure.string(name),
    ],
  });
  console.log("[createPet] built transaction:", tx);

  // Use callback pattern
  signAndExecute(
    { transaction: tx },
    {
      onSuccess: (result: any) => {
        console.log("[createPet] transaction success:", result);
        onSuccess?.(result);
      },
      onError: (err: any) => {
        console.error("[createPet] transaction failed:", err);
        onError?.(err);
      },
    }
  );
}

// 5. Equip asset
export async function equipAsset(
  address: string,
  suiClient: SuiClient,
  signAndExecute: any,
  petId: string,
  assetId: string
) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::equip_asset`,
    arguments: [
      tx.object(petId),
      tx.object(assetId),
      tx.object(EQUIPPED_ASSETS_ID),
    ],
  });
  return signAndExecute({ transaction: tx });
}

// 6. Unequip asset
export async function unequipAsset(
  address: string,
  suiClient: SuiClient,
  signAndExecute: any,
  petId: string,
  assetId: string
) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::unequip_asset`,
    arguments: [
      tx.object(petId),
      tx.pure.id(assetId),
      tx.object(EQUIPPED_ASSETS_ID),
    ],
  });
  return signAndExecute({ transaction: tx });
}

// 8. Admin set score
export async function adminSetScore(
  address: string,
  suiClient: SuiClient,
  signAndExecute: any,
  userAddress: string,
  newScore: number
) {
  const adminCapId = await findCap(
    address,
    `${PACKAGE_ID}::${MODULE}::AdminCap`,
    suiClient
  );
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::admin_set_score`,
    arguments: [
      tx.object(adminCapId),
      tx.object(SCOREBOARD_ID),
      tx.pure.address(userAddress),
      tx.pure.u64(newScore),
    ],
  });
  return signAndExecute({ transaction: tx });
}
