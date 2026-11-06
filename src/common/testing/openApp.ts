import { QueryClient } from "@tanstack/react-query";
import {
	createMemoryHistory,
	createRouter,
	type AnyRouter,
} from "@tanstack/react-router";
import { expect, vi } from "vitest";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
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

/**
 * The reads the signed-in shell and Dashboard make after `GET /api/v1/me` for
 * company `c-1`: the workspace (no grants), the person's own profile and an
 * empty notifications list. Spread them into a `stubApi` table so the shell
 * settles instead of retrying 404s.
 */
export const signedInShellRoutes = (): Record<string, StubReply> => ({
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(companyWideWorkspace([])),
	},
	"GET /api/v1/companies/c-1/me/profile": {
		status: 200,
		body: envelope({
			membershipId: "m-c-1",
			employeeCode: "EMP-1",
			displayName: "José",
			email: "jose@acme.test",
			phone: null,
			branchId: "b-1",
			branchName: "Orchard",
			departmentId: null,
			departmentName: null,
			jobTitleId: null,
			jobTitleName: null,
			status: "ACTIVE",
			dateOfBirth: null,
			employmentType: "FULL_TIME",
			hireDate: "2026-01-05",
			probationEndDate: null,
			endDate: null,
			reportsTo: null,
			invitationPending: false,
		}),
	},
	"GET /api/v1/companies/c-1/me/notifications": {
		status: 200,
		body: { content: [], page: { totalElements: 0 } },
	},
	"GET /api/v1/companies/c-1/me/notifications/unread-count": {
		status: 200,
		body: { unreadCount: 0 },
	},
});
