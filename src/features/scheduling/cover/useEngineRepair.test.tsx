import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	callInOption,
	moveOption,
	repairOptionsFixture,
} from "@/features/scheduling/cover/engineRepairFixtures";
import { useEngineRepair } from "@/features/scheduling/cover/useEngineRepair";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";

/*
 * The engine's repair options for one gap, asked for at once. The API is
 * stubbed; the hook's one call is `POST …/repair-options` at the revision on
 * screen.
 */

const REPAIR_OPTIONS =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/repair-options";
const TARGET: RosterChangeTarget = {
	companyId: "c-1",
	unit: { branchId: "b-1", departmentId: "d-1" },
	scheduleId: "s-1",
	runId: "r-1",
};
const GAP: CoverGapRequest = { shiftId: "front-desk-am", day: "2026-10-17" };

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
});

const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
	<QueryClientProvider
		client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
	>
		{children}
	</QueryClientProvider>
);

/** The hook at `revision`, which `rerender` can move on or mark as landing. */
const hook = (
	revision = 1,
	landing = false
): ReturnType<
	typeof renderHook<
		ReturnType<typeof useEngineRepair>,
		{ revision: number; landing: boolean }
	>
> =>
	renderHook(
		(props) => useEngineRepair(TARGET, GAP, props.revision, props.landing),
		{ wrapper, initialProps: { revision, landing } }
	);

/** Answers every ask with `options`; returns what was sent. */
const answer = (options = repairOptionsFixture()): ReturnType<typeof stubApi> =>
	stubApi({
		[`POST ${REPAIR_OPTIONS}`]: { status: 200, body: envelope(options) },
	});

describe("useEngineRepair", () => {
	it("asks at once for the gap at the revision on screen, and keeps the engine's order and revision", async () => {
		const calls = answer(
			repairOptionsFixture([moveOption(), callInOption()], null, {
				revision: 4,
			})
		);
		const { result } = hook(4);

		expect(result.current.status).toBe("loading");
		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		expect(calls.map((call) => call.body)).toEqual([
			{ ...GAP, expectedRevision: 4 },
		]);
		expect(result.current).toMatchObject({
			revision: 4,
			search: { complete: true, optionsFound: 2 },
		});
		expect(
			result.current.status === "ready" &&
				result.current.options.map((option) => option.kind)
		).toEqual(["MOVE", "CALL_IN"]);
	});

	it("asks afresh once the roster moves on", async () => {
		const calls = answer();
		const { result, rerender } = hook(1);
		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});

		rerender({ revision: 2, landing: false });

		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		expect(calls.map((call) => call.body)).toEqual([
			{ ...GAP, expectedRevision: 1 },
			{ ...GAP, expectedRevision: 2 },
		]);
	});

	it("asks nothing while a change lands, and waits", () => {
		const calls = answer();
		const { result } = hook(1, true);

		expect(result.current.status).toBe("loading");
		expect(calls).toHaveLength(0);
	});

	it("reads a refusal as what the section says, and asks again on askAgain", async () => {
		const calls = stubApi({
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 422,
				body: {
					type: "about:blank",
					title: "Unprocessable",
					status: 422,
					errorCode: "REPAIR_GAP_NOT_SEEN_BY_ENGINE",
				},
			},
		});
		const { result } = hook();

		await waitFor(() => {
			expect(result.current).toMatchObject({
				status: "refused",
				refusal: "notSeenByEngine",
			});
		});
		act(() => {
			result.current.askAgain();
		});
		await waitFor(() => {
			expect(calls).toHaveLength(2);
		});
	});

	it("keeps a refusal on screen while it asks again, then reads the answer", async () => {
		let release: (response: Response) => void = () => {};
		const replies = [
			Promise.resolve(
				new Response(JSON.stringify({ errorCode: "REPAIR_ENGINE_TOO_SLOW" }), {
					status: 504,
				})
			),
			new Promise<Response>((resolve) => {
				release = resolve;
			}),
		];
		vi.stubGlobal("fetch", (): Promise<Response> => replies.shift()!);
		const { result } = hook();
		await waitFor(() => {
			expect(result.current).toMatchObject({
				status: "refused",
				refusal: "tooSlow",
				retrying: false,
			});
		});

		act(() => {
			result.current.askAgain();
		});

		await waitFor(() => {
			expect(result.current).toMatchObject({
				status: "refused",
				refusal: "tooSlow",
				retrying: true,
			});
		});
		release(
			new Response(JSON.stringify(envelope(repairOptionsFixture())), {
				status: 200,
			})
		);
		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
	});
});
