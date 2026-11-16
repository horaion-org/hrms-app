import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { stubApi } from "@/common/testing/stubApi";
import {
	REPAIR_WARM_UP_WINDOW_MILLISECONDS,
	repairWarmUpKey,
} from "@/features/scheduling/cover/repairWarmUpApi";
import {
	useRepairWarmUp,
	useRepairWarmUpOnValidate,
} from "@/features/scheduling/cover/useRepairWarmUp";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";

/*
 * The warm-up of the engine's repair worker: one `POST …/repair-warm-up` per
 * roster in the window, fire and forget. The API is stubbed.
 */

const WARM_UP =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/repair-warm-up";
const TARGET: RosterChangeTarget = {
	companyId: "c-1",
	unit: { branchId: "b-1", departmentId: "d-1" },
	scheduleId: "s-1",
	runId: "r-1",
};
const OTHER_ROSTER: RosterChangeTarget = { ...TARGET, scheduleId: "s-2" };
const QUIET_MILLISECONDS = 20;

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

/** A wrapper over one shared client, as the app's pages share theirs. */
const wrapperOver =
	(client: QueryClient) =>
	({ children }: { children: ReactNode }): ReactNode => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);

const newClient = (): QueryClient =>
	new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Lets any warm-up that would be sent go out, so a test can say none was. */
const quietFor = (): Promise<void> =>
	new Promise((settle) => {
		setTimeout(settle, QUIET_MILLISECONDS);
	});

/** Waits until the warm-up's one call settled, so a test can count what was sent. */
const settled = async (client: QueryClient): Promise<void> => {
	await waitFor(() => {
		expect(client.getQueryState(repairWarmUpKey("c-1", "s-1"))?.status).toBe(
			"success"
		);
	});
};

const warmUps = (
	calls: ReturnType<typeof stubApi>
): ReturnType<typeof stubApi> =>
	calls.filter((call) => call.path.endsWith("/repair-warm-up"));

describe("useRepairWarmUp", () => {
	it("given_repairOpened_when_wanted_then_onePostWithTheRevisionSeen", async () => {
		const calls = stubApi({ [`POST ${WARM_UP}`]: { status: 202 } });
		const client = newClient();

		renderHook(
			() => {
				useRepairWarmUp(TARGET, 4, true);
			},
			{ wrapper: wrapperOver(client) }
		);
		await settled(client);

		expect(warmUps(calls)).toEqual([
			expect.objectContaining({
				method: "POST",
				path: WARM_UP,
				body: { expectedRevision: 4 },
			}),
		]);
	});

	it("given_aWarmUpSent_when_askedAgainInsideTheWindow_then_nothingMoreIsSentForThatRoster", async () => {
		const calls = stubApi({ [`POST ${WARM_UP}`]: { status: 202 } });
		const client = newClient();
		const first = renderHook(
			() => {
				useRepairWarmUp(TARGET, 4, true);
			},
			{ wrapper: wrapperOver(client) }
		);
		await settled(client);
		first.unmount();

		// Repair opened again for another gap, and at a newer revision, on the same roster.
		renderHook(
			() => {
				useRepairWarmUp(TARGET, 5, true);
			},
			{ wrapper: wrapperOver(client) }
		);
		renderHook(
			() => {
				useRepairWarmUp(TARGET, 5, true);
			},
			{ wrapper: wrapperOver(client) }
		);

		await waitFor(() => {
			expect(warmUps(calls)).toHaveLength(1);
		});
	});

	it("given_anotherRoster_when_wanted_then_itsOwnWarmUp", async () => {
		const calls = stubApi({ [`POST ${WARM_UP}`]: { status: 202 } });
		const client = newClient();

		renderHook(
			() => {
				useRepairWarmUp(TARGET, 4, true);
				useRepairWarmUp(OTHER_ROSTER, 2, true);
			},
			{ wrapper: wrapperOver(client) }
		);

		await waitFor(() => {
			expect(calls.map((call) => call.path)).toEqual([
				WARM_UP,
				WARM_UP.replace("/s-1/", "/s-2/"),
			]);
		});
	});

	it("given_theWindowPassed_when_repairOpenedAgain_then_sentAgain", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		const calls = stubApi({ [`POST ${WARM_UP}`]: { status: 202 } });
		const client = newClient();
		const first = renderHook(
			() => {
				useRepairWarmUp(TARGET, 4, true);
			},
			{ wrapper: wrapperOver(client) }
		);
		await settled(client);
		first.unmount();

		vi.setSystemTime(Date.now() + REPAIR_WARM_UP_WINDOW_MILLISECONDS + 1);
		renderHook(
			() => {
				useRepairWarmUp(TARGET, 4, true);
			},
			{ wrapper: wrapperOver(client) }
		);

		await waitFor(() => {
			expect(warmUps(calls)).toHaveLength(2);
		});
	});

	it("given_notWantedOrNoTarget_when_rendered_then_nothingIsSent", async () => {
		const calls = stubApi({ [`POST ${WARM_UP}`]: { status: 202 } });

		renderHook(
			() => {
				useRepairWarmUp(TARGET, 4, false);
				useRepairWarmUp(undefined, 4, true);
			},
			{ wrapper: wrapperOver(newClient()) }
		);

		await quietFor();
		expect(calls).toEqual([]);
	});

	it.each([
		["the engine failing", { status: 502 }],
		[
			"a stale revision",
			{ status: 409, body: { errorCode: "ROSTER_REVISION_CONFLICT" } },
		],
		["no permission", { status: 403 }],
	])(
		"given_%s_when_warmedUp_then_noErrorReachesTheCacheAndNothingIsRetried",
		async (_case, reply) => {
			const calls = stubApi({ [`POST ${WARM_UP}`]: reply });
			const client = newClient();

			renderHook(
				() => {
					useRepairWarmUp(TARGET, 4, true);
				},
				{ wrapper: wrapperOver(client) }
			);
			await settled(client);

			expect(client.getQueryData(repairWarmUpKey("c-1", "s-1"))).toBe(false);
			expect(warmUps(calls)).toHaveLength(1);
		}
	);
});

describe("useRepairWarmUpOnValidate", () => {
	/** The page at `revision` with Validate schedule `lit` or not, which `rerender` moves on. */
	const page = (
		client: QueryClient,
		initialProps: { revision: number; lit: boolean }
	): ReturnType<typeof renderHook<void, { revision: number; lit: boolean }>> =>
		renderHook(
			(props) => {
				useRepairWarmUpOnValidate(TARGET, props.revision, props.lit);
			},
			{ wrapper: wrapperOver(client), initialProps }
		);

	it("given_aRosterOpenedWithItsChangesNotYetValidated_when_viewed_then_nothingIsSent", async () => {
		const calls = stubApi({ [`POST ${WARM_UP}`]: { status: 202 } });

		page(newClient(), { revision: 3, lit: true });

		await quietFor();
		expect(calls).toEqual([]);
	});

	it("given_theFirstHandChange_when_validateLightsUp_then_oneWarmUpAndNoMoreForTheNextChange", async () => {
		const calls = stubApi({ [`POST ${WARM_UP}`]: { status: 202 } });
		const client = newClient();
		const view = page(client, { revision: 1, lit: false });

		view.rerender({ revision: 2, lit: true });
		await settled(client);
		view.rerender({ revision: 3, lit: true });

		await waitFor(() => {
			expect(warmUps(calls)).toEqual([
				expect.objectContaining({ body: { expectedRevision: 2 } }),
			]);
		});
	});

	it("given_aChangeThatLeavesValidateUnlit_when_rendered_then_nothingIsSent", async () => {
		const calls = stubApi({ [`POST ${WARM_UP}`]: { status: 202 } });
		const view = page(newClient(), { revision: 1, lit: false });

		view.rerender({ revision: 2, lit: false });

		await quietFor();
		expect(calls).toEqual([]);
	});
});
