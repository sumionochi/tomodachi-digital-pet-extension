import {
  PetData,
  ExtensionMessage,
  OrbitAssetConfig,
  Asset,
} from "../common/types";

console.log("Tomodachi Pets Content Script Injected!");

// Globals
let petContainer: HTMLDivElement | null = null;
let currentPetData: PetData | null = null;
let suiAddress: string | null = null;
let isVisible = true;

let userOrbitConfig: OrbitAssetConfig[] = [];
let currentOrbitIndex = 0;
let assetDisplayTimeout: number | undefined = undefined;
let animatedAssetInterval: number | undefined = undefined;

function removePetContainer() {
  if (petContainer) {
    petContainer.remove();
    petContainer = null;
  }
  stopAllOrbitTimers();
}

function stopAllOrbitTimers() {
  if (animatedAssetInterval) clearInterval(animatedAssetInterval);
  animatedAssetInterval = undefined;
  if (assetDisplayTimeout) clearTimeout(assetDisplayTimeout);
  assetDisplayTimeout = undefined;
}

function startOrbitCycle() {
  if (!petContainer || !currentPetData || !userOrbitConfig.length) return;
  currentOrbitIndex = 0;
  showOrbitAsset(userOrbitConfig[currentOrbitIndex]);
}

function showOrbitAsset(config: OrbitAssetConfig) {
  stopAllOrbitTimers();

  // Remove previous asset images/canvases from petContainer except pet image/name
  if (petContainer) {
    Array.from(petContainer.querySelectorAll(".orbit-asset")).forEach((node) =>
      node.remove()
    );
  }

  // Find asset object
  const asset: Asset | undefined = currentPetData?.assets.find(
    (a) => a.id === config.id
  );
  if (!asset) return;

  if (config.mode === "static") {
    const img = document.createElement("img");
    img.src = asset.url;
    img.className = "orbit-asset";
    img.style.width = "40px";
    img.style.height = "40px";
    img.style.position = "absolute";
    img.style.transform = "translate(-50%, -50%)";
    petContainer?.appendChild(img);
    placeOrbitAssets([img]);
  } else if (
    config.mode === "animated" &&
    config.frameCount &&
    config.frameSize
  ) {
    // Sprite sheet animation
    const canvas = document.createElement("canvas");
    canvas.width = config.frameSize;
    canvas.height = config.frameSize;
    canvas.className = "orbit-asset";
    canvas.style.width = "40px";
    canvas.style.height = "40px";
    canvas.style.position = "absolute";
    canvas.style.transform = "translate(-50%, -50%)";
    petContainer?.appendChild(canvas);

    const spriteImg = new window.Image();
    spriteImg.src = asset.url;
    spriteImg.onload = () => {
      let frame = 0;
      animatedAssetInterval = window.setInterval(() => {
        drawSpriteFrame(spriteImg, canvas, frame, config);
        frame = (frame + 1) % config.frameCount!;
      }, 1000 / (config.frameRate || 4));
    };
    placeOrbitAssets([canvas]);
  }

  assetDisplayTimeout = window.setTimeout(() => {
    currentOrbitIndex = (currentOrbitIndex + 1) % userOrbitConfig.length;
    showOrbitAsset(userOrbitConfig[currentOrbitIndex]);
  }, config.duration * 1000);
}

function drawSpriteFrame(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  frame: number,
  config: OrbitAssetConfig
) {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, config.frameSize!, config.frameSize!);
  // 2x2 grid (frameCount = 4)
  const fx = (frame % 2) * config.frameSize!;
  const fy = Math.floor(frame / 2) * config.frameSize!;
  ctx.drawImage(
    img,
    fx,
    fy,
    config.frameSize!,
    config.frameSize!,
    0,
    0,
    config.frameSize!,
    config.frameSize!
  );
}

function placeOrbitAssets(elems: HTMLElement[]) {
  // Only one orbit asset shown at a time; always center to pet image/name
  elems.forEach((elem) => {
    elem.style.left = "70px"; // adjust offset as you like
    elem.style.top = "0px";
  });
}

function createPetElements() {
  removePetContainer();

  if (!currentPetData) return;

  const data = currentPetData;
  const newPetContainer = document.createElement("div");
  newPetContainer.id = "tomodachi-pet-container";
  newPetContainer.style.position = "fixed";
  newPetContainer.style.zIndex = "99999999";
  newPetContainer.style.pointerEvents = "none";
  newPetContainer.style.transition = "opacity 0.3s ease-in-out";
  newPetContainer.style.opacity = isVisible ? "1" : "0";

  let petImageSrc = data.pet.imageUrl;
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

  document.body.appendChild(newPetContainer);
  petContainer = newPetContainer;

  // Start orbit cycle with selected assets
  if (userOrbitConfig.length > 0) {
    startOrbitCycle();
  }
}

// --- Event Handling and Initialization ---

function updatePetPosition(event: MouseEvent) {
  if (petContainer && isVisible) {
    const offsetX = 15;
    const offsetY = 15;
    petContainer.style.left = `${event.clientX + offsetX}px`;
    petContainer.style.top = `${event.clientY + offsetY}px`;
  }
}

function handleStorageChange(
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
) {
  let reloadOrbit = false;
  if (areaName === "local" && changes.petData) {
    currentPetData = changes.petData.newValue as PetData | null;
    reloadOrbit = true;
  }
  if (areaName === "local" && changes.orbitAssetConfig) {
    userOrbitConfig = changes.orbitAssetConfig.newValue || [];
    reloadOrbit = true;
  }
  if (areaName === "local" && changes.suiAddress) {
    suiAddress = changes.suiAddress.newValue as string | null;
  }
  if (reloadOrbit) {
    if (isVisible && currentPetData) {
      createPetElements();
    } else if (!currentPetData && petContainer) {
      removePetContainer();
    }
  }
}

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

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === "PET_DATA_UPDATED") {
      currentPetData = message.payload as PetData;
      if (isVisible) createPetElements();
      sendResponse({ status: "success" });
    } else if (message.type === "PET_DATA_ERROR") {
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

function initialize() {
  chrome.storage.local.get(
    ["petData", "suiAddress", "petCompanionVisible", "orbitAssetConfig"],
    (result) => {
      if (result.suiAddress) suiAddress = result.suiAddress;
      if (result.petData) currentPetData = result.petData as PetData;
      if (typeof result.petCompanionVisible === "boolean")
        isVisible = result.petCompanionVisible;
      if (result.orbitAssetConfig)
        userOrbitConfig = result.orbitAssetConfig as OrbitAssetConfig[];
      if (currentPetData && isVisible) {
        createPetElements();
      }
      document.addEventListener("mousemove", updatePetPosition);
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
  );
}

// Only run in top window (not in iframes)
if (window.self === window.top) {
  initialize();
}

// Hotkey to toggle visibility (Ctrl+Shift+P)
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === "P") {
    event.preventDefault();
    handleVisibilityToggle();
  }
});
