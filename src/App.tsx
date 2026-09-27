import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "@/common/query-client";
import type { FunctionComponent } from "@/common/types";
import type { TanstackRouter } from "@/main";
import { TanStackDevelopmentTools } from "@/components/utils/development-tools/TanStackDevelopmentTools";

type AppProps = { router: TanstackRouter };

const App = ({ router }: AppProps): FunctionComponent => {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<TanStackDevelopmentTools router={router} />
		</QueryClientProvider>
	);
};

export default App;
