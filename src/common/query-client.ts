import { QueryClient } from "@tanstack/react-query";

/** The app's one query cache. Signing out clears it. */
export const queryClient = new QueryClient();
