import { QueryClient } from "@tanstack/react-query";

/** Shared with the router; ending the Session clears this cache. */
export const queryClient = new QueryClient();
