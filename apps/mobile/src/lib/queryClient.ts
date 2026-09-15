import { QueryClient } from '@tanstack/react-query';

// Query functions read from the local SQLite repository layer (offline-first),
// decoupling UI reads from network latency.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});
