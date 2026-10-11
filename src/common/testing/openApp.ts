import { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	type AnyRouter,
} from "@tanstack/react-router";
import { expect, vi } from "vitest";
import { envelope, type StubReply } from "@/common/testing/stubApi";
import { connectSession } from "@/features/auth/connectSession";
import { connectAccess } from "@/features/workspace/connectAccess";
import { routeTree } from "@/routeTree.gen";

export type OpenedApp = {
	router: AnyRouter;
	queryClient: QueryClient;
	/** Disconnects the Session wiring; call it after each test. */
	disconnect: () => void;
};

/** The app's real route tree, loaded at `entry` and wired to the Session and access refresh. */
export const openApp = async (entry: string): Promise<OpenedApp> => {
	const queryClient = new QueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		defaultPendingMinMs: 0,
		history: createMemoryHistory({ initialEntries: [entry] }),
	});
	const disconnectSession = connectSession(router, queryClient);
	// The same access wiring as `main.tsx`.
	const disconnectAccess = connectAccess(queryClient);
	const disconnect = (): void => {
		disconnectSession();
		disconnectAccess();
	};
	await router.load();

	return { router, queryClient, disconnect };
};

/** Waits for the router to finish any navigation in flight. */
export const settled = async (router: AnyRouter): Promise<void> => {
	await vi.waitFor(() => {
		expect(router.state.status).toBe("idle");
	});
};

/** A Membership as `GET /api/v1/me` sends it; defaults to an active one. */
export const membership = (
	companyId: string,
	overrides: { status?: string; companyStatus?: string } = {}
): Record<string, string> => ({
	membershipId: `m-${companyId}`,
	companyId: companyId,
	companyName: `Company ${companyId}`,
	subdomain: companyId,
	companyStatus: overrides.companyStatus ?? "ACTIVE",
	status: overrides.status ?? "ACTIVE",
});

/** A 200 from `GET /api/v1/me` for a person with these Memberships. */
export const currentUserReply = (
	memberships: Array<Record<string, string>> = [membership("c-1")]
): StubReply => ({
	status: 200,
	body: envelope({
		userId: "u-1",
		email: "jose@acme.test",
		displayName: "José",
		status: "ACTIVE",
		memberships,
	}),
});
