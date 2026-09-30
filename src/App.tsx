import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import type { FunctionComponent } from "@/common/types";
import type { TanstackRouter } from "@/main";

type AppProps = { router: TanstackRouter };

export const App = ({ router }: AppProps): FunctionComponent => {
	return (
		<QueryClientProvider client={router.options.context.queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	);
};
