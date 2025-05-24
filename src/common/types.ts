// src/common/types.ts

// These types are based on your gameHooks.ts and what the backend is expected to return.

export type Pet = {
  id: string; // Object ID of the pet
  name: string;
  // Add a direct image URL for the pet if available, otherwise, one of the assets might represent the pet's body
  imageUrl?: string;
};

export type Asset = {
  id: string; // Object ID of the asset
  url: string; // Image URL for the asset
  name: string;
  description: string;
  // These fields were in your original Asset type, including them for completeness
  action?: number;
  frames?: number;
  attributes?: string;
};

export interface PetData {
  pet: Pet;
  assets: Asset[]; // Equipped assets for the pet
}

// For messages between components of the extension
export type ExtensionMessage =
  | { type: "PET_DATA_UPDATED"; payload: PetData }
  | { type: "PET_DATA_ERROR"; payload: string }
  | { type: "GET_PET_DATA" }
  | { type: "TOGGLE_VISIBILITY" }
  | { type: "SAVE_ADDRESS_AND_FETCH"; payload: any }
  | { type: "FETCH_PET_DATA"; payload: any };

// For orbit config:
export interface OrbitAssetConfig {
  id: string; // assetId
  mode: "static" | "animated";
  duration: number; // seconds
  frameSize?: number; // required if animated
  frameCount?: number; // required if animated
  frameRate?: number; // required if animated (frames/sec)
}
