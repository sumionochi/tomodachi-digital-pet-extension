'use client';

import { useCurrentAccount } from '@mysten/dapp-kit';
import { useScore } from '../hooks/useScore';
import { useOwnedObjects } from '../hooks/useOwnedObjects';

export default function Home() {
  const account = useCurrentAccount();
  const address = account?.address;
  const scoreboardId = process.env.NEXT_PUBLIC_SCOREBOARD_ID!;

  // Adjust this line according to your useScore implementation
  const { data: score, isLoading: loadingScore } = useScore(scoreboardId, address!);
  const { data: owned, isLoading: loadingOwned } = useOwnedObjects(address!);

  if (!address) return <p>Please connect your wallet.</p>;
  if (loadingScore || loadingOwned) return <p>Loading on-chain data…</p>;

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Hello, {address}</h1>
      <p>Your Score: {score}</p>
      <button className="btn btn-primary">Daily Check-In</button>
      <h2 className="mt-6 text-xl">Your Pets & Assets</h2>
      <ul>
        {owned?.map(o => (
          <li key={o.id}>
            {o.type ? o.type.split('::').pop() : 'Unknown'} — {o.id}
          </li>
        ))}
      </ul>
    </div>
  );
}
