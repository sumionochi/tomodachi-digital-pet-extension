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

// Add the missing Bars3Icon component
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
            <h1 className="text-2xl font-bold">Welcome to SuiPet</h1>
            <CardDescription>
              Adopt your virtual pet on Sui blockchain. Interact, earn points,
              and customize your companion.
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
          <h1 className="text-2xl font-bold">SuiPet</h1>

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
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold">Introduction</h1>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Welcome to SuiPet, a virtual pet platform built on the Sui blockchain!
              </p>
              <p className="mb-4">
                Here's how to get started:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Register your account to start earning points</li>
                <li>Check in daily to earn more points</li>
                <li>Create pets with unique names</li>
                <li>Mint assets (accessories) for 10 points each</li>
                <li>Equip your pets with these assets to customize them</li>
              </ul>
              <p className="mt-4">
                Our growth-oriented pet comes with an NFT overlay as its core
                technology. Interact to earn points, then spend them on pet
                clothing and accessories!
              </p>
            </CardContent>
          </Card>
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
      <footer className="bg-background border-t py-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 SuiPet - A virtual pet platform on the Sui blockchain</p>
        </div>
      </footer>
    </div>
  )
}