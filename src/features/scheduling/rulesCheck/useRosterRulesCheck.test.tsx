import {
	focusManager,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { rulesCheckFixture } from "@/features/scheduling/rulesCheck/fixtures";
import { useRosterRulesCheck } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";

/*
 * Validate schedule asked for on demand. The API is stubbed; the hook's one
 * call is `POST …/roster-check` at the revision on screen.
 */

const ROSTER_CHECK =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/roster-check";
const TARGET: RosterChangeTarget = {
	companyId: "c-1",
	unit: { branchId: "b-1", departmentId: "d-1" },
	scheduleId: "s-1",
	runId: "r-1",
};
const CHECK = rulesCheckFixture();

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

/** The hook for `target` at `revision`, with or without hand changes, which `rerender` can move on. */
const hook = (
	target: RosterChangeTarget | undefined,
	revision = 1,
	hasChanges = false
): ReturnType<
	typeof renderHook<
		ReturnType<typeof useRosterRulesCheck>,
		{ revision: number; hasChanges: boolean }
	>
> =>
	renderHook(
		({ revision: shown, hasChanges: changed }) =>
			useRosterRulesCheck(target, shown, changed),
		{ wrapper, initialProps: { revision, hasChanges } }
	);

describe("useRosterRulesCheck", () => {
	it("sends nothing until asked, then answers with the check at the revision on screen", async () => {
		const calls = stubApi({
			[`POST ${ROSTER_CHECK}`]: { status: 200, body: envelope(CHECK) },
		});
		const { result } = hook(TARGET, 3);

		expect(result.current.status).toBe("idle");
		expect(calls).toHaveLength(0);

		act(() => {
			result.current.ask();
		});

		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		expect(calls.map((call) => call.body)).toEqual([{ expectedRevision: 3 }]);
		expect(result.current.last).toMatchObject({ revision: 3, check: CHECK });
		// When the answer came, which the Issues panel's head shows as "Checked 15:42".
		expect(result.current.last?.checkedAt).toBeGreaterThan(0);
	});

	it("is unasked again once the roster moves on, and keeps the last answer with its revision", async () => {
		stubApi({
			[`POST ${ROSTER_CHECK}`]: { status: 200, body: envelope(CHECK) },
		});
		const { result, rerender } = hook(TARGET, 1);
		act(() => {
			result.current.ask();
		});
		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});

		rerender({ revision: 2, hasChanges: false });

		expect(result.current.status).toBe("idle");
		expect(result.current.last).toMatchObject({ revision: 1, check: CHECK });
	});

	it("reads a refusal as what the note says", async () => {
		stubApi({
			[`POST ${ROSTER_CHECK}`]: {
				status: 503,
				body: {
					type: "about:blank",
					title: "Service Unavailable",
					status: 503,
					errorCode: "ROSTER_CHECK_ENGINE_NOT_CONFIGURED",
				},
			},
		});
		const { result } = hook(TARGET);
		act(() => {
			result.current.ask();
		});

		await waitFor(() => {
			expect(result.current).toMatchObject({
				status: "refused",
				refusal: "notConnected",
			});
		});
	});

	it("asks once by itself for a roster with hand changes, however often it renders", async () => {
		const calls = stubApi({
			[`POST ${ROSTER_CHECK}`]: { status: 200, body: envelope(CHECK) },
		});
		const { result, rerender } = hook(TARGET, 4, true);

		expect(result.current.status).toBe("loading");
		rerender({ revision: 4, hasChanges: true });
		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});
		rerender({ revision: 4, hasChanges: true });

		expect(calls.map((call) => call.body)).toEqual([{ expectedRevision: 4 }]);
		expect(result.current.last).toMatchObject({ revision: 4, check: CHECK });
	});

	it("asks by itself again once the revision changes while nothing was validated", async () => {
		const calls = stubApi({
			[`POST ${ROSTER_CHECK}`]: {
				status: 503,
				body: {
					type: "about:blank",
					title: "Service Unavailable",
					status: 503,
					errorCode: "ROSTER_CHECK_ENGINE_NOT_CONFIGURED",
				},
			},
		});
		const { result, rerender } = hook(TARGET, 1, true);
		await waitFor(() => {
			expect(result.current.status).toBe("refused");
		});

		rerender({ revision: 2, hasChanges: true });

		await waitFor(() => {
			expect(calls.map((call) => call.body)).toEqual([
				{ expectedRevision: 1 },
				{ expectedRevision: 2 },
			]);
		});
	});

	it("does not ask by itself for a roster nobody changed by hand", () => {
		const calls = stubApi({});
		const { result } = hook(TARGET, 1, false);

		expect(result.current.status).toBe("idle");
		expect(calls).toHaveLength(0);
	});

	it("does not ask by itself without the permission to validate", () => {
		const calls = stubApi({});
		const { result } = hook(undefined, 1, true);

		expect(result.current.status).toBe("idle");
		expect(calls).toHaveLength(0);
	});

	it("sends no second request when the window regains focus", async () => {
		const calls = stubApi({
			[`POST ${ROSTER_CHECK}`]: { status: 200, body: envelope(CHECK) },
		});
		const { result } = hook(TARGET, 1, true);
		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});

		act(() => {
			focusManager.setFocused(false);
			focusManager.setFocused(true);
		});
		// A refetch would have been sent by now: let the stubbed fetch settle.
		await act(
			() =>
				new Promise<void>((settle) => {
					setTimeout(settle, 50);
				})
		);

		expect(result.current.status).toBe("ready");
		expect(calls).toHaveLength(1);
	});

	it("sends no second request when asked while a check is in flight", async () => {
		const calls = stubApi({
			[`POST ${ROSTER_CHECK}`]: { status: 200, body: envelope(CHECK) },
		});
		const { result } = hook(TARGET, 1, true);

		act(() => {
			result.current.ask();
		});
		await waitFor(() => {
			expect(result.current.status).toBe("ready");
		});

		expect(calls).toHaveLength(1);
	});

	it("never asks without a target, for someone who may not change the roster", () => {
		const calls = stubApi({});
		const { result } = hook(undefined);

		act(() => {
			result.current.ask();
		});

		expect(result.current.status).toBe("idle");
		expect(calls).toHaveLength(0);
	});
});
