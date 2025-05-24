import './popup.css';
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
    const conf = orbitConfig.find((a) => a.id === asset.id);
    if (!conf) return null;
    return (
      <div className="asset-config-container">
        <div className="asset-config">
          <div className="config-section">
            <span className="config-label">Display Mode:</span>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  checked={conf.mode === "static"}
                  onChange={() => handleOrbitConfigChange(idx, { mode: "static" })}
                />
                Static
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  checked={conf.mode === "animated"}
                  onChange={() =>
                    handleOrbitConfigChange(idx, {
                      mode: "animated",
                      frameSize: 500,
                      frameCount: 4,
                      frameRate: 4,
                    })
                  }
                />
                Animated
              </label>
            </div>
          </div>
          {conf.mode === "animated" && (
            <div className="animated-config">
              <div className="input-row">
                <label>
                  Frame Size
                  <input
                    className="number-input"
                    type="number"
                    value={conf.frameSize ?? 500}
                    min={1}
                    onChange={(e) =>
                      handleOrbitConfigChange(idx, { frameSize: parseInt(e.target.value, 10) || 500 })
                    }
                  />
                </label>
                <label>
                  Frame Count
                  <input
                    className="number-input"
                    type="number"
                    value={conf.frameCount ?? 4}
                    min={1}
                    onChange={(e) =>
                      handleOrbitConfigChange(idx, { frameCount: parseInt(e.target.value, 10) || 4 })
                    }
                  />
                </label>
                <label>
                  Frame Rate
                  <input
                    className="number-input"
                    type="number"
                    value={conf.frameRate ?? 4}
                    min={1}
                    onChange={(e) =>
                      handleOrbitConfigChange(idx, { frameRate: parseInt(e.target.value, 10) || 4 })
                    }
                  />
                </label>
              </div>
            </div>
          )}
          <div className="input-row">
            <label>
              Duration (sec)
              <input
                className="number-input"
                type="number"
                min={1}
                value={conf.duration}
                onChange={(e) =>
                  handleOrbitConfigChange(idx, { duration: Math.max(1, parseInt(e.target.value, 10) || 5) })
                }
              />
            </label>
            <button
              className="btn btn-remove btn-small"
              onClick={() => handleOrbitSelectChange(asset.id, false)}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="main-section">
      {/* Sui Address and Pet selection */}
      <div className="form-group">
        <label htmlFor="suiAddress">Sui Wallet Address</label>
        <input
          className="text-input"
          type="text"
          id="suiAddress"
          value={suiAddress}
          onChange={(e) => setSuiAddress(e.target.value)}
          placeholder="Enter your Sui address"
          autoComplete="off"
        />
      </div>
      {petList.length > 0 && (
        <div className="form-group">
          <label htmlFor="petId">Choose Your Pet</label>
          <select
            className="select-input"
            id="petId"
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
          >
            {petList.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} ({p.id.slice(0, 6)}…)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="button-group">
        <button className="btn btn-primary" onClick={handleSaveAndFetch} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save & Fetch"}
        </button>
        <button className="btn btn-secondary" onClick={handleToggle}>
          {isVisible ? "Hide Pet Cursor" : "Show Pet Cursor"}
        </button>
        <button className="btn btn-secondary" onClick={handleRefreshData} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}

      {/* Pet Preview Section */}
      {currentPetData && (
        <div className="pet-preview">
          <h3>{currentPetData.pet.name}</h3>
          <div className="pet-image-container">
            {currentPetData.pet.imageUrl && (
              <img
                src={currentPetData.pet.imageUrl}
                alt={currentPetData.pet.name}
                className="pet-image"
              />
            )}
          </div>
          <div className="pet-info">
            <div>
              <span className="label">ID:</span>
              <span className="pet-id">{currentPetData.pet.id}</span>
            </div>
          </div>
          <div className="assets-section">
            <h4>Equipped Assets</h4>
            {currentPetData.assets.length > 0 ? (
              <div className="assets-list">
                {currentPetData.assets.map((asset) => (
                  <div className="asset-item" key={asset.id}>
                    <div className="asset-header">
                      <label className="checkbox-label">
                        <input
                          className="checkbox-input"
                          type="checkbox"
                          checked={!!orbitConfig.find((a) => a.id === asset.id)}
                          onChange={(e) => handleOrbitSelectChange(asset.id, e.target.checked)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="asset-name">{asset.name}</span>
                      </label>
                      <div className="asset-image-container">
                        {asset.url && (
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="asset-image"
                          />
                        )}
                      </div>
                    </div>
                    {/* Show config if selected */}
                    {orbitConfig.find((a) => a.id === asset.id) &&
                      renderAssetConfig(asset, orbitConfig.findIndex((a) => a.id === asset.id))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-assets">No assets equipped.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Popup;
