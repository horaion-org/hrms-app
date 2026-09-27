import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	type AnyRoute,
	type Router,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";

/** Shared by navigation tests, static-markup checks and Storybook. */
export const createMemoryRouter = (
	children: ReactNode,
	initialEntry = "/"
): Router<AnyRoute> => {
	const root = createRootRoute({
		component: (): FunctionComponent => <>{children}</>,
	});
	const routes = [
		"/",
		"/example",
		"/sign-in",
		"/sign-up",
		"/confirm-email",
		"/forgot-password",
		"/new-password",
	].map((path) => createRoute({ getParentRoute: () => root, path }));
	return createRouter({
		routeTree: root.addChildren(routes),
		history: createMemoryHistory({ initialEntries: [initialEntry] }),
		defaultPendingMinMs: 0,
	});
};
