// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { SuiClient } = require('@mysten/sui.js/client'); // Corrected import path
const app = express();
app.use(cors());
app.use(express.json());

// ==== CONFIGURATION ====
// Set these to your actual deployed IDs!
// You MUST replace "0x..." with your actual Deployed Package ID and Scoreboard ID.
const PACKAGE_ID = process.env.PACKAGE_ID || "0xYOUR_PACKAGE_ID"; // <-- IMPORTANT: FILL IN
const SCOREBOARD_ID = process.env.SCOREBOARD_ID || "0xYOUR_SCOREBOARD_ID"; // <-- IMPORTANT: FILL IN

const PET_TYPE = `${PACKAGE_ID}::game::Pet`;
const ASSET_TYPE = `${PACKAGE_ID}::game::Asset`;

// Sui fullnode endpoint (mainnet or testnet)
const SUI_RPC = process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io:443"; // Or "https://fullnode.testnet.sui.io:443"
const suiClient = new SuiClient({ url: SUI_RPC });

// ---- Helpers (from your provided code) ----
async function fetchPets(address) {
  const { data } = await suiClient.getOwnedObjects({
    owner: address,
    filter: { StructType: PET_TYPE },
    options: { showContent: true, showType: true, showDisplay: true /* Optional: for potential image URL */ },
  });
  return (
    data
      ?.map((obj) => ({
        id: obj.data?.objectId,
        name: obj.data?.content?.fields?.name,
        // Attempt to get an image URL if your Pet struct has one (e.g., in display field)
        // This is an example, adjust to how your Pet's image URL is stored on-chain.
        imageUrl: obj.data?.display?.data?.image_url || obj.data?.content?.fields?.url || obj.data?.content?.fields?.image_url || null,
      }))
      .filter((p) => !!p.id && !!p.name) || []
  );
}

async function fetchAllUserAssets(address) { // Renamed to avoid confusion with equipped assets
  const { data } = await suiClient.getOwnedObjects({
    owner: address,
    filter: { StructType: ASSET_TYPE },
    options: { showContent: true, showType: true, showDisplay: true },
  });
  return (
    data?.map((obj) => ({
      id: obj.data.objectId,
      url: obj.data.content.fields.url || obj.data?.display?.data?.image_url, // Prefer URL field, fallback to display
      action: obj.data.content.fields.action,
      frames: obj.data.content.fields.frames,
      name: obj.data.content.fields.name,
      description: obj.data.content.fields.description,
      attributes: obj.data.content.fields.attributes,
    })) || []
  );
}

async function fetchEquippedAssetIdsForPet(petId) {
  try {
    const { data } = await suiClient.getDynamicFields({ parentId: petId });
    console.log('[DEBUG] Pet dynamic fields:', data);

    // The equipped asset's objectId is in objectId
    const assetIds = data
      .filter(f => f.objectType === ASSET_TYPE)
      .map(f => f.objectId)
      .filter(id => !!id && typeof id === 'string' && id.startsWith('0x'));
    return assetIds;
  } catch (err) {
    console.error(`Error fetching dynamic fields for pet ${petId}:`, err);
    return [];
  }
}

// ---- API Endpoint ----
app.get('/api/user-pet', async (req, res) => {
  const address = req.query.address;
  const petId = req.query.pet;
  if (!address) return res.status(400).json({ error: "Missing address" });

  try {
    const pets = await fetchPets(address);
    if (!pets.length) return res.status(404).json({ error: "No pets found for this address." });

    let selectedPet = petId ? pets.find(p => p.id === petId) : pets[0];
    if (!selectedPet) return res.status(404).json({ error: "Pet not found for user." });

    // Fetch equipped asset IDs from pet's dynamic fields
    const equippedAssetIds = await fetchEquippedAssetIdsForPet(selectedPet.id);

    // Fetch asset objects by ID (regardless of owner)
    const equippedAssetsWithMetadata = await Promise.all(
      equippedAssetIds.map(async (assetId) => {
        try {
          const { data } = await suiClient.getObject({
            id: assetId,
            options: { showContent: true, showType: true, showDisplay: true },
          });
          if (!data?.content?.fields) return null;
          return {
            id: data.objectId,
            url: data.content.fields.url || data?.display?.data?.image_url,
            action: data.content.fields.action,
            frames: data.content.fields.frames,
            name: data.content.fields.name,
            description: data.content.fields.description,
            attributes: data.content.fields.attributes,
          };
        } catch (e) {
          return null;
        }
      })
    );
    const filteredEquippedAssets = equippedAssetsWithMetadata.filter(Boolean);

    res.json({ pet: selectedPet, assets: filteredEquippedAssets });
  } catch (err) {
    res.status(500).json({ error: "Internal server error while fetching pet data." });
  }
});



app.get('/api/user-pet-list', async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing address" });
  try {
    const pets = await fetchPets(address);
    res.json({ pets });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch pets." });
  }
});


// ---- Start Server ----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Tomodachi backend listening on port ${PORT}`);
  console.log(`Ensure PACKAGE_ID is set. Current: ${PACKAGE_ID}`);
  console.log(`Ensure SCOREBOARD_ID is set. Current: ${SCOREBOARD_ID}`);
  console.log(`Using SUI_RPC: ${SUI_RPC}`);
  if (PACKAGE_ID === "0xYOUR_PACKAGE_ID" || SCOREBOARD_ID === "0xYOUR_SCOREBOARD_ID") {
    console.warn("\nWARNING: PACKAGE_ID or SCOREBOARD_ID is not set to actual values in server.js or .env file. API calls will likely fail.\n");
  }
});
