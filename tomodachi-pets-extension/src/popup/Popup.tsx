import React, { useState, useEffect, useCallback } from 'react';
import { PetData, ExtensionMessage, Pet } from '../common/types';

const BACKEND_URL = "http://localhost:3001/api/user-pet";
const PET_LIST_URL = "http://localhost:3001/api/user-pet-list";

const Popup: React.FC = () => {
  const [suiAddress, setSuiAddress] = useState<string>('');
  const [petList, setPetList] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [currentPetData, setCurrentPetData] = useState<PetData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    chrome.storage.local.get('petCompanionVisible', (res) => {
      setIsVisible(res.petCompanionVisible !== false);
    });
  }, []);
  const handleToggle = () => {
    chrome.storage.local.set({ petCompanionVisible: !isVisible });
    setIsVisible(v => !v);
  };
  
  // Load stored address, petId, and petData on mount
  useEffect(() => {
    chrome.storage.local.get(['suiAddress', 'petId', 'petData'], (result) => {
      if (result.suiAddress) setSuiAddress(result.suiAddress);
      if (result.petId) setSelectedPetId(result.petId);
      if (result.petData) setCurrentPetData(result.petData as PetData);
    });
  }, []);

  // Fetch pet list when address changes
  useEffect(() => {
    if (suiAddress) {
      fetch(`${PET_LIST_URL}?address=${suiAddress}`)
        .then(r => r.json())
        .then(data => {
          setPetList(data.pets || []);
          // Auto-select first pet if nothing selected yet
          if (data.pets?.length && !selectedPetId) setSelectedPetId(data.pets[0].id);
        })
        .catch(() => setPetList([]));
    } else {
      setPetList([]);
    }
  }, [suiAddress]);

  // Listen for pet data updates from background
  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      if (message.type === 'PET_DATA_UPDATED') {
        setCurrentPetData(message.payload as PetData);
        setIsLoading(false);
        setError(null);
      } else if (message.type === 'PET_DATA_ERROR') {
        setError(message.payload as string);
        setCurrentPetData(null);
        setIsLoading(false);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => { chrome.runtime.onMessage.removeListener(listener); };
  }, []);

  // Save both address and petId, then fetch
  const handleSaveAndFetch = useCallback(() => {
    if (!suiAddress.trim() || !selectedPetId) {
      setError("Sui address and pet must be selected.");
      return;
    }
    setIsLoading(true);
    setError(null);
    chrome.storage.local.set({ suiAddress: suiAddress.trim(), petId: selectedPetId }, () => {
      chrome.runtime.sendMessage(
        { type: 'SAVE_ADDRESS_AND_FETCH', payload: { suiAddress: suiAddress.trim(), petId: selectedPetId } } as ExtensionMessage,
        (response) => {
          if (chrome.runtime.lastError) {
            setError(`Error: ${chrome.runtime.lastError.message}`);
            setIsLoading(false);
          } else if (response?.status === 'error') {
            setError(response.message);
            setIsLoading(false);
          }
        }
      );
    });
  }, [suiAddress, selectedPetId]);

  // Reload current data
  const handleRefreshData = useCallback(() => {
    if (!suiAddress.trim() || !selectedPetId) {
      setError("Sui address and pet must be selected.");
      return;
    }
    setIsLoading(true);
    setError(null);
    chrome.runtime.sendMessage(
      { type: 'FETCH_PET_DATA', payload: { suiAddress: suiAddress.trim(), petId: selectedPetId } } as ExtensionMessage,
      (response) => {
        if (chrome.runtime.lastError) {
          setError(`Error: ${chrome.runtime.lastError.message}`);
          setIsLoading(false);
        } else if (response?.status === 'error') {
          setError(response.message);
          setIsLoading(false);
        }
      }
    );
  }, [suiAddress, selectedPetId]);

  return (
    <div>
      <h2>Tomodachi Pet Companion</h2>
      <label htmlFor="suiAddress">Sui Wallet Address:</label>
      <input
        type="text"
        id="suiAddress"
        value={suiAddress}
        onChange={e => setSuiAddress(e.target.value)}
        placeholder="Enter your Sui address"
        autoComplete="off"
      />
      {petList.length > 0 && (
        <>
          <label htmlFor="petId">Choose Your Pet:</label>
          <select id="petId" value={selectedPetId} onChange={e => setSelectedPetId(e.target.value)}>
            {petList.map(p => (
              <option value={p.id} key={p.id}>{p.name} ({p.id.slice(0, 6)}…)</option>
            ))}
          </select>
        </>
      )}
      <button onClick={handleSaveAndFetch} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save & Fetch'}
      </button>
      <button onClick={handleToggle}>
        {isVisible ? 'Hide Pet Cursor' : 'Show Pet Cursor'}
      </button>
      <button onClick={handleRefreshData} disabled={isLoading} style={{marginLeft: 10}}>
        {isLoading ? 'Refreshing...' : 'Refresh Data'}
      </button>
      {error && <p className="error">Error: {error}</p>}

      {currentPetData && (
        <div className="pet-preview">
          <h3>Pet: {currentPetData.pet.name}</h3>
          {currentPetData.pet.imageUrl && <img src={currentPetData.pet.imageUrl} alt={currentPetData.pet.name} />}
          <p>ID: {currentPetData.pet.id}</p>
          <h4>Equipped Assets:</h4>
          {currentPetData.assets.length > 0 ? (
            <ul>
              {currentPetData.assets.map((asset) => (
                <li key={asset.id}>
                  {asset.name}
                  {asset.url && <img src={asset.url} alt={asset.name} style={{maxWidth: '50px', maxHeight: '50px', marginLeft: '10px'}} />}
                </li>
              ))}
            </ul>
          ) : <p>No assets equipped.</p>}
        </div>
      )}
    </div>
  );
};

export default Popup;
