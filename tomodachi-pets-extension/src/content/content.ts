// src/content/content.ts
import { PetData, ExtensionMessage } from "../common/types";

console.log("Tomodachi Pets Content Script Injected!");

// Globals
let petContainer: HTMLDivElement | null = null;
let currentPetData: PetData | null = null;
let suiAddress: string | null = null;
let isVisible = true; // To toggle visibility

let orbitAssetImgs: HTMLImageElement[] = [];
let orbitAngle = 0;
let orbitFrame: number | undefined;

// --------- ANIMATION + CLEANUP ---------

// Animate assets in orbit
function animateOrbit() {
  if (!petContainer || !orbitAssetImgs.length) return;
  orbitAngle += 0.01;
  const radius = 40;
  orbitAssetImgs.forEach((img, i) => {
    const angle = orbitAngle + (i / orbitAssetImgs.length) * 2 * Math.PI;
    img.style.left = `${Math.cos(angle) * radius}px`;
    img.style.top = `${Math.sin(angle) * radius}px`;
  });
  orbitFrame = requestAnimationFrame(animateOrbit);
}

// Remove old pet container, asset images, stop animation
function removePetContainer() {
  if (petContainer) {
    petContainer.remove();
    petContainer = null;
  }
  if (orbitFrame) {
    cancelAnimationFrame(orbitFrame);
    orbitFrame = undefined;
  }
  orbitAssetImgs = [];
}

// --------- CREATE/UPDATE PET DISPLAY ---------

function createPetElements() {
  // Cleanup before new render
  removePetContainer();

  if (!currentPetData) return;

  const data = currentPetData;

  // Create the new container
  const newPetContainer = document.createElement("div");
  newPetContainer.id = "tomodachi-pet-container";
  newPetContainer.style.position = "fixed";
  newPetContainer.style.zIndex = "99999999";
  newPetContainer.style.pointerEvents = "none";
  newPetContainer.style.transition = "opacity 0.3s ease-in-out";
  newPetContainer.style.opacity = isVisible ? "1" : "0";

  let petImageSrc = data.pet.imageUrl;
  if (!petImageSrc && data.assets.length > 0) {
    // Optionally, fallback to first asset's image if desired
    // petImageSrc = data.assets[0].url;
  }

  if (petImageSrc) {
    const petImg = document.createElement("img");
    petImg.src = petImageSrc;
    petImg.alt = data.pet.name;
    petImg.style.width = "50px";
    petImg.style.height = "50px";
    petImg.style.objectFit = "contain";
    petImg.style.position = "absolute";
    petImg.style.transform = "translate(-50%, -50%)";
    newPetContainer.appendChild(petImg);
  } else {
    const petNameDiv = document.createElement("div");
    petNameDiv.textContent = data.pet.name;
    petNameDiv.style.color = "black";
    petNameDiv.style.backgroundColor = "rgba(255,255,255,0.7)";
    petNameDiv.style.padding = "2px 5px";
    petNameDiv.style.borderRadius = "3px";
    petNameDiv.style.position = "absolute";
    petNameDiv.style.transform = "translate(-50%, -50%)";
    newPetContainer.appendChild(petNameDiv);
  }

  // Add assets in orbit, with animation
  orbitAssetImgs = [];
  if (data.assets && data.assets.length > 0) {
    data.assets.forEach((asset) => {
      const assetImg = document.createElement("img");
      assetImg.src = asset.url;
      assetImg.alt = asset.name;
      assetImg.style.width = "25px";
      assetImg.style.height = "25px";
      assetImg.style.objectFit = "contain";
      assetImg.style.position = "absolute";
      assetImg.style.transition = "left 0.2s linear, top 0.2s linear";
      assetImg.style.transform = "translate(-50%, -50%)";
      newPetContainer.appendChild(assetImg);
      orbitAssetImgs.push(assetImg);
    });
  }

  document.body.appendChild(newPetContainer);
  petContainer = newPetContainer;

  // (Re-)Start orbit animation if assets exist
  if (orbitAssetImgs.length > 0) {
    orbitAngle = 0;
    if (orbitFrame) cancelAnimationFrame(orbitFrame);
    animateOrbit();
  }
}

// --------- PET CONTAINER POSITION ---------

function updatePetPosition(event: MouseEvent) {
  if (petContainer && isVisible) {
    const offsetX = 15;
    const offsetY = 15;
    petContainer.style.left = `${event.clientX + offsetX}px`;
    petContainer.style.top = `${event.clientY + offsetY}px`;
  }
}

// --------- STORAGE CHANGES ---------

function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
) {
  if (areaName === "local" && changes.petData) {
    currentPetData = changes.petData.newValue as PetData | null;
    if (isVisible) createPetElements();
    else if (!currentPetData && petContainer) {
      removePetContainer();
    }
  }
  if (areaName === "local" && changes.suiAddress) {
    suiAddress = changes.suiAddress.newValue as string | null;
    console.log(
      "Content Script: Sui address updated from storage.",
      suiAddress
    );
    if (!currentPetData && suiAddress) {
      chrome.runtime.sendMessage(
        { type: "GET_PET_DATA" } as ExtensionMessage,
        (response) => {
          if (
            response &&
            response.status === "success" &&
            response.payload.petData
          ) {
            currentPetData = response.payload.petData as PetData;
            if (isVisible) createPetElements();
          }
        }
      );
    }
  }
}

// --------- VISIBILITY TOGGLE ---------

function handleVisibilityToggle() {
  isVisible = !isVisible;
  if (petContainer) {
    petContainer.style.opacity = isVisible ? "1" : "0";
  }
  if (isVisible && !petContainer && currentPetData) {
    createPetElements();
  }
  chrome.storage.local.set({ petCompanionVisible: isVisible });
  console.log(`Pet companion visibility toggled: ${isVisible ? "ON" : "OFF"}`);
}

// --------- LISTENERS & INIT ---------

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === "PET_DATA_UPDATED") {
      currentPetData = message.payload as PetData;
      console.log("Content Script: Received PET_DATA_UPDATED", currentPetData);
      if (isVisible) createPetElements();
      sendResponse({ status: "success" });
    } else if (message.type === "PET_DATA_ERROR") {
      console.error("Content Script: Received PET_DATA_ERROR", message.payload);
      currentPetData = null;
      removePetContainer();
      sendResponse({ status: "error_received" });
    } else if (message.type === "TOGGLE_VISIBILITY") {
      handleVisibilityToggle();
      sendResponse({ status: "visibility_toggled", isVisible });
    }
    return true;
  }
);

// Initial data load attempt
function initialize() {
  chrome.storage.local.get(
    ["petData", "suiAddress", "petCompanionVisible"],
    (result) => {
      if (result.suiAddress) {
        suiAddress = result.suiAddress;
      }
      if (result.petData) {
        currentPetData = result.petData as PetData;
      }
      if (typeof result.petCompanionVisible === "boolean") {
        isVisible = result.petCompanionVisible;
      }

      if (currentPetData && isVisible) {
        createPetElements();
      } else if (suiAddress && !currentPetData) {
        console.log(
          "Content Script: Found address, no pet data. Requesting from background."
        );
        chrome.runtime.sendMessage(
          { type: "GET_PET_DATA" } as ExtensionMessage,
          (response) => {
            if (
              response &&
              response.status === "success" &&
              response.payload.petData
            ) {
              currentPetData = response.payload.petData as PetData;
              if (isVisible) createPetElements();
            } else if (response && response.status === "pending") {
              console.log(
                "Content Script: Pet data fetch is pending or address exists but no data yet."
              );
            }
          }
        );
      }

      document.addEventListener("mousemove", updatePetPosition);
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
  );
}

// Only run in top window (not in iframes)
if (window.self === window.top) {
  initialize();
} else {
  console.log("Tomodachi Pets Content Script: Running in an iframe, aborting.");
}

// Hotkey to toggle visibility (Ctrl+Shift+P)
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === "P") {
    event.preventDefault();
    handleVisibilityToggle();
  }
});
