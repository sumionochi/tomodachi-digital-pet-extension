import { useQuery } from '@tanstack/react-query';
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: process.env.NEXT_PUBLIC_SUI_RPC_URL! });

export function useOwnedObjects(address: string) {
  return useQuery({
    queryKey: ['owned', address],
    queryFn: async () => {
      if (!address) return [];
      const resp = await client.getOwnedObjects({
        owner: address,
        options: { showType: true },
      });
      return resp.data
        .filter(obj => obj.data)
        .map(obj => ({
          id: obj.data!.objectId,
          type: obj.data!.type,
        }));
    },
    enabled: !!address,
  });
}
