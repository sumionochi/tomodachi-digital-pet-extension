'use client';

import React, { useState } from 'react';
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button'; // shadcn/ui
import { mintAsset, createPet, checkIn, createUser, equipAsset, unequipAsset, adminResetScore } from '@/lib/sui';
import { useScoreboard, usePets, useAssets, useEquippedAssets, useAdminCap } from '@/hooks/gameHooks';

export default function HomePage() {
  // Sui dApp Kit hooks
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const address = account?.address;
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Game hooks
  const { score, isRegistered, refresh: refreshScore } = useScoreboard(address);
  const { pets, refresh: refreshPets } = usePets(address);
  const { assets, refresh: refreshAssets } = useAssets(address);
  const { equippedAssets, refresh: refreshEquipped } = useEquippedAssets(address);
  const { isAdmin } = useAdminCap(address);

  // UI state
  const [petName, setPetName] = useState('');
  const [mintingAsset, setMintingAsset] = useState(false);
  const [equipping, setEquipping] = useState(false);
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState('');
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleRegister = async () => {
    if (!address) return;
    setLoading(true);
    await createUser(address, suiClient, signAndExecute);
    await refreshScore();
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!address) return;
    setLoading(true);
    await checkIn(address, suiClient, signAndExecute);
    await refreshScore();
    setLoading(false);
  };

  const handleCreatePet = async () => {
    if (!address || !petName) return;
    setLoading(true);
    await createPet(address, suiClient, signAndExecute, petName);
    setPetName('');
    await refreshPets();
    setLoading(false);
  };

  const handleMintAsset = async () => {
    if (!address) return;
    setMintingAsset(true);
    await mintAsset(address, suiClient, signAndExecute);
    await refreshAssets();
    setMintingAsset(false);
  };

  const handleEquip = async () => {
    if (!address || !selectedPet || !selectedAsset) return;
    setEquipping(true);
    await equipAsset(address, suiClient, signAndExecute, selectedPet, selectedAsset);
    await refreshEquipped();
    setEquipping(false);
  };

  const handleUnequip = async (petId: string, assetId: string) => {
    if (!address) return;
    setEquipping(true);
    await unequipAsset(address, suiClient, signAndExecute, petId, assetId);
    await refreshEquipped();
    setEquipping(false);
  };

  const handleAdminReset = async () => {
    if (!address || !adminUser) return;
    setLoading(true);
    await adminResetScore(address, suiClient, signAndExecute, adminUser);
    setAdminUser('');
    setLoading(false);
  };

  // UI
  if (!account) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen">
        <div className='m-2 cursor-pointer'>
          <ConnectButton />
        </div>
        <p className="mt-4">Connect your Sui wallet to play Tomodachi!</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tomodachi Game</h1>
        <ConnectButton />
      </div>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Your Progress</h2>
        <div className="flex items-center gap-4">
          <span>Score: <b>{score ?? '-'}</b></span>
          {isRegistered ? (
            <Button onClick={handleCheckIn} disabled={loading}>Daily Check-In (+2)</Button>
          ) : (
            <Button onClick={handleRegister} disabled={loading}>Register</Button>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Your Pets</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="border px-2 py-1 rounded"
            placeholder="Pet name"
            value={petName}
            onChange={e => setPetName(e.target.value)}
          />
          <Button onClick={handleCreatePet} disabled={loading || !petName}>Create Pet</Button>
        </div>
        <ul>
          {pets.map(pet => (
            <li key={pet.id} className="mb-1">
              <span className="font-mono">{pet.name}</span> (ID: {pet.id})
              {equippedAssets[pet.id] && (
                <span className="ml-2 text-xs text-green-600">Equipped: {equippedAssets[pet.id]}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Your Assets</h2>
        <Button onClick={handleMintAsset} disabled={mintingAsset || (score ?? 0) < 10}>
          Mint Asset (10 pts)
        </Button>
        <ul className="mt-2">
          {assets.map(asset => (
            <li key={asset.id} className="mb-1">
              <span className="font-mono">Asset #{asset.id}</span>
              <Button
                size="sm"
                className="ml-2"
                onClick={() => setSelectedAsset(asset.id)}
                variant={selectedAsset === asset.id ? 'default' : 'outline'}
              >
                {selectedAsset === asset.id ? 'Selected' : 'Select'}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Equip Asset to Pet</h2>
        <div className="flex gap-2 mb-2">
          <select
            className="border px-2 py-1 rounded"
            value={selectedPet ?? ''}
            onChange={e => setSelectedPet(e.target.value)}
          >
            <option value="">Select Pet</option>
            {pets.map(pet => (
              <option key={pet.id} value={pet.id}>{pet.name}</option>
            ))}
          </select>
          <select
            className="border px-2 py-1 rounded"
            value={selectedAsset ?? ''}
            onChange={e => setSelectedAsset(e.target.value)}
          >
            <option value="">Select Asset</option>
            {assets.map(asset => (
              <option key={asset.id} value={asset.id}>Asset #{asset.id}</option>
            ))}
          </select>
          <Button onClick={handleEquip} disabled={equipping || !selectedPet || !selectedAsset}>
            Equip
          </Button>
        </div>
        <div>
          {pets.map(pet => (
            equippedAssets[pet.id] && (
              <div key={pet.id} className="flex items-center gap-2">
                <span>{pet.name} has Asset #{equippedAssets[pet.id]}</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleUnequip(pet.id, equippedAssets[pet.id])}
                  disabled={equipping}
                >
                  Unequip
                </Button>
              </div>
            )
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="mb-6">
          <h2 className="font-semibold mb-2">Admin Controls</h2>
          <div className="flex gap-2">
            <input
              className="border px-2 py-1 rounded"
              placeholder="User address"
              value={adminUser}
              onChange={e => setAdminUser(e.target.value)}
            />
            <Button onClick={handleAdminReset} disabled={loading || !adminUser}>
              Reset User Score
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
