import { useQuery } from '@tanstack/react-query';

import { fetchProgression } from '@/services/AuthApi';
import { useAuthStore } from '@/store/authStore';

export const progressionQueryKey = (playerId?: string) => [
  'progression',
  playerId ?? 'offline',
] as const;

export function useProgressionQuery() {
  const user = useAuthStore((state) => state.user);
  const getValidAccessToken = useAuthStore((state) => state.getValidAccessToken);
  return useQuery({
    queryKey: progressionQueryKey(user?.id),
    enabled: user?.serverBacked === true,
    staleTime: 30_000,
    queryFn: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) throw new Error('AUTH_UNAVAILABLE');
      return fetchProgression(accessToken);
    },
  });
}
