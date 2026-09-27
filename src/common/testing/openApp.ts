import { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	type AnyRouter,
} from "@tanstack/react-router";
import { expect, vi } from "vitest";
import { envelope, type StubReply } from "@/common/testing/stubApi";
import { connectSession } from "@/features/auth/connectSession";
import { routeTree } from "@/routeTree.gen";

export type OpenedApp = {
	router: AnyRouter;
	queryClient: QueryClient;
	/** Disconnects the Session wiring; call it after each test. */
	disconnect: () => void;
};

/** The app's real route tree, loaded at `entry` and wired to the Session. */
export const openApp = async (entry: string): Promise<OpenedApp> => {
	const queryClient = new QueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries: [entry] }),
	});
	const disconnect = connectSession(router, queryClient);
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
	/* eslint-disable camelcase -- the API's JSON is snake_case */
	membership_id: `m-${companyId}`,
	company_id: companyId,
	company_name: `Company ${companyId}`,
	subdomain: companyId,
	company_status: overrides.companyStatus ?? "ACTIVE",
	status: overrides.status ?? "ACTIVE",
	/* eslint-enable camelcase */
});

/** A 200 from `GET /api/v1/me` for a person with these Memberships. */
export const currentUserReply = (
	memberships: Array<Record<string, string>> = [membership("c-1")]
): StubReply => ({
	status: 200,
	body: envelope({
		/* eslint-disable camelcase -- the API's JSON is snake_case */
		user_id: "u-1",
		email: "jose@acme.test",
		display_name: "José",
		status: "ACTIVE",
		/* eslint-enable camelcase */
		memberships,
	}),
});
