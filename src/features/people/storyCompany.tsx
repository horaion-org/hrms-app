import type { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import type { Decorator } from "@storybook/react-vite";
import { workspaceQuery } from "@/features/workspace/api";

/**
 * Renders a story inside the current company, holding the `permissions`
 * parameter's keys company-wide, for components that ask `useCan` or read
 * the current company from the `/_authenticated` route, as the app's pages
 * do. List it before `storyProviders` so the query client wraps it.
 */
export const storyCompany =
	(client: QueryClient, companyId: string): Decorator =>
	(Story, { parameters }) => {
		const permissions: unknown = parameters["permissions"];
		client.setQueryData(workspaceQuery.queryKey, {
			companies: [
				{
					uuid: companyId,
					name: "Story company",
					permissions: Array.isArray(permissions)
						? permissions.filter((key) => typeof key === "string")
						: [],
					branches: [],
				},
			],
		});
		const root = createRootRoute();
		const authenticated = createRoute({
			getParentRoute: () => root,
			id: "_authenticated",
			beforeLoad: () => ({
				currentCompany: {
					kind: "settled",
					company: { companyId, membershipId: "story-member" },
				},
			}),
		});
		const index = createRoute({
			getParentRoute: () => authenticated,
			path: "/",
			component: Story,
		});
		return (
			<RouterProvider
				router={createRouter({
					routeTree: root.addChildren([authenticated.addChildren([index])]),
					history: createMemoryHistory({ initialEntries: ["/"] }),
					defaultPendingMinMs: 0,
				})}
			/>
		);
	};
