import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/router-devtools";
import type { FunctionComponent } from "@/common/types";
import type { TanstackRouter } from "@/main";

type TanStackDevelopmentToolsPanelProps = { router: TanstackRouter };

export const TanStackDevelopmentToolsPanel = ({
	router,
}: TanStackDevelopmentToolsPanelProps): FunctionComponent => {
	return (
		<TanStackDevtools
			plugins={[
				{
					name: "TanStack Router",
					render: <TanStackRouterDevtoolsPanel router={router} />,
				},
				{
					name: "TanStack Query",
					render: <ReactQueryDevtoolsPanel />,
				},
			]}
		/>
	);
};
