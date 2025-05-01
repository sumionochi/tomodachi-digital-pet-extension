// lib/walrus.ts

import { SuiClient } from '@mysten/sui/client';  
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';  
import { WalrusClient } from '@mysten/walrus';  

// 1) Connect to Sui RPC via the new client class  
const suiClient = new SuiClient({  
  url: process.env.SUI_RPC_URL!,  
});  // :contentReference[oaicite:0]{index=0}

// 2) Derive your Ed25519 keypair from base64 secret  
const keypair = Ed25519Keypair.fromSecretKey(  
  Buffer.from(process.env.SUI_SECRET_KEY!, 'base64')  
);  // :contentReference[oaicite:1]{index=1}

// 3) Instantiate Walrus, passing the same SuiClient  
export const walrus = new WalrusClient({  
  network: process.env.WALRUS_NETWORK! as 'testnet' | 'mainnet',  
  suiClient,  
});  // :contentReference[oaicite:2]{index=2}

/**  
 * Upload a PNG blob to Walrus, paying storage fees with your keypair.  
 * No RawSigner needed—Ed25519Keypair now implements signing directly.  
 */  
export async function uploadBlob(buffer: Uint8Array): Promise<string> {  
  const { blobId } = await walrus.writeBlob({  
    blob:       buffer,        // your PNG/spritesheet data  
    epochs:     10,            // how many epochs to persist  
    deletable:  true,          // allow later deletion  
    signer:     keypair,       // keypair signs the storage transaction  
  });  //   
  return blobId;  
}
