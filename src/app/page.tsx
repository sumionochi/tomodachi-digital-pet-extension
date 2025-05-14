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

import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { useRef } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";

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
  const suiClient = useSuiClient()
  const account = useCurrentAccount()
  const address = account?.address
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()

  const { score, isRegistered, refresh: refreshScore } = useScoreboard(address)
  const { pets, refresh: refreshPets } = usePets(address)
  const { assets, refresh: refreshAssets } = useAssets(address)
  const { equippedAssets, refresh: refreshEquipped } = useEquippedAssets(address)
  const { isAdmin } = useAdminCap(address)

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
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);
  const [metaName, setMetaName]         = useState<string>('');
  const [metaDescription, setMetaDescription] = useState<string>('');
  const [metaAttributes, setMetaAttributes]   = useState<string>('');
  const [actionValue, setActionValue]   = useState<number>(0);
  const [framesValue, setFramesValue]   = useState<number>(1);
  const [introOpen, setIntroOpen] = useState(true);

  const [mode, setMode] = useState<"prompt" | "sketch">("prompt");
  const canvasRef = useRef<ReactSketchCanvasRef>(null);

  const handleUploadBase64 = async (b64: string) => {
    setLoading(true);
    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ b64 }),
      });
      const { blobId } = await uploadRes.json();
      setPreviewUrl(`${process.env.NEXT_PUBLIC_WALRUS_BASE_URL}/${blobId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSketch = async () => {
    if (!canvasRef.current) return;
    try {
      // returns data:image/png;base64,XXXX
      const dataUrl = await canvasRef.current.exportImage("png");
      const b64 = dataUrl.split(",")[1];        // strip prefix
      setGeneratedB64(b64);
      await handleUploadBase64(b64);
    } catch (e) {
      console.error("Sketch export failed:", e);
    }
  };

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

  // Add the missing onTabChange function
  const onTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  // Add the missing onCheckIn and onRegister functions
  const onCheckIn = () => {
    handleCheckIn();
  };

  const onRegister = () => {
    handleRegister();
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // 1) Generate via GPT-Image-1
      const genRes = await fetch(`/api/generate?prompt=${encodeURIComponent(prompt)}`);
      const { b64 } = await genRes.json();
      setGeneratedB64(b64);

      // 2) Upload to Walrus
      const uploadRes = await fetch(`/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ b64 }),
      });
      const { blobId } = await uploadRes.json();
      const url = `${process.env.NEXT_PUBLIC_WALRUS_BASE_URL}/${blobId}`;
      setPreviewUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!address) return
    setLoading(true)
    await createUser(address, suiClient, signAndExecute)
    await refreshScore()
    setLoading(false)
  }
  const handleCheckIn = async () => {
    if (!address) return
    setLoading(true)
    await checkIn(address, suiClient, signAndExecute)
    await refreshScore()
    setLoading(false)
  }
  const handleCreatePet = async () => {
    if (!address || !petName) return
    setLoading(true)
    await createPet(address, suiClient, signAndExecute, petName)
    setPetName("")
    await refreshPets()
    setLoading(false)
  }
  const handleMintAssetWithMeta = async () => {
    if (!address || !previewUrl) return;
    setMintingAsset(true);
    await mintAsset(
      address,
      suiClient,
      signAndExecute,
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
                onClick={() => onTabChange(key)}
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
                    onTabChange(key)
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
              <Button
                size="default"
                onClick={onCheckIn}
                disabled={loading}
                className="cursor-pointer"
              >
                Daily Check-In
              </Button>
            ) : (
              <Button
                size="default"
                onClick={onRegister}
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
            <Button
              size="sm"
              onClick={onCheckIn}
              disabled={loading}
            >
              Daily Check-In
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onRegister}
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

          {/* Prompt/Sketch Mode Toggle */}
          <div className="flex space-x-2 mt-6 mb-4">
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

          {/* Prompt Mode UI */}
          {mode === "prompt" && (
            <div className="space-y-2">
              <Input
                placeholder="Describe your asset"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
              />
              <Button onClick={handleGenerate} disabled={loading || !prompt}>
                Generate Preview
              </Button>
            </div>
          )}

          {/* Sketch Mode UI */}
          {mode === "sketch" && (
            <div className="space-y-2 w-full">
              <ReactSketchCanvas
                ref={canvasRef}
                width="512px"
                height="512px"
                strokeWidth={4}
                className="border rounded"
              />
              <div className="flex space-x-2">
                <Button onClick={handleExportSketch} disabled={loading}>
                  Export Sketch
                </Button>
                <Button onClick={() => canvasRef.current?.clearCanvas()}>
                  Clear
                </Button>
              </div>
            </div>
          )}
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
              {/* 1) Prompt & Generate */}
              <div className="space-y-2">
                <Input
                  placeholder="Describe your asset (e.g. 'red cap for pet')"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !prompt}
                >
                  Generate Preview
                </Button>
              </div>

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