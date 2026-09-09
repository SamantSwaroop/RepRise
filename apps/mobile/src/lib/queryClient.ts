import { QueryClient } from '@tanstack/react-query';

// In Phase 3+, queryFns here read from the local SQLite repository layer
// (offline-first), not directly from the network.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});
