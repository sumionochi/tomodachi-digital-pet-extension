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
export interface ExtensionMessage {
  type: string;
  payload?: any;
}
