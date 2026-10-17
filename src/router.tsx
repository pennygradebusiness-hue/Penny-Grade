import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { handleGlobalAdminAuthError } from "./lib/admin-session";

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        handleGlobalAdminAuthError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        handleGlobalAdminAuthError(error);
      },
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const msg = error instanceof Error ? error.message : String(error);
          if (
            /unauthorized/i.test(msg) ||
            /administrative session/i.test(msg) ||
            /session expired/i.test(msg)
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
