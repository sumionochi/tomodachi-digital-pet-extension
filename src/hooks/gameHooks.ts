// src/hooks/gameHooks.ts

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { PACKAGE_ID, SCOREBOARD_ID } from "@/lib/sui";

// Types
export type Pet = { id: string; name: string };
export type Asset = {
  id: string;
  url: string;
  action: number;
  frames: number;
  name: string;
  description: string;
  attributes: string;
};
export type EquippedAssets = Record<string, string>; // petId -> assetId

// Helper to get Move struct type
const PET_TYPE = `${PACKAGE_ID}::game::Pet`;
const ASSET_TYPE = `${PACKAGE_ID}::game::Asset`;
const ADMIN_CAP_TYPE = `${PACKAGE_ID}::game::AdminCap`;

async function fetchScore(
  address: string,
  suiClient: any
): Promise<number | null> {
  try {
    console.log("[fetchScore] Fetching ScoreBoard object:", SCOREBOARD_ID);
    const scoreboard = await suiClient.getObject({
      id: SCOREBOARD_ID,
      options: { showContent: true },
    });
    console.log("[fetchScore] ScoreBoard object response:", scoreboard);

    const fields = scoreboard.data?.content?.fields;
    if (!fields) {
      console.warn("[fetchScore] No fields in ScoreBoard object");
      return null;
    }
    const scoresTableId = fields.scores.fields.id.id;
    console.log("[fetchScore] Scores table ID:", scoresTableId);

    const res = await suiClient.getDynamicFieldObject({
      parentId: scoresTableId,
      name: { type: "address", value: address },
    });
    console.log("[fetchScore] getDynamicFieldObject response:", res);

    const value = res.data?.content?.fields?.value;
    console.log("[fetchScore] Extracted score value:", value);

    return value ?? null;
  } catch (err) {
    console.error("[fetchScore] Error:", err);
    return null;
  }
}

async function fetchIsRegistered(
  address: string,
  suiClient: any
): Promise<boolean> {
  try {
    console.log(
      "[fetchIsRegistered] Fetching ScoreBoard object:",
      SCOREBOARD_ID
    );
    const scoreboard = await suiClient.getObject({
      id: SCOREBOARD_ID,
      options: { showContent: true },
    });
    console.log("[fetchIsRegistered] ScoreBoard object response:", scoreboard);

    const fields = scoreboard.data?.content?.fields;
    if (!fields) {
      console.warn("[fetchIsRegistered] No fields in ScoreBoard object");
      return false;
    }
    const scoresTableId = fields.scores.fields.id.id;
    console.log("[fetchIsRegistered] Scores table ID:", scoresTableId);

    const obj = await suiClient.getDynamicFieldObject({
      parentId: scoresTableId,
      name: { type: "address", value: address },
    });
    console.log("[fetchIsRegistered] getDynamicFieldObject response:", obj);

    const isRegistered = !!obj.data?.content?.fields?.value;
    console.log("[fetchIsRegistered] isRegistered:", isRegistered);

    return isRegistered;
  } catch (err) {
    console.error("[fetchIsRegistered] Error:", err);
    return false;
  }
}

export function useLastCheckIn(
  address?: string | null,
  lastCheckInId?: string
) {
  const suiClient = useSuiClient();
  const [lastCheckIn, setLastCheckIn] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!address || !lastCheckInId) return;

    // Fetch the LastCheckIn object
    const lastCheckInObj = await suiClient.getObject({
      id: lastCheckInId,
      options: { showContent: true },
    });

    // Defensive: get the table id for last_check_in
    let tableId: string | undefined = undefined;

    if (
      lastCheckInObj.data?.content?.dataType === "moveObject" &&
      typeof lastCheckInObj.data?.content?.fields === "object" &&
      lastCheckInObj.data.content.fields !== null &&
      "last_check_in" in lastCheckInObj.data.content.fields
    ) {
      // Now it's safe to access .fields
      const lastCheckInField = (lastCheckInObj.data.content.fields as any)
        .last_check_in;
      if (
        lastCheckInField &&
        typeof lastCheckInField === "object" &&
        "fields" in lastCheckInField &&
        lastCheckInField.fields &&
        "id" in lastCheckInField.fields &&
        lastCheckInField.fields.id &&
        "id" in lastCheckInField.fields.id
      ) {
        tableId = lastCheckInField.fields.id.id;
      }
    }

    if (typeof tableId !== "string") {
      setLastCheckIn(null);
      return;
    }

    try {
      // Fetch the dynamic field object for the user's address
      const res = await suiClient.getDynamicFieldObject({
        parentId: tableId,
        name: { type: "address", value: address },
      });

      if (
        res.data?.content?.dataType === "moveObject" &&
        res.data?.content?.fields &&
        "value" in res.data.content.fields
      ) {
        const value = res.data.content.fields.value;
        // Defensive: parse value to number
        const parsedValue =
          typeof value === "string" ? parseInt(value, 10) : value;
        setLastCheckIn(typeof parsedValue === "number" ? parsedValue : null);
      } else {
        setLastCheckIn(null);
      }
    } catch {
      setLastCheckIn(null);
    }
  }, [address, lastCheckInId, suiClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lastCheckIn, refresh };
}

async function fetchPets(address: string, suiClient: any): Promise<Pet[]> {
  const { data } = await suiClient.getOwnedObjects({
    owner: address,
    filter: { StructType: PET_TYPE },
    options: { showContent: true },
  });
  return (
    data
      ?.map((obj: any) => ({
        id: obj.data?.objectId,
        name: obj.data?.content?.fields?.name,
      }))
      .filter((p: Pet) => !!p.id && !!p.name) || []
  );
}

async function fetchAssets(address: string, suiClient: any): Promise<Asset[]> {
  const { data } = await suiClient.getOwnedObjects({
    owner: address,
    filter: { StructType: ASSET_TYPE },
    options: { showContent: true },
  });
  return (
    data?.map((obj: any) => ({
      id: obj.data.objectId,
      url: obj.data.content.fields.url,
      action: obj.data.content.fields.action,
      frames: obj.data.content.fields.frames,
      name: obj.data.content.fields.name,
      description: obj.data.content.fields.description,
      attributes: obj.data.content.fields.attributes,
    })) || []
  );
}

// Fetch equipped assets mapping (petId -> assetId)
async function fetchEquippedAssets(
  address: string,
  suiClient: any
): Promise<EquippedAssets> {
  // For each pet, check dynamic fields for attached Asset
  const pets = await fetchPets(address, suiClient);
  const equipped: EquippedAssets = {};
  await Promise.all(
    pets.map(async (pet) => {
      try {
        // Each pet's UID is a container for dynamic fields (assets)
        const { data } = await suiClient.getDynamicFields({
          parentId: pet.id,
        });
        // Find the first Asset dynamic field (if any)
        const assetField = data.find((f: any) => f.objectType === ASSET_TYPE);
        if (assetField) {
          equipped[pet.id] = assetField.name.value;
        }
      } catch {
        // ignore
      }
    })
  );
  return equipped;
}

// Check if user owns AdminCap
async function fetchIsAdmin(address: string, suiClient: any): Promise<boolean> {
  const { data } = await suiClient.getOwnedObjects({
    owner: address,
    filter: { StructType: ADMIN_CAP_TYPE },
    options: { showType: true },
  });
  return data.length > 0;
}

// Scoreboard hook
export function useScoreboard(address?: string | null) {
  const suiClient = useSuiClient();
  const [score, setScore] = useState<number | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) {
      console.warn("[useScoreboard] No address provided");
      return;
    }
    console.log("[useScoreboard] Refreshing for address:", address);

    const scoreValue = await fetchScore(address, suiClient);
    setScore(scoreValue);
    console.log("[useScoreboard] Score set to:", scoreValue);

    const registered = await fetchIsRegistered(address, suiClient);
    setIsRegistered(registered);
    console.log("[useScoreboard] isRegistered set to:", registered);
  }, [address, suiClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { score, isRegistered, refresh };
}

// Pets hook
export function usePets(address?: string | null) {
  const suiClient = useSuiClient();
  const [pets, setPets] = useState<Pet[]>([]);

  const refresh = useCallback(async () => {
    if (!address) return;
    setPets(await fetchPets(address, suiClient));
  }, [address, suiClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { pets, refresh };
}

// Assets hook
export function useAssets(address?: string | null) {
  const suiClient = useSuiClient();
  const [assets, setAssets] = useState<Asset[]>([]);

  const refresh = useCallback(async () => {
    if (!address) return;
    setAssets(await fetchAssets(address, suiClient));
  }, [address, suiClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { assets, refresh };
}

// EquippedAssets hook
export function useEquippedAssets(address?: string | null) {
  const suiClient = useSuiClient();
  const [equippedAssets, setEquippedAssets] = useState<EquippedAssets>({});

  const refresh = useCallback(async () => {
    if (!address) return;
    setEquippedAssets(await fetchEquippedAssets(address, suiClient));
  }, [address, suiClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { equippedAssets, refresh };
}

// AdminCap hook
export function useAdminCap(address?: string | null) {
  const suiClient = useSuiClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!address) return;
    fetchIsAdmin(address, suiClient).then(setIsAdmin);
  }, [address, suiClient]);

  return { isAdmin };
}
