//page.tsx
"use client"

import { useState, useEffect } from "react"
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  mintAsset,
  createPet,
  checkIn,
  createUser,
  equipAsset,
  unequipAsset,
  adminResetScore,
  LAST_CHECKIN_ID,
  WALRUS_BASE,
} from "@/lib/sui"
import {
  useScoreboard,
  usePets,
  useAssets,
  useEquippedAssets,
  useAdminCap,
} from "@/hooks/gameHooks"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useLastCheckIn } from "@/hooks/gameHooks";

import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { useRef } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea"

const Bars3Icon = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export default function HomePage() {
  const lastCheckInID = LAST_CHECKIN_ID;

  const suiClient = useSuiClient()
  const account = useCurrentAccount()
  const address = account?.address
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const { lastCheckIn, refresh: refreshLastCheckIn } = useLastCheckIn(address, lastCheckInID);
  const [now, setNow] = useState(Date.now() / 1000);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now() / 1000), 60 * 1000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const canCheckIn =
    !lastCheckIn || now - lastCheckIn >= 86400;

  const { score, isRegistered, refresh: refreshScore } = useScoreboard(address)
  const { pets, refresh: refreshPets } = usePets(address)
  const { assets, refresh: refreshAssets } = useAssets(address)
  const { equippedAssets, refresh: refreshEquipped } = useEquippedAssets(address)
  const { isAdmin } = useAdminCap(address)
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [petName, setPetName] = useState("")
  const [mintingAsset, setMintingAsset] = useState(false)
  const [equipping, setEquipping] = useState(false)
  const [selectedPet, setSelectedPet] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [adminUser, setAdminUser] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"home"|"pets"|"assets"|"more">("home")

  const [prompt, setPrompt] = useState<string>('');
  const [generatedB64, setGeneratedB64] = useState<string | null>(null);
  const [metaName, setMetaName] = useState<string>('');
  const [metaDescription, setMetaDescription] = useState<string>('');
  const [metaAttributes, setMetaAttributes] = useState<string>('');
  const [actionValue, setActionValue] = useState<number>(0);
  const [framesValue, setFramesValue] = useState<number>(1);
  const [introOpen, setIntroOpen] = useState(true);
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([])

  const [mode, setMode] = useState<"prompt" | "sketch">("prompt");
  const canvasRef = useRef<ReactSketchCanvasRef>(null);

  const [sizeOption, setSizeOption] = useState<"1024x1024"|"1024x1536"|"1536x1024"|"auto">("1024x1024")
  const [qualityOption, setQualityOption] = useState<"low"|"medium"|"high"|"auto">("auto")
  const [backgroundOption, setBackgroundOption] = useState<"transparent"|"opaque">("transparent")
  const [numImages, setNumImages] = useState(1)
  const [moderationLevel, setModerationLevel] = useState<"auto"|"low">("auto")
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);

  const [selectedPreviews, setSelectedPreviews] = useState<string[]>([]);
  const [maskMode, setMaskMode] = useState(false);
  const maskRef = useRef<ReactSketchCanvasRef>(null);
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [imgSize, setImgSize] = useState<{ width: number; height: number }>(
    sizeOption === "auto"
      ? { width: 1024, height: 1024 }
      : (() => {
          const [w, h] = sizeOption.split("x").map(Number);
          return { width: w, height: h };
        })()
  );

  useEffect(() => {
    if (maskMode) {
      maskRef.current?.eraseMode(true);
    }
  }, [maskMode]);
  
  useEffect(() => {
    if (sizeOption === "auto") return;
    const [w, h] = sizeOption.split("x").map(Number);
    setImgSize({ width: w, height: h });
  }, [sizeOption]);
  
  const queryClient = useQueryClient();

  const TABS: { key: Tab; label: string }[] = [
    { key: "home",  label: "Home" },
    { key: "pets",  label: "Pets" },
    { key: "assets",label: "Assets" },
    { key: "more",  label: "More" },
  ]
  
  type Tab = "home" | "pets" | "assets" | "more"

  useEffect(() => {
    // Refresh data when account changes
    if (address) {
      refreshScore();
      refreshPets();
      refreshAssets();
      refreshEquipped();
    }
  }, [address]);

  // Get the previews from the query cache
  const { data: previews = [] } = useQuery<string[]>({
    queryKey: ["draft_previews"],
    queryFn: () => [],
    staleTime: Infinity,
    enabled: true,
  })

  // Generation mutation to add new previews
  const generateMutation = useMutation<string[], Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/generatePetPreview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          size: sizeOption,
          quality: qualityOption,
          background: backgroundOption,
          n: numImages,
          moderation: moderationLevel,
        }),
      });
      const { urls } = await res.json();
      return urls;
    },
    onSuccess(newUrls) {
      // always add to your draft cache
      queryClient.setQueryData<string[]>(
        ["draft_previews"],
        (old = []) => [...old, ...newUrls]
      );
  
      // **if there’s exactly one** result, auto-select it as your final preview
      if (newUrls.length === 1) {
        setPreviewUrl(newUrls[0]);       // show this straight away
        setSelectedPreviews([]);         // clear any prior multi-select
      }
    },
  });

  // Multi-image refine mutation
  const refineMutation = useMutation<string, Error, { images: string[]; prompt: string }>(
    {
      mutationFn: async ({ images, prompt }) => {
        if (images.length === 0) {
          throw new Error("No previews selected");
        }
        const res = await fetch("/api/editPetPreview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images,               // <-- array of preview URLs / base64 strings
            prompt,               // refinement instructions
            size: sizeOption,
            quality: qualityOption,
            background: backgroundOption,
            moderation: moderationLevel,
          }),
        });
        const { url } = await res.json();
        return url;           // your combined/refined asset URL
      },
      onSuccess: (newUrl) => {
        // Add the new combined asset to your cache
        queryClient.setQueryData<string[]>(
          ["draft_previews"],
          (old = []) => [...old, newUrl]
        );
        // reset selection
        setSelectedPreviews([]);
        // optionally set this as your final preview
        setSelectedPreviews([]);         // clear the array
        setPreviewUrl(newUrl);           // save the combined result
      },
    }
  );

  // Upload sketch mutation
  const uploadSketchMutation = useMutation<string, Error, string>({
    mutationFn: async (b64) => {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ b64 }),
      });
      const { blobId } = await uploadRes.json();
      return `${process.env.NEXT_PUBLIC_WALRUS_BASE_URL}/${blobId}`;
    },
    onSuccess(url) {
      queryClient.setQueryData<string[]>(
        ["draft_previews"],
        (old = []) => [...old, url]
      )
      setSelectedPreviews([]);         // clear any multi-selection
      setPreviewUrl(url);              // record this single preview
    },
  })

  const mintMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      console.log("🍃 [mintMutation] start", {
        address,
        previewUrl,
        actionValue,
        framesValue,
        metaName,
        metaDescription,
        metaAttributes,
      });
  
      if (!address || !previewUrl) {
        console.error("⚠️ [mintMutation] Missing input", { address, previewUrl });
        throw new Error("Missing address or preview URL");
      }
  
      // 1) Upload to Walrus if we have a data URL
      let urlToMint = previewUrl;
      if (previewUrl.startsWith("data:")) {
        console.log("🦭 [mintMutation] Uploading Base64 to Walrus…");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ b64: previewUrl.split(",")[1] }),
        });
  
        console.log("🦭 [mintMutation] Walrus responded:", uploadRes.status);
        let uploadBody: any;
        try {
          uploadBody = await uploadRes.json();
          console.log("🦭 [mintMutation] upload JSON body:", uploadBody);
        } catch (e) {
          console.error("🦭 [mintMutation] failed to parse Walrus response", e);
          throw new Error("Failed to parse Walrus response");
        }
  
        if (!uploadRes.ok) {
          console.error("🦭 [mintMutation] Walrus upload failed", uploadBody);
          throw new Error(`Walrus upload failed: ${JSON.stringify(uploadBody)}`);
        }
  
        const { blobId } = uploadBody;
        if (!blobId) {
          console.error("🦭 [mintMutation] No blobId in Walrus response", uploadBody);
          throw new Error("Walrus upload returned no blobId");
        }
  
        urlToMint = `${process.env.NEXT_PUBLIC_WALRUS_BASE_URL}/v1/blobs/${blobId}`;
        console.log("🦭 [mintMutation] urlToMint set to", urlToMint);
      } else {
        console.log("🔗 [mintMutation] previewUrl is already a URL:", previewUrl);
      }
  
      // 2) Mint on-chain
      console.log("⛓️ [mintMutation] calling mintAsset with", urlToMint);
      const result = await mintAsset(
        address,
        suiClient,
        signAndExecuteTransaction,
        actionValue,
        framesValue,
        urlToMint,
        metaName,
        metaDescription,
        metaAttributes
      );
      console.log("📬 [mintMutation] mintAsset result:", result);
    },
  
    onSuccess: async () => {
      console.log("🚀 [mintMutation] onSuccess, refreshing assets…");
      await refreshAssets();
      await refreshScore();
      await refreshLastCheckIn();
      console.log("🔄 [mintMutation] assets refreshed, clearing form state…");
      setPreviewUrl(null);
      setMetaName("");
      setMetaDescription("");
      setMetaAttributes("");
      setActionValue(0);
      setFramesValue(1);
      queryClient.setQueryData<string[]>(["draft_previews"], []);
      console.log("🏁 [mintMutation] done");
    },
  
    onError: (err) => {
      console.error("❌ [mintMutation] error", err);
      alert("Mint failed: " + err.message);
    },
  });  

  // Handlers
  const handleExportSketch = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await canvasRef.current.exportImage("png");
      const b64 = dataUrl.split(",")[1];
      setGeneratedB64(b64);
      uploadSketchMutation.mutate(b64);
    } catch (e) {
      console.error("Sketch export failed:", e);
    }
  };

  const handleRegister = async () => {
    console.log("Registering user..." + address);
    if (!address) {
      console.log("Registering user to check if null..." + address);
      return;
    };
    setLoading(true);
    console.log("Loading set to begin");
    try {
      console.log("Registering user..." + address);
      await createUser(address, suiClient, signAndExecute);
      console.log("Registered the user..." + isRegistered);
      await refreshScore();
      console.log("Completed with refreshed score..." + score);
    } catch (error: unknown) {
      console.error("Register error:", error);
      if (error instanceof Error) {
        alert("Registration failed: " + error.message);
      } else {
        alert("Registration failed: " + String(error));
      }
    } finally {
      refreshScore();
      refreshLastCheckIn();
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!address) return;
    setLoading(true);
    try {
      await checkIn(address, suiClient, (args: any, opts: any) => signAndExecute(
        args,
        {
          ...opts,
          onSuccess: async (result: any) => {
            await refreshScore();
            await refreshLastCheckIn(); // <-- Add this!
            if (opts?.onSuccess) opts.onSuccess(result);
          },
          onError: opts?.onError,
        }
      ));
    } finally {
      refreshScore();
      refreshLastCheckIn(); // <-- Add this!
      setLoading(false);
    }
  };

  const handleCreatePet = async () => {
    if (!address || !petName) return
    setLoading(true)
    await createPet(address, suiClient, signAndExecute, petName)
    setPetName("")
    await refreshPets()
    setLoading(false)
  }

  const handleEquip = async () => {
    if (!address || !selectedPet || !selectedAsset) return
    setEquipping(true)
    await equipAsset(address, suiClient, signAndExecute, selectedPet, selectedAsset)
    await refreshEquipped()
    setEquipping(false)
  }

  const handleUnequip = async (petId: string, assetId: string) => {
    if (!address) return
    setEquipping(true)
    await unequipAsset(address, suiClient, signAndExecute, petId, assetId)
    await refreshEquipped()
    setEquipping(false)
  }

  const handleMintAssetWithMeta = async () => {
    if (!address || !previewUrl) return;
    setMintingAsset(true);
    await mintAsset(
      address,
      suiClient,
      signAndExecuteTransaction,
      actionValue,
      framesValue,
      previewUrl,
      metaName,
      metaDescription,
      metaAttributes,
    );
    await refreshAssets();
    // reset
    setPrompt('');
    setGeneratedB64(null);
    setPreviewUrl(null);
    setMetaName('');
    setMetaDescription('');
    setMetaAttributes('');
    setActionValue(0);
    setFramesValue(1);
    setMintingAsset(false);
  };

  const handleAdminReset = async () => {
    if (!address || !adminUser) return
    setLoading(true)
    await adminResetScore(address, suiClient, signAndExecute, adminUser)
    setAdminUser("")
    setLoading(false)
  }

  // Unauthenticated welcome
  if (!account) {
    return (
      <main className="flex items-center justify-center h-full w-full p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center flex flex-col gap-4 items-center justify-center">
            <h1 className="text-2xl font-bold">Welcome to Tomodachi Pets</h1>
            <CardDescription>
              Adopt your virtual pet on the Sui blockchain. Interact, earn points, and customize your companion.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4 cursor-pointer">
            <ConnectButton className="w-full cursor-pointer" />
          </CardContent>
        </Card>
      </main>
    )
  }

  // Authenticated dashboard
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-background border-b">
        <div className="container mx-auto max-w-6xl flex items-center justify-between p-4">
          {/* Logo / Title */}
          <h1 className="text-2xl font-bold">Tomodachi Pets</h1>

          {/* Large-screen tabs */}
          <div className="hidden md:flex space-x-4">
            {TABS.map(({ key, label }) => (
              <Button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "px-3 py-1 rounded-md font-medium border cursor-pointer",
                  activeTab === key
                    ? "bg-secondary text-secondary-foreground hover:bg-primary/30"
                    : "hover:bg-primary/90"
                )}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Mobile menu */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="md:hidden p-2 rounded hover:bg-primary/10">
                <Bars3Icon size={20} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 flex flex-col gap-4">
              {TABS.map(({ key, label }) => (
                <Button
                  key={key}
                  onClick={() => {
                    setActiveTab(key)
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded-md font-medium border cursor-pointer",
                    activeTab === key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-primary/10"
                  )}
                >
                  {label}
                </Button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Spacer */}
          <div className="flex-1 md:hidden" />

          {/* Score & Check-In/Register */}
          <div className="hidden sm:flex items-center space-x-4">
            <div>
              <span className="text-sm">Score:</span>{" "}
              <span className="font-mono">{score ?? 0}</span>
            </div>
            {isRegistered ? (
              <div>
                <Button
                  size="default"
                  onClick={handleCheckIn}
                  disabled={loading || !canCheckIn}
                  className="cursor-pointer"
                >
                  {canCheckIn ? "Daily Check-In" : `Check in ${Math.ceil((lastCheckIn + 86400 - now) / 3600)} hours`}
                </Button>
              </div>
            ) : (
              <Button
                size="default"
                onClick={handleRegister}
                disabled={loading}
                className="cursor-pointer"
              >
                Register
              </Button>
            )}
          </div>

          {/* Wallet */}
          <div className="ml-4 cursor-pointer">
            <ConnectButton className="cursor-pointer" />
          </div>
        </div>
      </nav>

      {/* Mobile score display & actions */}
      <div className="sm:hidden p-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm">Score:</span>{" "}
            <span className="font-mono">{score ?? 0}</span>
          </div>
          {isRegistered ? (
            <div>
            <Button
              size="default"
              onClick={handleCheckIn}
              disabled={loading || !canCheckIn}
              className="cursor-pointer"
            >
              {canCheckIn ? "Daily Check-In" : `Check in ${Math.ceil((lastCheckIn + 86400 - now) / 3600)} hours`}
            </Button>
          </div>
          ) : (
            <Button
              size="sm"
              onClick={handleRegister}
              disabled={loading}
            >
              Register
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto max-w-6xl p-4 mt-4 flex-1 space-y-8">
        {activeTab === "home" && (
          <div>
            <Collapsible open={introOpen} onOpenChange={setIntroOpen}>
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer flex flex-row justify-between items-center">
                  <CardHeader className="w-full">
                    <h1 className="text-2xl font-bold">
                      Welcome to Tomodachi Pets : a Digital Pet Game
                    </h1>
                    <CardDescription>
                      Your AI-powered, on-chain virtual pet playground
                    </CardDescription>
                  </CardHeader>
                  <div className="pr-4">
                    {introOpen ? (
                      <ChevronDown size={24} />
                    ) : (
                      <ChevronRight size={24} />
                    )}
                  </div>
                </Card>
              </CollapsibleTrigger>

              <AnimatePresence initial={false}>
                {introOpen && (
                  <motion.div
                    key="intro"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <CollapsibleContent forceMount>
                      <Card className="mt-4">
                        <CardContent>
                          <p className="mb-4">
                            Tomodachi Pets lets you <strong>draw or prompt</strong> custom pet accessories, mint them as NFTs on Sui,
                            and <strong>dynamically bundle</strong> them into your pet to watch it come to life.
                          </p>

                          <h3 className="text-lg font-medium mb-2">How It Works</h3>
                          <ol className="list-decimal list-inside space-y-2 mb-4">
                            <li>
                              <strong>Sketch or Type</strong> — give us a prompt (e.g. "ghibli fluffy cat")
                            </li>
                            <li>
                              <strong>AI-Gen Service</strong> calls GPT-Image-1 → returns a transparent PNG
                            </li>
                            <li>
                              <strong>Walrus Storage</strong> stores your image and returns a URL
                            </li>
                            <li>
                              <strong>Mint Accessory</strong> — spend 10 points to mint that URL as an Asset NFT
                            </li>
                            <li>
                              <strong>Create & Customize Pet</strong> — mint a named Pet NFT, then equip/unequip your accessories via dynamic fields
                            </li>
                          </ol>

                          <h3 className="text-lg font-medium mb-2">Game Loop & Rewards</h3>
                          <ul className="list-disc list-inside space-y-2">
                            <li>📅 <strong>Daily Check-In:</strong> earn 2 points every day</li>
                            <li>🏆 <strong>Spend Points:</strong> mint unique accessories (10 pts each)</li>
                            <li>🎨 <strong>Express Yourself:</strong> build a one-of-a-kind pet with your own designs</li>
                            <li>🔄 <strong>Composable NFTs:</strong> equip, unequip, or swap assets anytime</li>
                          </ul>

                          <p className="mt-4 text-sm text-muted-foreground">
                            All images and metadata live on-chain and in Walrus, giving you full ownership and on-the-fly composability.
                          </p>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Collapsible>

            {/* ── 1) Prompt/Sketch & Submit ── */}
            <div className="space-y-4 mt-8">
              <h1 className="text-2xl font-bold">Create your Ideal Pet Companion/Tomodachi</h1>
              {/* Mode Toggle */}
              <div className="flex space-x-2">
                <Button
                  variant={mode === "prompt" ? "default" : "outline"}
                  onClick={() => setMode("prompt")}
                >
                  Prompt
                </Button>
                <Button
                  variant={mode === "sketch" ? "default" : "outline"}
                  onClick={() => setMode("sketch")}
                >
                  Sketch
                </Button>
              </div>

              {/* Prompt Input or Sketch Canvas */}
              {mode === "prompt" ? (
                <Input
                  placeholder="Describe your asset"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
              ) : (
                <ReactSketchCanvas
                  ref={canvasRef}
                  width="512px"
                  height="512px"
                  strokeWidth={4}
                  className="border rounded"
                />
              )}

              {/* Submit Button */}
              <Button
                onClick={mode === "prompt" ? () => generateMutation.mutate() : handleExportSketch}
                disabled={generateMutation.isPending || uploadSketchMutation.isPending || (mode === "prompt" && !prompt)}
              >
                {mode === "prompt" ? 
                  (generateMutation.isPending ? "Generating..." : "Generate Preview") : 
                  (uploadSketchMutation.isPending ? "Uploading..." : "Submit Sketch")}
              </Button>
            </div>

            {/* ── 2) GPT-Image-1 Options & Previews ── */}
            <div className="space-y-4 mt-8">
              <h1 className="text-2xl font-bold">Preview Settings</h1>
              {/* Options Selectors */}
              <div className="flex flex-col md:flex-row gap-4">
                <div>
                  <Label className="mb-1" htmlFor="size-select">Size</Label>
                  <Select
                    value={sizeOption}
                    onValueChange={v =>
                      setSizeOption(v as "1024x1024" | "1024x1536" | "1536x1024" | "auto")
                    }
                  >
                    <SelectTrigger id="size-select">
                      <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">1024×1024</SelectItem>
                      <SelectItem value="1024x1536">1024×1536</SelectItem>
                      <SelectItem value="1536x1024">1536×1024</SelectItem>
                      <SelectItem value="auto">auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1" htmlFor="quality-select">Quality</Label>
                  <Select
                    value={qualityOption}
                    onValueChange={v =>
                      setQualityOption(v as "low" | "medium" | "high" | "auto")
                    }
                  >
                    <SelectTrigger id="quality-select">
                      <SelectValue placeholder="Quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">low</SelectItem>
                      <SelectItem value="medium">medium</SelectItem>
                      <SelectItem value="high">high</SelectItem>
                      <SelectItem value="auto">auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1" htmlFor="background-select">Background</Label>
                  <Select
                    value={backgroundOption}
                    onValueChange={v =>
                      setBackgroundOption(v as "transparent" | "opaque")
                    }
                  >
                    <SelectTrigger id="background-select">
                      <SelectValue placeholder="Background" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transparent">transparent</SelectItem>
                      <SelectItem value="opaque">opaque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1" htmlFor="count-input">Quantity</Label>
                  <Input
                    id="count-input"
                    type="number"
                    min={1}
                    max={4}
                    value={numImages}
                    onChange={e => setNumImages(+e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1" htmlFor="moderation-select">Moderation</Label>
                  <Select
                    value={moderationLevel}
                    onValueChange={v => setModerationLevel(v as "auto" | "low")}
                  >
                    <SelectTrigger id="moderation-select">
                      <SelectValue placeholder="Moderation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">auto</SelectItem>
                      <SelectItem value="low">low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* ── 2) GPT-Image-1 Previews & Minting ── */}
            <div className="space-y-4 mt-8">
              {/* Grid of all previews */}
              {previews.filter(Boolean).length > 0 && (
                <div className="flex flex-col space-y-4">
                  <h1 className="text-2xl font-bold">Previews</h1>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {previews
                    .filter((url) => typeof url === "string" && url.length > 0)
                    .map((url, idx) => {
                    const refining = selectedPreviews.includes(url)
                    const isFinal  = previewUrl === url

                    return (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${idx + 1}`}
                          className={`w-full h-auto rounded border transition ${
                            isFinal  ? "ring-2 ring-primary" : ""
                          }`}
                        />

                        {/* overlay buttons on hover */}
                        <div className="absolute inset-0 bg-black bg-opacity-25 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center space-y-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              setSelectedPreviews(prev =>
                                refining
                                  ? prev.filter(u => u !== url)
                                  : [...prev, url]
                              )
                            }
                          >
                            {refining ? "Unselect refine" : "Select refine"}
                          </Button>

                          <Button
                            size="sm"
                            onClick={() =>
                              setPreviewUrl(prev => (prev === url ? null : url))
                            }
                          >
                            {isFinal ? "Unselect final" : "Select final"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  </div>
                </div>
              )}

              {/* Refinement UI */}
              {selectedPreviews.length > 0 && (
                <div className="mt-4 mb-4 space-y-2">
                  <Input
                    placeholder="Refinement instructions"
                    value={editPrompt}
                    onChange={e => setEditPrompt(e.target.value)}
                  />
                  <Button
                    onClick={() =>
                      refineMutation.mutate({ images: selectedPreviews, prompt: editPrompt })
                    }
                    disabled={!editPrompt || refineMutation.status === "pending"}
                    className="mt-2"
                  >
                    {refineMutation.status === "pending" ? "Refining…" : `Apply Refine for ${selectedPreviews.length}`}
                  </Button>
                </div>
              )}

              {/* Final Mint Form */}
              {previewUrl && (
                <div className="w-full mx-auto">
                  <h1 className="text-2xl text-start font-bold">Final Preview & Mint</h1>
                  <Card className="mt-4 w-full max-w-sm rounded-md">
                    <CardContent className="space-y-4">
                      <div className="w-full">
                        <img
                          src={previewUrl}
                          alt="Selected Preview"
                          className="w-full h-auto rounded border"
                        />
                      </div>

                      <div className="space-y-4">
                        <Input
                          placeholder="Asset Name"
                          value={metaName}
                          onChange={e => setMetaName(e.target.value)}
                        />
                        <Input
                          placeholder="Description"
                          value={metaDescription}
                          onChange={e => setMetaDescription(e.target.value)}
                        />
                        <Label className="block text-sm font-medium text-muted-foreground">
                          Attributes (JSON)
                        </Label>
                        <Textarea
                          value={metaAttributes}
                          onChange={e => setMetaAttributes(e.target.value)}
                          className="w-full h-24 p-2 font-mono border rounded resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                        <Input
                          type="number"
                          min={0}
                          placeholder="action"
                          value={actionValue}
                          onChange={e => setActionValue(+e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={1}
                          placeholder="frames"
                          value={framesValue}
                          onChange={e => setFramesValue(+e.target.value)}
                          className="flex-1"
                        />
                      </div>

                      <Button
                        onClick={() => mintMutation.mutate()}
                        disabled={mintMutation.status === "pending" || !metaName || (score ?? 0) < 10}
                        className="w-full cursor-pointer"
                      >
                        {mintMutation.status === "pending"
                          ? "Minting…"
                          : "Mint Asset (10 pts)"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "pets" && (
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold">Your Pets</h1>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Pet name"
                  value={petName}
                  onChange={e=>setPetName(e.target.value)}
                />
                <Button onClick={handleCreatePet} disabled={loading}>
                  Create Pet
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pets.length>0 ? pets.map(pet=>(
                  <Card key={pet.id} className="p-2">
                    <CardHeader>
                      <h1 className="text-2xl font-bold">{pet.name}</h1>
                      <CardDescription>ID: {pet.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {equippedAssets[pet.id] && (
                        <div>
                          <p>Equipped: Asset #{equippedAssets[pet.id]}</p>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={()=>handleUnequip(pet.id,equippedAssets[pet.id])}
                            disabled={equipping}
                          >
                            Unequip
                          </Button>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant={selectedPet === pet.id ? "default" : "outline"}
                        onClick={()=>setSelectedPet(pet.id)}
                      >
                        {selectedPet===pet.id?"Selected":"Select"}
                      </Button>
                    </CardContent>
                  </Card>
                )) : (
                  <p>No pets yet. Create one above!</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "assets" && (
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold">Your Assets</h1>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* 2) Preview + Metadata + Mint */}
              {previewUrl && (
                <div className="space-y-3">
                  <img src={previewUrl} alt="Asset Preview" className="max-h-48 rounded" />
                  <Input
                    placeholder="Asset Name"
                    value={metaName}
                    onChange={e => setMetaName(e.target.value)}
                  />
                  <Input
                    placeholder="Description"
                    value={metaDescription}
                    onChange={e => setMetaDescription(e.target.value)}
                  />
                  <Input
                    placeholder="Attributes (JSON string)"
                    value={metaAttributes}
                    onChange={e => setMetaAttributes(e.target.value)}
                  />
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="action"
                      value={actionValue}
                      onChange={e => setActionValue(+e.target.value)}
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="frames"
                      value={framesValue}
                      onChange={e => setFramesValue(+e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleMintAssetWithMeta}
                    disabled={mintingAsset}
                  >
                    Mint Asset (10 pts)
                  </Button>
                </div>
              )}

              <hr />

              {/* 3) Already‐minted Assets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.length > 0 ? (
                  assets.map(asset => (
                    <Card key={asset.id} className="p-2">
                      <CardHeader>
                        <h2 className="text-lg font-bold">{asset.name}</h2>
                        <CardDescription>ID: {asset.id}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <img src={asset.url} alt={asset.name} className="max-h-32 rounded" />
                        <p className="text-sm">{asset.description}</p>
                        <Button
                          size="sm"
                          variant={selectedAsset === asset.id ? "default" : "outline"}
                          onClick={() => setSelectedAsset(asset.id)}
                        >
                          {selectedAsset === asset.id ? "Selected" : "Select"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p>No assets yet. Mint one above!</p>
                )}
              </div>

              {/* 4) Equip to Selected Pet */}
              {selectedPet && selectedAsset && (
                <div className="flex items-center space-x-4">
                  <p>
                    Equip <strong>{assets.find(a => a.id === selectedAsset)?.name}</strong> to{" "}
                    <strong>{pets.find(p => p.id === selectedPet)?.name}</strong>
                  </p>
                  <Button onClick={handleEquip} disabled={equipping}>
                    Equip
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "more" && (
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold">More Options</h1>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdmin && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Admin Controls</h3>
                  <Input
                    placeholder="User address"
                    value={adminUser}
                    onChange={e=>setAdminUser(e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    onClick={handleAdminReset}
                    disabled={loading || !adminUser}
                  >
                    Reset User Score
                  </Button>
                </div>
              )}
              <div>
                <h3 className="text-lg font-medium mb-2">About SuiPet</h3>
                <p className="mb-4">
                  SuiPet is a virtual pet platform built on the Sui
                  blockchain. Earn points, mint assets, and customize your digital
                  companion!
                </p>
                <p>
                  Check back regularly for new features and updates to the SuiPet platform.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-background border-t py-4 mt-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 Tomodachi Pets - A virtual pet simulator on the Sui blockchain</p>
        </div>
      </footer>
    </div>
  )
}