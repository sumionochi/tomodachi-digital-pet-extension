/// <reference types="chrome" />

// src/background/background.ts
import { PetData, ExtensionMessage, Pet, Asset } from "../common/types";

const BACKEND_URL = "http://localhost:3001/api/user-pet"; // Ensure this matches your backend

// Helper to fetch pet data from your backend
async function fetchPetDataFromBackend({
  suiAddress,
  petId,
}: {
  suiAddress: string;
  petId: string;
}): Promise<PetData> {
  const url = `${BACKEND_URL}?address=${suiAddress}&pet=${petId}`;
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      (await response.json()).error || "Failed to fetch pet data"
    );
  const data = await response.json();
  if (!data.pet || !data.assets) throw new Error("Invalid data from backend");
  return data as PetData;
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    // Inside message listener:
    if (message.type === "SAVE_ADDRESS_AND_FETCH") {
      const { suiAddress, petId } = message.payload;
      chrome.storage.local.set({ suiAddress, petId }, async () => {
        try {
          const petData = await fetchPetDataFromBackend({ suiAddress, petId });
          chrome.storage.local.set({ petData }, () => {
            chrome.runtime.sendMessage({
              type: "PET_DATA_UPDATED",
              payload: petData,
            } as ExtensionMessage);
          });
          sendResponse({ status: "success" });
        } catch (e: any) {
          chrome.storage.local.remove("petData");
          chrome.runtime.sendMessage({
            type: "PET_DATA_ERROR",
            payload: e.message,
          } as ExtensionMessage);
          sendResponse({ status: "error", message: e.message });
        }
      });
      return true;
    } else if (message.type === "FETCH_PET_DATA") {
      const { suiAddress, petId } = message.payload;
      (async () => {
        try {
          const petData = await fetchPetDataFromBackend({ suiAddress, petId });
          chrome.storage.local.set({ petData }, () => {
            chrome.runtime.sendMessage({
              type: "PET_DATA_UPDATED",
              payload: petData,
            } as ExtensionMessage);
          });
          sendResponse({ status: "success" });
        } catch (e: any) {
          chrome.storage.local.remove("petData");
          chrome.runtime.sendMessage({
            type: "PET_DATA_ERROR",
            payload: e.message,
          } as ExtensionMessage);
          sendResponse({ status: "error", message: e.message });
        }
      })();
      return true;
    } else if (message.type === "GET_PET_DATA") {
      // For content script to request current data
      chrome.storage.local.get(["petData", "suiAddress"], (result) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            status: "error",
            message: "Failed to retrieve data from storage.",
          });
          return;
        }
        if (result.petData && result.suiAddress) {
          sendResponse({
            status: "success",
            payload: { petData: result.petData, suiAddress: result.suiAddress },
          });
        } else if (result.suiAddress) {
          // Address exists, but no pet data, maybe try fetching
          sendResponse({
            status: "pending",
            message: "Address found, pet data not yet loaded.",
            payload: { suiAddress: result.suiAddress },
          });
        } else {
          sendResponse({
            status: "nodata",
            message: "No pet data or address found in storage.",
          });
        }
      });
      return true; // Async response
    }
    // Add other message handlers if needed
    return false; // Default for synchronous messages or if not handling this message type
  }
);

// Optional: Initial fetch if address already exists when extension starts
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("suiAddress", (result) => {
    if (result.suiAddress) {
      console.log(
        "Extension startup: Found address, fetching data...",
        result.suiAddress
      );
      // Trigger a fetch, similar to FETCH_PET_DATA but without sendResponse
      (async () => {
        try {
          const petData = await fetchPetDataFromBackend(result.suiAddress);
          chrome.storage.local.set({ petData }, () => {
            if (!chrome.runtime.lastError) {
              chrome.runtime.sendMessage({
                type: "PET_DATA_UPDATED",
                payload: petData,
              } as ExtensionMessage);
            }
          });
        } catch (error) {
          console.error("Startup fetch failed:", error);
          chrome.runtime.sendMessage({
            type: "PET_DATA_ERROR",
            payload: (error as Error).message || "Startup fetch failed.",
          } as ExtensionMessage);
        }
      })();
    }
  });
});

console.log("Tomodachi Pets Background Script Loaded.");
