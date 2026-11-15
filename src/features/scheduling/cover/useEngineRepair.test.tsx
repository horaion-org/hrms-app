import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	feasibleRepair,
	infeasibleRepair,
	repairOptionsFixture,
} from "@/features/scheduling/cover/engineRepairFixtures";
import { useEngineRepair } from "@/features/scheduling/cover/useEngineRepair";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";

/*
 * The engine's repair options for one gap, asked for on demand. The API is
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

/** Answers the ask with `options`; returns what was sent. */
const answer = (
	options = repairOptionsFixture()
): ReturnType<typeof stubApi> =>
	stubApi({
		[`POST ${REPAIR_OPTIONS}`]: { status: 200, body: envelope(options) },
	});

describe("useEngineRepair", () => {
	it("sends nothing until asked, then the gap at the revision on screen, feasible options first", async () => {
		const calls = answer(
			repairOptionsFixture([infeasibleRepair(), feasibleRepair()])
		);
		const { result } = hook(4);

		expect(result.current.status).toBe("idle");
		expect(calls).toHaveLength(0);

		act(() => {
			result.current.ask();
		});

		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		expect(calls.map((call) => call.body)).toEqual([
			{ ...GAP, expectedRevision: 4 },
		]);
		expect(
			result.current.status === "ready" &&
				result.current.options.map((option) => option.feasible)
		).toEqual([true, false]);
	});

	it("is unasked again once the roster moves on", async () => {
		answer();
		const { result, rerender } = hook(1);
		act(() => {
			result.current.ask();
		});
		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});

		rerender({ revision: 2, landing: false });

		expect(result.current.status).toBe("idle");
	});

	it("asks nothing while a change lands, and waits", async () => {
		const calls = answer();
		const { result } = hook(1, true);

		act(() => {
			result.current.ask();
		});

		await waitFor(() => {
			expect(result.current.status).toBe("loading");
		});
		expect(calls).toHaveLength(0);
	});

	it("reads a refusal as what the section says", async () => {
		stubApi({
			[`POST ${REPAIR_OPTIONS}`]: {
				status: 422,
				body: {
					type: "about:blank",
					title: "Unprocessable",
					status: 422,
					errorCode: "REPAIR_GAP_NOT_FROM_ENGINE",
				},
			},
		});
		const { result } = hook();
		act(() => {
			result.current.ask();
		});

		await waitFor(() => {
			expect(result.current).toMatchObject({
				status: "refused",
				refusal: "notFromEngine",
			});
		});
	});
});
