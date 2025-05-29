# Tomodachi Pets Cursor Companion – Browser Extension

| Resource          | Link                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Main Web App      | [Tomodachi Digital Pet](https://github.com/sumionochi/tomodachi-digital-pet)                     |
| Browser Extension | [Tomodachi Digital Pet Extension](https://github.com/sumionochi/tomodachi-digital-pet-extension) |
| Documentation     | [Tomodachi Pets Documentation](https://github.com/sumionochi/tomodachi-pets-documentation)       |
| Demo Video        | [Demo Video on YouTube](https://www.youtube.com/watch?v=E1rkjZkNquI)                             |

## Project Overview

Tomodachi Pets is an interactive NFT pet platform on the Sui blockchain. This browser extension, **Tomodachi Pets Cursor Companion**, brings your on-chain pet to life across the web. Once installed, it displays your **Tomodachi Pet NFT** (and its equipped accessory NFTs) as a cute, animated companion that **follows your cursor on every website**. The extension is a companion to the main Tomodachi Pets dApp – while the web app is where you **mint** pets and accessories and equip them on-chain, the extension lets you **carry your pet with you** outside the app, overlaying it on any webpage you visit.

![Static to dynamic (1)](https://github.com/user-attachments/assets/65861899-04ca-4d68-98db-1701a3f249a5)

This project was created for the SuiOverflow Hackathon 2025 (Entertainment & Culture track) to showcase a fun, accessible use of **on-chain composability and NFTs**. It leverages **Sui’s object-centric design** (each pet and accessory is an on-chain object) and decentralized storage for assets, demonstrating how **blockchain-backed game assets** can have life outside the core application. Non-technical users see a playful pet following their cursor, while under the hood the extension pulls real on-chain data to render the correct pet visuals and accessories. In summary, Tomodachi Pets Cursor Companion merges a **delightful user experience** with a robust blockchain integration, making on-chain digital pets feel alive and omnipresent.

## Core Features

![img3](https://github.com/user-attachments/assets/98585c25-f3b6-4f66-9c7b-2efe03378c6b)

* **Live Pet & Accessory Display:** The extension fetches your chosen pet’s image and its equipped accessory images from the **Sui blockchain** and displays them on every webpage you browse. Your pet literally “follows” your cursor everywhere, thanks to a content script that attaches a floating pet image to the page and updates its position on mouse movements. This ensures a consistent, personalized companion across all sites (e.g., reading articles, browsing social media).

* **On-Chain Driven Customization:** The pet and its accessories shown are **based on on-chain data** – if you equip a new accessory in the Tomodachi Pets dApp, the extension (after a refresh) will reflect that change. The extension queries the Sui blockchain (via a local API) to get the **latest NFT state** for your pet: which accessory objects are currently attached, their image URLs, names, etc. This means the visuals are always up-to-date with the on-chain state, demonstrating Sui’s dynamic field functionality for composable NFTs.

* **Cursor-Following Animation:** The pet doesn’t just sit static on the page – it actively **follows your cursor**. As you move your mouse, the content script smoothly updates the pet’s position so it keeps up with you. Accessories can orbit around the pet image, one after another, creating a lively animation of items circling or appearing near the pet. The extension uses simple physics (offset positioning and timing loops) to achieve a playful orbiting effect.

* **Accessory Toggling & Modes:** Through the popup UI, you can select which accessories (from those your pet has equipped on-chain) you want to display. Each accessory can be **toggled** on or off, so you control what orbits around your pet. Furthermore, for each selected accessory you can switch between **display modes** – “static” (show the plain image) or “animated” (treat the image as a sprite sheet to animate it). If an accessory’s image is a sprite sheet with multiple frames, choosing *Animated* lets you specify frame size, count, and frame rate to see a moving animation. You can also set the **orbit duration** per item, i.e. how long each accessory remains visible before the next one in the cycle appears.

* **Popup UI for Configuration:** Clicking the extension’s icon opens a React-based **Popup interface** where you configure everything. In the popup, you enter your Sui **wallet address**, and the extension will list all your pet NFTs (fetched via the Sui RPC). You then **select which pet** you want as your companion, and the UI will display that pet’s name, image, and its equipped accessories (with checkboxes to include/exclude each). From this popup, you can save your preferences, refresh the data, or hide/show the pet. The popup thus serves as the control panel for your on-chain pet companion.

* **Quick Hide/Show Toggle:** The user can instantly hide or summon the pet overlay without disabling the extension. A **hotkey** (Ctrl+Shift+P by default) is registered to toggle the pet’s visibility. Additionally, the popup includes a “Hide Pet Cursor” / “Show Pet Cursor” button to control visibility. This is useful if you need the pet out of the way temporarily or if you only want it at certain times. The visibility preference is remembered (stored) so the pet stays hidden or visible across pages and browser sessions until toggled back.

## Tech Stack

This Chrome extension is built with a modern web tech stack to seamlessly integrate blockchain data with browser UI:

* **Chrome Extension Manifest V3:** Uses the latest extension format (MV3) with a service worker background script. The manifest defines the extension’s permissions (local storage, activeTab, alarms) and integrates the popup, content script, and background. Key settings include the content script running on all pages and the extension’s ability to communicate with a local backend on `http://localhost:3001`.

* **React + TypeScript Frontend:** The extension’s UI components (especially the popup) are built with **React** and TypeScript, providing a robust, type-safe structure. The popup is essentially a small React app bundled into the extension. The content script and background script are also written in TypeScript, benefiting from type definitions (including Chrome’s extension API types) for reliability. This choice speeds development and ensures fewer runtime errors in complex state handling (like syncing pet data).

* **Local Node.js Backend with Sui SDK:** To avoid exposing Sui RPC calls directly in the extension, we include a lightweight **Express.js server** (Node.js) that runs on the user’s machine (or could be hosted) as an API for on-chain queries. This backend uses Mysten Labs’ **Sui JavaScript SDK (`@mysten/sui.js`)** to fetch objects from the Sui blockchain. By offloading blockchain queries to a Node process, the extension circumvents any browser CORS issues and keeps sensitive RPC logic out of the content script. The backend exposes simple HTTP endpoints (e.g. `/api/user-pet`, `/api/user-pet-list`) that the extension calls to get pet and asset data.

* **Webpack Module Bundler:** We use **Webpack** to bundle the extension code into distributable scripts. There are three main entry points – one for the popup React app (`popup.tsx`), one for the content script (`content.ts`), and one for the background script (`background.ts`). Webpack outputs these as `dist/popup.js`, `dist/content.js`, and `dist/background.js` along with the HTML for the popup and any CSS. This setup ensures the extension is packaged correctly with all dependencies and can be easily built for production or watched in development mode. Webpack’s Copy plugin also brings in static assets like the extension’s icon images and manifest to the build output.

* **Sui Blockchain & Storage:** The extension doesn’t modify on-chain data, but it interacts with the **Sui blockchain** by reading data. It relies on the Tomodachi Pets Move contract on Sui (deployed separately) for the Pet and Asset objects. Images for pets and accessories are stored on **Walrus (a decentralized storage)** and referenced by URLs in the on-chain object data. The extension, via the Sui SDK, retrieves these URLs from the object fields and then the content script simply sets them as image sources, meaning the actual image files are loaded from the decentralized storage links. This design showcases how web frontends can directly leverage on-chain metadata (in this case, image URIs) for a decentralized user experience.

## File Structure & Key Components

Below is the repository structure of the **tomodachi-digital-pet-extension**, with key files and directories:

```
tomodachi-digital-pet-extension/
├── src/
│   ├── popup/                    
│   │   ├── Popup.tsx            # React popup UI (wallet address input, pet & asset selection)
│   │   ├── popup.html           # HTML for the extension popup (loaded in the browser action)
│   │   └── popup.css            # CSS styles for the popup UI
│   ├── background/
│   │   └── background.ts        # Background script (service worker): handles messages, fetches pet data via backend API
│   ├── content/
│   │   ├── content.ts           # Content script: injects pet overlay into pages, handles cursor tracking & animations
│   │   └── content.css          # (Optional) Styles for pet overlay (e.g., if any custom page styling needed)
│   ├── common/
│   │   └── types.ts             # Shared type definitions (Pet, Asset, PetData, message formats, orbit config)
│   └── (other supporting files or directories if any)
├── backend/
│   ├── server.js                # Local Express server: queries Sui RPC for pet/assets data using Sui SDK
│   ├── package.json             # Backend’s dependencies (@mysten/sui.js, express, cors, dotenv)
│   └── package-lock.json
├── icons/                       # Icons for the extension (16x16, 48x48, 128x128 PNGs)
├── manifest.json                # Chrome extension manifest (defines permissions, content scripts, background, etc.)
├── webpack.config.js            # Build configuration for bundling the extension scripts
├── package.json                 # Extension’s dependencies (React, TypeScript, Webpack, etc.)
└── package-lock.json
```



**Popup (UI Panel)** – **`src/popup/Popup.tsx`** is the heart of the extension’s popup. It’s a React component that renders the form and interactive elements when you click the extension icon. The popup allows the user to input their **Sui address** and then loads the list of pets owned by that address (via a backend API call). It uses Chrome’s storage API to remember selections. When the user hits “Save & Fetch,” the popup sends a message to the background script with the selected address and pet ID. The UI then shows a loading state and waits for a response. The popup displays the **pet’s image and name**, and a list of accessories with checkboxes. Users can toggle which assets to orbit, switch between static/animated modes, and set durations. Changes update immediately in Chrome storage so the content script reflects them. The popup also has a **refresh** button to manually re-fetch on-chain data and a **show/hide toggle** to control visibility. Essentially, the popup is the user’s control panel, bridging user input to extension actions.

**Background Script** – **`src/background/background.ts`** runs as a service worker (persisting as long as Chrome needs it). It acts as a middleman between the popup, content script, and backend. The background listens for messages from the popup (using `chrome.runtime.onMessage`) and responds to specific message types. For example, on a `"SAVE_ADDRESS_AND_FETCH"` message (triggered by the popup), the background will save the Sui address and pet ID to local storage, then call the backend API to fetch the pet data. The backend returns the pet’s info and accessories, which the background then **stores** (in `chrome.storage.local`) and broadcasts to other parts of the extension. The background script sends a `"PET_DATA_UPDATED"` message to inform the popup or content script that new data is available. It also handles a `"FETCH_PET_DATA"` message for refresh requests and a `"GET_PET_DATA"` query from content scripts on startup. In addition, the background script persists state: for instance, it can listen to Chrome’s `onStartup` event and auto-refresh pet data if an address was already saved. In summary, the background script **encapsulates all logic that needs to run behind the scenes**, including data fetching, caching, and messaging between the UI and the content script.

**Content Script** – **`src/content/content.ts`** is injected into every webpage (as defined in `manifest.json`). This script is responsible for **rendering the pet on the page** and handling live interactions like cursor tracking. When a page loads, the content script initializes by reading from Chrome storage to see if a pet has been selected and if so, it immediately creates the pet overlay on the page. The overlay is a fixed-position `<div>` that contains an `<img>` for the pet (or the pet’s name if no image). The script styles this container to be click-through (pointer-events none) and high z-index so it floats above page content without interfering. It then attaches event listeners for mouse movements – on each `mousemove`, it updates the pet container’s `left` and `top` CSS to follow the cursor with a slight offset. The content script also listens for changes in Chrome storage (or incoming messages) to update the pet data or visibility on the fly. When new pet data arrives (e.g., user switched pets or fetched new accessories), the script rebuilds the pet overlay: it loads the pet’s image and any selected asset images, and starts/stops the orbit animations accordingly. The content logic controls the **orbit cycling** of accessories: it will show one accessory at a time (if multiple are selected), either as a static image or by animating a sprite sheet on a canvas, then after a configured duration move to the next asset. This creates the illusion of items orbiting around the pet. The content script also implements the **visibility toggle** – if the user presses the hotkey or toggles via popup, the script will either hide (fade out) or show the pet container accordingly. Importantly, all these behaviors run in the context of each page you visit, but the script ensures it only runs in the top window (not in iframes) to avoid duplicates. The result is a seamless overlay of your pet on every site, smoothly animated and responsive to user input.

**Local Backend Server** – **`backend/server.js`** is a Node.js Express application that the extension calls for on-chain data. This server connects to the Sui blockchain via the official **Sui SDK**. It exposes two main GET endpoints: `/api/user-pet-list` (which takes a Sui address and returns a list of the user’s pet NFTs), and `/api/user-pet` (which takes a Sui address and a specific Pet ID and returns that pet’s details plus its equipped assets). The server uses the Sui SDK’s `getOwnedObjects` to fetch all objects of type `Pet` owned by the address. These Pet objects include fields like name and possibly an image URL (stored in the object’s display or fields) which the server passes along. To get a pet’s equipped accessories, the server uses Sui’s **dynamic fields** feature: it calls `getDynamicFields` on the Pet object to get all children objects and filters those of type `Asset` (the accessory NFTs). It then takes each asset ID and calls `getObject` to fetch its content, including the stored image URL, name, description, etc.. The backend assembles a JSON response containing the pet (id, name, image URL) and an array of its equipped assets (with their image URLs and other metadata). This JSON is what the background script receives and caches. The backend is kept simple on purpose: it has no database or authentication (beyond requiring the correct address/Pet ID parameters), and it trusts the Sui blockchain as the source of truth. Running this as a local service avoids any browser CORS issues and allows using the full Sui client capabilities. The extension expects the backend at `localhost:3001` by default (the user could run it locally during development or it could be deployed behind a URL). Overall, this component bridges the gap between the **decentralized Sui data** and the extension’s front-end, translating on-chain objects into web-friendly JSON that drives the pet companion.

## System Architecture

&#x20;*System architecture diagram: the extension’s components and how they interact with the local backend and Sui blockchain.* In this architecture, the **Browser Extension** (running in the user’s browser) consists of three parts – the Popup UI, the Background script, and the Content script – while the **Local Backend** is an external Node.js service. When the user selects a pet in the popup, the extension’s background script communicates with the local Express server (backend), which in turn queries the Sui blockchain for the pet and accessory objects. The resulting data (pet image URL, asset URLs, etc.) is sent back to the background, which then makes it available to the content script. The content script uses that data to render the pet and assets on the webpage DOM. This flow is illustrated in the diagram above:

* **Popup UI (Extension)** – The React-based popup is the only part of the extension with direct user interaction. It sends user selections (like chosen pet ID) to the background script via Chrome messaging.

* **Background Script (Extension)** – Acts as a controller and data broker. It receives messages from the popup (or content script), triggers data fetches, and stores the results. Think of it as the extension’s “brain” running in the background. It can also push updates to the content script (via messaging or by updating Chrome’s local storage that the content script listens to).

* **Content Script (Extension)** – Injected into web pages, it is responsible for the visual aspect (displaying the pet). It cannot directly call the backend or use privileged extension APIs (due to content script limitations), so it relies on data provided by the background (via storage or messaging). It reacts to stored data changes or messages (like “pet data updated”) by updating the DOM elements on the page.

* **Local Backend (Node.js Server)** – Runs on `localhost:3001`. This server has access to the internet and can communicate with Sui fullnode RPC endpoints. The extension (background script) makes HTTP requests to this backend (e.g., fetch pet data). The backend uses the Sui SDK to retrieve on-chain information and returns it over HTTP as JSON.

* **Sui Blockchain** – The source of truth for pet and accessory data. The backend queries a Sui RPC node for the user’s Pet NFT object and any linked Asset NFT objects. The blockchain holds the structured data (e.g., each Asset’s image URL, stored in its fields or display data, which points to an image on decentralized storage). No private keys or transactions are needed for the extension’s queries – it’s all read-only data fetching.

This design cleanly separates concerns: **on-chain data retrieval** is handled off-page in the backend, **data orchestration** is in the background script, and the **UI rendering** is in the content script (for on-page visuals) and popup (for configuration). By using Chrome’s messaging and storage APIs, these components stay loosely coupled but coordinated. For example, if the user navigates to a new page, the content script on that page will immediately check if pet data is already stored (from a previous fetch) and if so, it will render the pet without needing to ask the blockchain again – providing a fast, seamless experience.

## Sequence Diagrams

![img2](https://github.com/user-attachments/assets/42d69569-d983-4e46-88bc-dc6aa27d4232)

To further illustrate the runtime behavior, here are two key sequences in the extension’s operation:

### 1. Pet Selection & Data Fetch Sequence

When the user selects a pet in the popup and clicks “Save & Fetch,” a series of steps occur to fetch and display the pet data:

1. **User action (Popup):** The user enters their Sui address (if not already stored), selects one of their pets from the dropdown, and clicks **Save & Fetch** in the popup UI.

2. **Background fetch trigger:** The popup sends a message of type `"SAVE_ADDRESS_AND_FETCH"` to the background script, including the Sui address and selected Pet ID. The background receives this and immediately stores the address/pet in Chrome’s storage (so it’s remembered) and initiates a fetch.

3. **Backend API call:** The background script makes an HTTP request to the local backend’s `/api/user-pet` endpoint, passing the user’s address and Pet ID as query parameters. (If the backend isn’t running or returns an error, the background will catch that and notify the popup with an error message.)

4. **On-chain data retrieval (Backend):** The Node backend receives the request and uses the Sui SDK to look up the specified Pet object on-chain (and its equipped Assets). It first ensures the address owns that pet, then retrieves the pet’s details and dynamic field entries for assets. For each equipped asset, it fetches the asset’s metadata (including image URL). The backend then returns a JSON payload containing the pet info and a list of asset info.

5. **Background receives data:** The background script gets the JSON response from the backend. If successful, it stores the Pet data in `chrome.storage.local` and dispatches a `"PET_DATA_UPDATED"` runtime message so any listening parts of the extension know new data is available. The background sendResponse back to the popup to indicate success (unblocking the UI loading state).

6. **Content script updates page:** Upon data update, the content script (which has been listening for storage changes) sees that `petData` in storage has been set/changed. If the content script is already active on some open pages, it will react by constructing the pet overlay with the new pet image and assets. If no content script was active (e.g., no pages open), the data just sits in storage until a content script queries it. The user will typically have at least the current page (where they opened the popup) – on that page the pet now appears or changes to the newly selected one. The popup also updates its UI to show the pet’s image, name, and assets list. From this point on, the pet is “live” and following the cursor on every open page.

This whole sequence, from button click to pet showing up, usually completes in a fraction of a second (depending on RPC latency). The design ensures that **once data is fetched, it’s cached** – so switching tabs or opening new pages doesn’t require fetching again; the content script will use the cached data via a `"GET_PET_DATA"` message or storage read on initialization.

### 2. Cursor Tracking & Pet Movement

![img1](https://github.com/user-attachments/assets/72b8fe8c-86ec-42b5-9058-ed086d8192e7)

Once the pet companion is displayed, it continuously tracks the user’s cursor to stay by their side:

* When a new page loads (with an active pet), the content script creates the pet’s HTML element and positions it at an initial default spot (e.g., top-left until the first mouse move). It attaches an event listener to the document for `mousemove` events.

* As the user moves the mouse, the **`mousemove` listener fires very frequently**. The handler function (`updatePetPosition`) computes a position for the pet element relative to the cursor’s coordinates. In our case, it offsets the pet by some pixels (e.g., 30px down and to the right) so that the pet image isn’t directly under the cursor but near it (this prevents the pet from ever obscuring what you’re clicking on). The content script directly sets the pet container’s CSS `left` and `top` style to the new position on each event. This happens quickly and smoothly thanks to the browser’s event loop, giving the appearance that the pet is following your cursor in real time.

* The content script also uses a CSS transition on the pet container’s `opacity` (fade in/out) and possibly position smoothing for a nicer effect. If the pet is visible (`isVisible=true`), it will fully opacity 1; if the user hides it, the script sets the container’s opacity to 0 (fading it out). During hidden state, `mousemove` might still update the element’s position, but since it’s transparent, the user won’t see it.

* If the user presses the **Ctrl+Shift+P hotkey**, the content script intercepts that key combo (via `keydown` event). It prevents the default, flips the visibility state (`isVisible`), and updates Chrome storage accordingly (so the popup and background know the new state too). The toggle causes the pet to either fade out or fade in. This mechanism works globally – no matter which tab is active, the content script there will respond to the hotkey and hide/show the pet.

* Through all of this, the pet element remains non-interactive (`pointer-events: none`), so it never blocks clicks or hovers on the underlying webpage. This is important for usability: you can click links and buttons on websites normally, even if your pet is hovering over that area, because the clicks pass through the pet overlay.

In effect, the cursor tracking sequence is a tight loop between **browser events and DOM updates**. It does not require further communication with the background or backend after the initial data is loaded. This makes the pet movement and animation feel instantaneous and fluid, as it should for a purely client-side animation.

## Code Flowcharts

To dive a bit deeper, we provide two flowcharts of critical code paths in the extension: (a) how the extension fetches on-chain data (resolving the pet and its accessories), and (b) how the content script renders images and handles animation for orbiting assets.

### On-Chain Pet Data Retrieval Flow

When fetching a pet’s data from the Sui blockchain, the backend follows this process:

&#x20;*Flowchart: Backend (Node.js) sequence for querying the Sui blockchain to get a Pet’s data and its equipped Asset data.* Starting with the user’s Sui **Address** and chosen **Pet ID**, the backend performs the following steps: **(1)** Use the Sui client to query all **Pet NFT objects owned by the address** (this returns basic info on each pet). **(2)** Identify the specific **Pet object** matching the Pet ID (the user’s chosen pet). **(3)** Query Sui for the pet’s **dynamic fields**, which list any child objects – in this case, the equipped **Asset NFT IDs** attached to the pet. Each dynamic field entry that matches the Asset type yields an object ID for an accessory currently equipped on the pet. **(4)** For each such Asset ID, fetch the **Asset object** from Sui using `getObject` (with options to show content and display data). **(5)** As each Asset object is retrieved, extract its relevant metadata: typically an image URL (either from the object’s `url` field or the display data’s `image_url`), the asset’s name, description, any frame info (if it’s animated), etc. **(6)** Compile the results into a consolidated **PetData** structure containing the Pet (id, name, image URL) and an array of its equipped Asset info. **(7)** Return this as the response to the extension. If any step fails (e.g., RPC error or no pet found), an error is returned instead. This flow leverages Sui’s object-centric model: the Pet owns Assets as dynamic children, so no separate indexing is needed to find which accessories belong to a pet – it’s an on-chain relationship. The extension simply navigates this relationship to pull the necessary data. By structuring the blockchain queries this way, we ensure the extension always displays exactly what’s on-chain (no guessing or off-chain lists required).

### Asset Rendering & Animation Flow

On the front-end side, once the pet and its asset data are loaded, the content script manages how to display each asset around the pet. The logic can be summarized as:

&#x20;*Flowchart: Content script logic for displaying an orbiting asset, covering both static images and animated sprites.* The process begins when the content script decides to show an accessory (either on initial load or when cycling to the next item in orbit). **(1)** It picks the next asset from the user’s selected orbit list and starts the orbit cycle for that asset. **(2)** The script checks the chosen **display mode** for that asset – whether the user wanted it static or animated. This is a simple conditional: if *Static*, go one way; if *Animated*, go the other. **(3A) Static mode:** The script creates an `<img>` element, sets its `src` to the asset’s image URL, and applies CSS styles (size, position, etc.) to center it on the pet container. No further processing is needed for static images. **(3B) Animated mode:** The script will create a `<canvas>` element instead, and also create a JavaScript `Image` object. It sets the image source to the asset’s sprite sheet URL (which is stored in the asset data). It knows or assumes the sprite sheet dimensions from either metadata or user input (frame count, frame size provided in the popup config). The script waits for the image to load fully. **(4)** Once the sprite sheet image is loaded into memory, the script starts a timed loop (using `setInterval`). On each tick, it uses the canvas 2D context to **draw the next frame** of the sprite sheet onto the canvas element. It cycles through frames at the specified frame rate (for example, 4 frames per second) and loops back after the last frame, creating a simple animation. The canvas element is styled similarly to an img (e.g., 40px size, centered) so it appears in place around the pet. **(5)** After either placing the static image or starting the animated canvas, the content script **appends** that element to the pet’s container DIV in the DOM. The asset now becomes visible on screen, hovering near the pet image. **(6)** The script then sets a timeout for the asset’s duration (as configured by the user, e.g., 5 seconds). When the duration elapses, the script will remove that asset element and move to the next asset in the orbit list. If there are multiple accessories selected, this creates a continuous cycle: each asset shows for X seconds, then the next replaces it, and so on, looping back to the first after the last. If the asset was in animated mode, the script also clears the interval that was driving its frames (to stop the animation and free resources) before showing the next item.

This flow is entirely running in the content script within the browser. It demonstrates an extensible approach: adding new modes (say, an interactive mode) would involve adding another branch in the decision, and the rest of the pipeline (append to DOM, wait, cycle) remains the same. The use of canvases for animation is due to needing fine control over sprite frame drawing – if future assets came as GIFs or video, the approach might simplify to just embedding those elements directly. The current design balances simplicity with flexibility to support custom animations for accessories.

## User Flows

From a user’s perspective, using the Tomodachi Pets extension is straightforward and requires minimal setup:

1. **Installation:** The user installs the Chrome extension (either via the Chrome Web Store or by loading the unpacked extension in developer mode). After installation, the Tomodachi Pets paw icon appears in the browser toolbar. They also need to run or have access to the local backend server (during hackathon demos, this might involve running `backend/server.js` with Node.js on their machine).

2. **Connecting to Pet Data:** The user clicks the extension’s icon to open the popup. In the popup, they enter their **Sui wallet address** (a 0x... string) into the provided field. Upon entering the address, the extension calls the backend to retrieve a list of Pet NFTs owned by that address. The user will see a dropdown of pet names populate. They select the pet they want as their companion from the list.

3. **Choosing Accessories:** After selecting a pet, the popup displays that pet’s information (name, ID, and if available, an image) along with a list of equipped accessories (by name and thumbnail). Each accessory has a checkbox – the user can check or uncheck which ones they want to see orbiting their pet. By default, all currently equipped accessories are listed; the user might choose only some to display. For each checked asset, an expandable panel lets the user choose **Static or Animated** mode and adjust animation parameters like frame count, frame rate, and the display duration. (If the user is non-technical, they can ignore the animation settings, leaving defaults in place.)

4. **Launching the Pet:** The user clicks **“Save & Fetch”**. This triggers the extension to fetch fresh data for that pet (address and pet ID are sent to the backend). The popup indicates a loading state (“Saving…” then “Fetching…”) to the user while the background work happens. Once the data comes back (usually within a second), the popup either shows the pet preview (if successful) or an error message (if something went wrong, like the backend not running). Assuming success, the pet’s image and details are now visible in the popup, confirming it’s loaded. Simultaneously, on the webpages the user has open, the pet overlay appears near their cursor. The user will see their chosen pet graphic following their mouse as they move it, and any orbiting accessory they enabled will start cycling around the pet.

5. **Browsing with the Pet:** The user can now continue normal web browsing with their pet always on-screen. They can open new tabs, navigate to different sites – the content script will inject the pet on each page automatically (using the cached data, so they don’t have to fetch again). The pet does not interfere with page interactions, so everything functions as normal, just with an added companion for fun. If the user opens the main Tomodachi Pets dApp, they would see the same pet there (within the app context), demonstrating the continuity between the dApp and extension.

6. **Toggling Visibility:** At any time, if the user wants to hide the pet (perhaps during a presentation or if it overlaps something important), they can press **Ctrl+Shift+P**. This keystroke toggles a global `petCompanionVisible` flag. If the pet was visible, it instantly fades out; if it was hidden, it fades back in, resuming its position next to the cursor. The user can also toggle visibility via the popup’s button (which reflects the current state as “Hide Pet Cursor” or “Show Pet Cursor”). This gives users quick control if needed.

7. **Updating Data:** If the user makes changes on-chain (for example, using the main app to mint a new accessory or equip/unequip an item), they can update the extension to reflect this. They would open the popup and click **“Refresh”**. The background script will fetch the latest data from Sui. Any changes (new accessory equipped, etc.) will be updated in the popup and the content script will update the visuals accordingly (e.g., a new accessory might start showing up in the orbit rotation).

8. **Uninstalling/Disabling:** If the user disables or removes the extension, the pet overlay and scripts are removed from all pages. There are no lasting effects on the pages since the script only adds a DOM element and cleans up on removal. All on-chain data (the NFTs themselves) remain safely on Sui – the extension is simply a viewer/companion and does not hold custody of any assets (it doesn’t even require the user’s private key or wallet, just a public address to fetch data).

Overall, the user flow is designed to be **simple and intuitive**: enter address → pick pet → enjoy your companion. The extension handles all the heavy lifting of retrieving and syncing on-chain data behind the scenes. Even someone unfamiliar with blockchain can use it as a fun browser pet, while crypto-savvy users will appreciate that the pet and accessories are true NFTs they own.

## Sui Blockchain Integration

One of the most interesting aspects of this project is how it uses the Sui blockchain’s object model to enable dynamic pet customization. Here’s how the integration works under the hood:

* **On-Chain Objects (Move Contracts):** In the Tomodachi Pets Move module, a **Pet** is a struct that likely contains basic info (name, owner, etc.) and uses dynamic fields to reference **Asset** objects that are equipped. An **Asset** is a separate NFT struct (with its own fields like name, image URL, attributes). When a user equips an asset to a pet in the game, the Move contract adds a dynamic field to the Pet object linking the Asset. This means the Pet literally “owns” the Asset on-chain.

* **Dynamic Field Querying:** The extension’s backend takes advantage of Sui’s provided RPC for dynamic fields. Given a Pet’s object ID, we call `suiClient.getDynamicFields({ parentId: petId })` which returns a list of all dynamic field objects under that pet. We filter this list to find entries where the object type matches our `Asset` type (since a pet might have other fields like a score or something, but we only care about assets). Each matching entry yields an **object ID for an equipped Asset NFT**.

* **Resolving Asset Data:** For each asset ID, we use `getObject` to fetch the full object details from the blockchain. The Sui RPC allows us to request the object’s content (fields) and display data. In our case, the Asset’s fields include things like `url` (the image URL), `name`, `description`, maybe `action` and `frames` if it’s an animated asset. The display data often duplicates some info (e.g., an `image_url` in a standard format). The backend constructs a simplified JSON for each asset: an ID, a final image URL (preferring the on-chain field if present, otherwise fallback to display), the asset’s name, description, and any animation-related numbers.

* **Image Storage (Walrus):** The image URLs stored in the Pet/Asset objects point to images in **Walrus** storage (Mysten’s decentralized asset storage solution). These might be HTTP URLs or sui:// URLs that lead to the Walrus network. The extension doesn’t directly interact with Walrus – it simply takes those URLs and uses them as `<img src>` in the browser. Because Walrus is decentralized and publicly accessible, the images load just like any other web resource. This ensures that **all pet and accessory art is decentralized** (the extension isn’t pulling from a centralized server or IPFS gateway; it’s using whatever link the blockchain record provides, which in our design is Walrus). Judges should note that this means the entire asset pipeline is on-chain or decentralized: the extension is effectively a viewer for on-chain data.

* **No Wallet Required (Read-Only):** The extension does not use a Sui wallet or require signing in. The user simply provides a Sui address (public key). All queries are read-only and do not require private keys or signatures. This lowers the barrier to use – any user can watch any address’s pet if they wanted (though normally you’d use your own address to see your pet). If we wanted to integrate wallet directly, we could use Sui Wallet APIs to get the active address instead of manual input, but for hackathon scope we kept it simple. The read-only nature is also safer; there’s no risk of triggering transactions or needing to manage keypairs in the extension.

* **Performance Considerations:** Sui’s object queries are very fast (especially reading from a fullnode). The extension’s backend fetches only the necessary data (one Pet object and a handful of Asset objects). Even if a user has many assets, only the equipped ones are fetched, which is likely a small number (in our game design, a pet might have at most a few accessories equipped). We also retrieve all pets in one go for the dropdown – this is usually a quick query, and results are cached in the backend process for subsequent calls (during the session). The use of a local backend means these calls don’t burden the browser or require large payloads to be sent to the extension; the JSON returned is concise.

* **Synchronizing On-Chain Changes:** If a user equips a new accessory via the main dApp, that change is on-chain. The extension, unless told to refresh, won’t know about it until a new fetch happens. We expose the **Refresh** button to manually re-sync. We could automate this (e.g., poll every X minutes, or use Sui’s event system if available), but in practice a user-initiated refresh was sufficient for the hackathon demo. This is a design choice to reduce unnecessary calls and because real-time syncing wasn’t critical for the experience.

In summary, the extension showcases Sui’s strength in *composability*. The fact we can query a Pet object and directly get references to other objects (Assets) that are attached is powerful. We didn’t need to maintain any off-chain index of which accessories belong to which pet – the blockchain state is the source of truth. The extension’s backend logic cleanly mirrors that on-chain relationship by retrieving dynamic fields and then the objects themselves. This integration could be extended to include other on-chain data (for example, if the pet had stats or a mood, we could fetch those and perhaps reflect it in the pet’s behavior or appearance). The key takeaway is that **Sui’s object-centric data can be consumed directly by web apps**; our extension is a proof of concept of using on-chain game NFTs in a live interactive way.

## Customization & Extensibility

While the current version of the extension fulfills the core purpose, it’s built in a way that developers can extend and customize it further. Here are a few ideas and guidance on how the codebase could be extended:

* **Adding New Animations or Behaviors:** The system is set up to handle two modes (static image or sprite animation) for orbiting assets, but one could imagine new modes. For example, a developer could introduce a mode where an accessory rotates around the pet continuously (rather than one at a time). This could be done by modifying the content script’s orbit logic – instead of cycling assets sequentially, it could position multiple asset elements around the pet and update their positions in a circle on each animation frame. Similarly, one could add an **interactive mode** where clicking the pet triggers a reaction (maybe the pet could jump or change image on click). Since the content script has full access to the DOM, one could capture click events on the pet image and swap it out for a different image (if multiple poses were available) or play a sound. The codebase uses a flexible configuration (`OrbitAssetConfig` for each asset) which can be extended with new fields if needed (e.g., a path type for orbit, or a trigger for interaction).

* **Alternate Display Modes:** Beyond cursor-following, a developer might allow the pet to **dock** to the page in a fixed position. For example, a toggle that switches between “follow cursor” vs “sit in corner”. This can be achieved by altering the `updatePetPosition` logic – if in docked mode, you wouldn’t update on mouse move, but rather set a fixed position (like bottom-right of the screen). The extension could offer this as an option in the popup (“Follow Cursor” on/off). Under the hood, it would simply ignore mouse events and apply a CSS class for a fixed corner position when cursor-follow is off. The current code already encapsulates cursor following in one function, so it’s a matter of gating it with a condition.

* **UI/UX Improvements:** The popup UI could be enhanced to be more visually appealing or user-friendly (e.g., showing thumbnails for pets in the dropdown, or a preview of each asset’s image in the list, which is partially there with the current design). Another possible extension is integrating directly with Sui wallet adapters to get the user’s address automatically (eliminating manual input). The React popup could use `@mysten/wallet-kit` to let the user connect a wallet and select an address, streamlining setup.

* **Direct Blockchain Interaction:** Currently the extension is read-only. One could enable the extension to perform on-chain actions – for example, a “unequip accessory” button next to each asset in the popup that triggers a transaction to unequip it. This would require integrating a wallet for signing or using Sui’s signable messages via the background script. It’s an advanced feature, but feasible: the background script can initiate a connection to a wallet extension or use WalletKit, and then call the Move contract’s unequip function. This would truly blur the line between the web app and extension, allowing users to manage their pet from the extension directly.

* **Performance and Multi-Pet Support:** If a user has multiple pets and wants to swap between them frequently, a developer could implement a quicker pet switch in the popup. For instance, pre-fetch data for all pets on address input (the `/api/user-pet-list` already gives all pet IDs, so one could fetch each pet’s assets in advance). Then switching the dropdown could instantly update the content script without needing a fetch each time. This is a trade-off (more upfront data vs. quick switching) that could be offered as an advanced setting.

* **Cross-Browser Compatibility:** The code is written for Chrome (Manifest V3), but with minor tweaks it could work on other Chromium-based browsers (Edge, Brave) and potentially Firefox (Manifest V3 is largely supported in Firefox now). To extend compatibility, one might need to adjust some manifest keys or API uses (Firefox uses `browser` instead of `chrome` in the extension API, but there’s a polyfill). This could broaden the audience of the extension beyond Chrome users.

* **Theming and Pet Interaction:** Developers can also play with how the pet is displayed. For example, adding **speech bubbles** or reactions – the content script could inject a text bubble element near the pet and display messages (maybe the pet gives tips or fun quotes, possibly triggered by certain keywords on the page or at random intervals). The architecture makes it easy to add more DOM elements tied to the pet container. Similarly, accessories could have special behaviors (e.g., if an accessory is a music note, maybe it bounces in a sine wave pattern instead of static orbit; this could be coded in the showOrbitAsset logic specifically for that asset type).

Given the extension is built with familiar web technologies (React, TypeScript, CSS) and a clear separation of concerns, it’s quite approachable for contributors. The **key patterns (message passing, storage sync, data fetch)** are already in place. A developer looking to extend functionality can focus on the specific area (UI, content script, or backend) without needing to rewrite the whole system. We hope that this hackathon project not only serves as a fun demo but also as a foundation for more **innovative browser-based NFT interactions**, whether in Tomodachi or other projects that bridge web browsing with blockchain-owned digital assets.

# Tomodachi Pets: Setup & Local Development Guide

Tomodachi Pets is a virtual pet platform built on the Sui blockchain, featuring:

* A Next.js dApp for minting AI-generated pets and accessories as NFTs.
* A browser extension that displays your NFT pets on any website using a local backend.

This guide walks you through local installation for both the web app and browser extension.

🚀 Prerequisites

* Node.js (v16+ required, v18+ recommended)
* npm (comes with Node)
* Git
* Google Chrome (for the browser extension)

> Note: The web app runs on port 3000 and the extension backend on 3001 by default—ensure these ports are free, or adjust as needed.

⚙️ Environment Variables
Both projects require a `.env.local` file at the project root.

**Web App (tomodachi-pets) `.env.local`**

```env
# Load environment variables from .env.local
dotenv_config_path=.env.local

# OpenAI API Key (for AI image generation)
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>

# Sui RPC Endpoint (for Walrus client)
SUI_RPC_URL=<YOUR_SUI_RPC_URL>

# Walrus network: testnet or mainnet
WALRUS_NETWORK=<testnet|mainnet>
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=<YOUR_WALRUS_PUBLISHER_URL>
NEXT_PUBLIC_WALRUS_BASE_URL=<YOUR_WALRUS_BASE_URL>
NEXT_PUBLIC_WALRUS_EPOCHS=<EPOCH_NUMBER>

# Signer secret (base64-encoded Ed25519 private key)
SUI_SECRET_KEY=<YOUR_BASE64_ED25519_PRIVATE_KEY>

# On-chain object IDs
NEXT_PUBLIC_PACKAGE_ID=<YOUR_PACKAGE_ID>
NEXT_PUBLIC_SCOREBOARD_ID=<YOUR_SCOREBOARD_ID>
NEXT_PUBLIC_MINT_RECORD_ID=<YOUR_MINT_RECORD_ID>
NEXT_PUBLIC_PET_NAMES_ID=<YOUR_PET_NAMES_ID>
NEXT_PUBLIC_EQUIPPED_ASSETS_ID=<YOUR_EQUIPPED_ASSETS_ID>
NEXT_PUBLIC_LAST_CHECKIN_ID=<YOUR_LAST_CHECKIN_ID>
```

**Extension (tomodachi-pets-extension) `.env.local`**

```env
# Load environment variables from .env.local
dotenv_config_path=.env.local

# OpenAI API Key (for image generation and backend use)
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>

# Sui RPC Endpoint (for Walrus client)
SUI_RPC_URL=<YOUR_SUI_RPC_URL>

# Walrus network: testnet or mainnet
WALRUS_NETWORK=<testnet|mainnet>
WALRUS_PUBLISHER_URL=<YOUR_WALRUS_PUBLISHER_URL>
WALRUS_BASE_URL=<YOUR_WALRUS_BASE_URL>
WALRUS_EPOCHS=<EPOCH_NUMBER>

# Signer secret (base64-encoded Ed25519 private key)
SUI_SECRET_KEY=<YOUR_BASE64_ED25519_PRIVATE_KEY>

# Move contract IDs
PACKAGE_ID=<YOUR_PACKAGE_ID>
SCOREBOARD_ID=<YOUR_SCOREBOARD_ID>
MINT_RECORD_ID=<YOUR_MINT_RECORD_ID>
PET_NAMES_ID=<YOUR_PET_NAMES_ID>
EQUIPPED_ASSETS_ID=<YOUR_EQUIPPED_ASSETS_ID>
LAST_CHECKIN_ID=<YOUR_LAST_CHECKIN_ID>
```

🖥️ Web App Setup (`tomodachi-pets`)

1. **Clone & Install:**

   ```bash
   git clone https://github.com/sumionochi/tomodachi-digital-pet.git tomodachi-pets
   cd tomodachi-pets
   npm install
   ```

2. **Build & Publish Move Modules:**

   ```bash
   cd move
   sui move build
   sui client publish --gas-budget 100000000
   ```

   After publishing, copy the `package_id` and any object IDs printed (e.g., `scoreboard`, `mint_record`, etc.) into your web app `.env.local` under the corresponding `NEXT_PUBLIC_...` fields.

3. **Set Environment Variables:**

   * Place your `.env.local` file (with all `NEXT_PUBLIC_...` placeholders filled) in the project root.

4. **Start the App:**

   ```bash
   npm run dev
   ```

   This runs the Next.js app at [http://localhost:3000](http://localhost:3000).

🧩 Extension Setup (`tomodachi-pets-extension`)

1. **Clone & Install:**

   ```bash
   git clone https://github.com/sumionochi/tomodachi-digital-pet-extension.git tomodachi-pets-extension
   cd tomodachi-pets-extension
   npm install
   ```

2. **Set Environment Variables:**

   * Place your `.env.local` file in the project root.

3. **Build the Extension:**

   ```bash
   npm run build
   ```

   If you don’t have a build script, use:

   ```bash
   npx webpack
   ```

4. **Run the Backend Server:**

   ```bash
   node backend/server.js
   ```

   You should see:

   ```text
   Tomodachi backend listening on port 3001
   Ensure PACKAGE_ID is set. Current: 0xYourPackageID
   Ensure SCOREBOARD_ID is set. Current: 0xYourScoreboardID
   Using SUI_RPC: https://fullnode.testnet.sui.io:443
   ```

5. **Load the Extension in Chrome:**

   * Go to `chrome://extensions`
   * Enable Developer mode
   * Click Load unpacked and select the `tomodachi-pets-extension` folder (it must contain `manifest.json`)
   * The extension icon should appear in Chrome.

📦 Move Contract Build & Publish

Before running the extension backend, build and publish the Move package:

```bash
cd move
sui move build
sui client publish --gas-budget 100000000
```

🕹️ Using Tomodachi Pets

**Web App:**

* Connect your Sui wallet, mint new pets/assets, and manage your collection.

**Browser Extension:**

1. Click the extension icon
2. Enter your Sui wallet address and select your pet/NFT
3. Toggle pet accessories as desired

> Note: The extension’s backend (`server.js`) must be running for the extension to fetch blockchain data.

🗂️ Project Structure & Flow

* **Web App:** Minting/managing pets/assets (on-chain, AI-generated art, wallet auth).
* **Extension:** Reads on-chain pet data and animates your pet on the web, fetching live state from your local backend.

📝 Tips & Troubleshooting

* **Ports:** If 3000/3001 are busy, change them in `.env.local` or with CLI flags.
* **Node Version:** Use Node.js 16 or 18+.
* **Dependencies:** Run npm install in both projects after cloning.
* **Extension Loading:** Always load the root of the extension (where `manifest.json` lives).
* **Chrome DevTools:** Use the console for extension logs or error debugging.

📣 Support

If you encounter issues, check:

* Environment variables: Make sure `.env.local` files are present and correct in each repo.
* Backend server: Ensure `node backend/server.js` is running for the extension.
* Chrome DevTools: Inspect logs for the extension.

For further assistance, open an issue in the respective GitHub repository.
