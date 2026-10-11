import type { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import type { Decorator } from "@storybook/react-vite";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";

/** Orchard and its Kitchen, `b-1` and `d-1`, where the stories' people are filed. */
const ORCHARD: Workspace["companies"][number]["branches"] = [
	{
		uuid: "b-1",
		name: "Orchard",
		status: "ACTIVE",
		country: "SG",
		permissions: [],
		departments: [
			{ uuid: "d-1", name: "Kitchen", status: "ACTIVE", permissions: [] },
		],
	},
];

/**
 * Renders a story inside the current company, holding the `permissions`
 * parameter's keys company-wide, for components that ask `useAccess` or
 * read the current company from the `/_authenticated` route, as the app's
 * pages do. `branches` are the units the workspace lists (Orchard and its
 * Kitchen by default), with the company's keys effective at each of them,
 * as the API sends them.
 * List it before `storyProviders` so the query client wraps it.
 */
export const storyCompany =
	(
		client: QueryClient,
		companyId: string,
		branches: Workspace["companies"][number]["branches"] = ORCHARD
	): Decorator =>
	(Story, { parameters }) => {
		const permissions: unknown = parameters["permissions"];
		client.setQueryData(
			workspaceQuery.queryKey,
			effectiveWorkspace({
				companies: [
					{
						uuid: companyId,
						name: "Story company",
						permissions: Array.isArray(permissions)
							? permissions.filter((key) => typeof key === "string")
							: [],
						branches,
					},
				],
			})
		);
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
