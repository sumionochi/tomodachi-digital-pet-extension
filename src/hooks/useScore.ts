import { useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';

export function useScore(boardId: string, userAddress: string) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['score', boardId, userAddress],
    enabled: !!boardId && !!userAddress,
    queryFn: async () => {
      const dynResp = await suiClient.getDynamicFieldObject({
        parentId: boardId,
        name: { type: 'Address', value: userAddress },
      });

      const wrapperId = dynResp.data?.objectId;
      if (!wrapperId) {
        throw new Error('No dynamic field object found');
      }

      const objResp = await suiClient.getObject({
        id: wrapperId,
        options: { showContent: true },
      });

      const content = objResp.data?.content;
      if (!content || content.dataType !== 'moveObject') {
        throw new Error('Object is not a Move object or has no content');
      }

      const { value } = content.fields as { value: string };
      if (typeof value !== 'string') {
        throw new Error('Unexpected value type in fields');
      }

      return Number(value);
    },
  });
}
