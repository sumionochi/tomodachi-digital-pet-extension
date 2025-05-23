import React, { useState, useEffect, useCallback } from 'react';
import { PetData, ExtensionMessage, Pet, Asset, OrbitAssetConfig } from '../common/types';

const BACKEND_URL = "http://localhost:3001/api/user-pet";
const PET_LIST_URL = "http://localhost:3001/api/user-pet-list";

function defaultConfigFor(asset: Asset): OrbitAssetConfig {
  return {
    id: asset.id,
    mode: "static",
    duration: 5
  };
}

const Popup: React.FC = () => {
  const [suiAddress, setSuiAddress] = useState<string>('');
  const [petList, setPetList] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [currentPetData, setCurrentPetData] = useState<PetData | null>(null);
  const [orbitConfig, setOrbitConfig] = useState<OrbitAssetConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Fetch visibility state
  useEffect(() => {
    chrome.storage.local.get('petCompanionVisible', (res) => {
      setIsVisible(res.petCompanionVisible !== false);
    });
  }, []);
  const handleToggle = () => {
    chrome.storage.local.set({ petCompanionVisible: !isVisible });
    setIsVisible(v => !v);
  };

  // Load stored address, petId, petData, and orbitConfig on mount
  useEffect(() => {
    chrome.storage.local.get(['suiAddress', 'petId', 'petData', 'orbitAssetConfig'], (result) => {
      if (result.suiAddress) setSuiAddress(result.suiAddress);
      if (result.petId) setSelectedPetId(result.petId);
      if (result.petData) setCurrentPetData(result.petData as PetData);
      if (result.orbitAssetConfig) setOrbitConfig(result.orbitAssetConfig as OrbitAssetConfig[]);
    });
  }, []);

  // Fetch pet list when address changes
  useEffect(() => {
    if (suiAddress) {
      fetch(`${PET_LIST_URL}?address=${suiAddress}`)
        .then(r => r.json())
        .then(data => {
          setPetList(data.pets || []);
          if (data.pets?.length && !selectedPetId) setSelectedPetId(data.pets[0].id);
        })
        .catch(() => setPetList([]));
    } else {
      setPetList([]);
    }
  }, [suiAddress]);

  // Fetch latest pet data when pet changes or after fetch/save
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

  // Handle config change and save to storage
  const handleOrbitConfigChange = (idx: number, patch: Partial<OrbitAssetConfig>) => {
    setOrbitConfig(cfg => {
      const newCfg = [...cfg];
      newCfg[idx] = { ...newCfg[idx], ...patch };
      chrome.storage.local.set({ orbitAssetConfig: newCfg });
      return newCfg;
    });
  };

  const handleOrbitSelectChange = (assetId: string, checked: boolean) => {
    setOrbitConfig(cfg => {
      let next: OrbitAssetConfig[];
      if (checked) {
        const asset = currentPetData?.assets.find(a => a.id === assetId);
        if (!asset) return cfg;
        next = [...cfg, defaultConfigFor(asset)];
      } else {
        next = cfg.filter(a => a.id !== assetId);
      }
      chrome.storage.local.set({ orbitAssetConfig: next });
      return next;
    });
  };

  // Render asset config UI
  function renderAssetConfig(asset: Asset, idx: number) {
    const conf = orbitConfig.find(a => a.id === asset.id);
    if (!conf) return null;
    return (
      <div key={asset.id} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
        <b>{asset.name}</b>
        <div>
          <label>
            <input
              type="radio"
              checked={conf.mode === "static"}
              onChange={() => handleOrbitConfigChange(idx, { mode: "static" })}
            />
            Static
          </label>
          <label style={{ marginLeft: 10 }}>
            <input
              type="radio"
              checked={conf.mode === "animated"}
              onChange={() => handleOrbitConfigChange(idx, { mode: "animated", frameSize: 500, frameCount: 4, frameRate: 4 })}
            />
            Animated
          </label>
        </div>
        {conf.mode === "animated" && (
          <div style={{ marginLeft: 20 }}>
            <label>
              Frame Size: <input type="number" value={conf.frameSize ?? 500}
                onChange={e => handleOrbitConfigChange(idx, { frameSize: parseInt(e.target.value, 10) || 500 })} />
            </label>
            <label style={{ marginLeft: 10 }}>
              Frame Count: <input type="number" value={conf.frameCount ?? 4}
                onChange={e => handleOrbitConfigChange(idx, { frameCount: parseInt(e.target.value, 10) || 4 })} />
            </label>
            <label style={{ marginLeft: 10 }}>
              Frame Rate: <input type="number" value={conf.frameRate ?? 4}
                onChange={e => handleOrbitConfigChange(idx, { frameRate: parseInt(e.target.value, 10) || 4 })} />
            </label>
          </div>
        )}
        <div>
          <label>
            Duration (sec):
            <input type="number" value={conf.duration}
              onChange={e => handleOrbitConfigChange(idx, { duration: Math.max(1, parseInt(e.target.value, 10) || 5) })}
              style={{ width: 50, marginLeft: 5 }} />
          </label>
        </div>
        <button style={{ marginTop: 2 }} onClick={() => {
          handleOrbitSelectChange(asset.id, false);
        }}>Remove</button>
      </div>
    );
  }

  // Drag reorder (optional for bonus)
  // You can add react-sortable-hoc or simple up/down buttons for config reorder.

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
      <button onClick={handleRefreshData} disabled={isLoading} style={{ marginLeft: 10 }}>
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
                  <label>
                    <input
                      type="checkbox"
                      checked={!!orbitConfig.find(a => a.id === asset.id)}
                      onChange={e => handleOrbitSelectChange(asset.id, e.target.checked)}
                    />
                    {asset.name}
                  </label>
                  {asset.url && <img src={asset.url} alt={asset.name} style={{ maxWidth: '50px', maxHeight: '50px', marginLeft: '10px' }} />}
                  {/* If selected, show config */}
                  {orbitConfig.find(a => a.id === asset.id) &&
                    renderAssetConfig(asset, orbitConfig.findIndex(a => a.id === asset.id))
                  }
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
