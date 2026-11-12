import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	coverOptionFixture,
	coverOptionsFixture,
} from "@/features/scheduling/cover/fixtures";
import {
	useCoverPanel,
	type CoverPanelInput,
} from "@/features/scheduling/cover/useCoverPanel";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import {
	rosterChangeFixture,
	rosterChangePreviewFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

/*
 * Front Desk AM one short on Saturday 17 October: Aisha (off that day) is
 * the suggested option, Chen the overtime one. The API is stubbed; the
 * hook's list, preview, apply and offer calls go through it.
 */

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const COVER_OPTIONS = `${SCHEDULE}/cover-options`;
const PREVIEW = `${SCHEDULE}/roster-changes/preview`;
const CHANGES = `${SCHEDULE}/roster-changes`;
const OFFERS = `${SCHEDULE}/cover-offers`;
const GAP = coverOptionsFixture().gap;
const roster = scheduleAssignmentsFixture();
/** The body of the last preview the hook asked for. */
const lastPreview = (
	calls: ReturnType<typeof stubApi>
): ReturnType<typeof stubApi>[number] | undefined =>
	calls.filter((call) => call.path === PREVIEW).slice(-1)[0];
const answer = (body: unknown): { status: number; body: unknown } => ({
	status: 200,
	body: envelope(body),
});

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
	<I18nextProvider i18n={authTestI18n}>
		<QueryClientProvider
			client={
				new QueryClient({ defaultOptions: { queries: { retry: false } } })
			}
		>
			{children}
		</QueryClientProvider>
	</I18nextProvider>
);

const hook = (
	props: Partial<CoverPanelInput> = {}
): {
	result: { current: ReturnType<typeof useCoverPanel> };
	input: CoverPanelInput;
} => {
	const input: CoverPanelInput = {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
			runId: "r-1",
		},
		revision: 1,
		gap: { shiftId: GAP.shiftId, day: GAP.day },
		assignments: roster,
		dayRow: roster.find((row) => row.day === GAP.day)!,
		shifts: frozenShiftsFixture(),
		onPreviewDays: vi.fn(),
		onApplied: vi.fn(),
		onCoverRecorded: vi.fn(),
		...props,
	};
	const { result } = renderHook(() => useCoverPanel(input), { wrapper });
	return { result, input };
};

describe("useCoverPanel", () => {
	it("given_options_when_listed_then_theFirstIsChosenPreviewedAndOutlinedOnTheGrid", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
		});
		const { result, input } = hook();

		await waitFor(() => {
			expect(result.current.review.preview).toBeDefined();
		});

		expect(result.current.status).toBe("options");
		expect(result.current.selected?.membershipId).toBe("m-1");
		expect(calls.find((call) => call.path === PREVIEW)?.body).toEqual({
			expectedRevision: 1,
			cells: coverOptionFixture().cells,
		});
		expect(input.onPreviewDays).toHaveBeenLastCalledWith([`m-1|${GAP.day}`]);
	});

	it("given_anotherOptionChosen_when_selected_then_itIsPreviewedInstead", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
		});
		const { result } = hook();
		await waitFor(() => {
			expect(result.current.status).toBe("options");
		});

		act(() => {
			result.current.select("m-3");
		});

		await waitFor(() => {
			expect(lastPreview(calls)?.body).toEqual({
				expectedRevision: 1,
				cells: coverOptionsFixture().options[1]!.cells,
			});
		});
		expect(result.current.selected?.membershipId).toBe("m-3");
	});

	it("given_theRosterMovedSinceTheRevision_when_listed_then_rosterMoved", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: {
				status: 409,
				body: {
					type: "about:blank",
					title: "Conflict",
					status: 409,
					errorCode: "ROSTER_REVISION_CONFLICT",
				},
			},
		});
		const { result } = hook();

		await waitFor(() => {
			expect(result.current.status).toBe("rosterMoved");
		});
	});

	it("given_theShiftCoveredElsewhere_when_listed_then_closed", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(
				coverOptionsFixture({
					gap: { ...GAP, shortBy: 0, shortSinceGeneration: 0 },
					options: [],
					unavailable: [],
				})
			),
		});
		const { result } = hook();

		await waitFor(() => {
			expect(result.current.status).toBe("closed");
		});
		expect(result.current.selected).toBeUndefined();
	});

	it("given_nobodyCanCover_when_listed_then_nobody", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture({ options: [] })),
		});
		const { result } = hook();

		await waitFor(() => {
			expect(result.current.status).toBe("nobody");
		});
	});

	it("given_aDraft_when_applied_then_theChangeGoesInAndTheRosterIsTold", async () => {
		const change = rosterChangeFixture();
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${CHANGES}`]: { status: 201, body: envelope(change) },
		});
		const { result, input } = hook();
		await waitFor(() => {
			expect(result.current.review.applyBlocked).toBe(false);
		});

		act(() => {
			result.current.review.apply();
		});

		await waitFor(() => {
			expect(input.onApplied).toHaveBeenCalled();
		});
		expect(calls.find((call) => call.path === CHANGES)?.body).toMatchObject({
			expectedRevision: 1,
			cells: coverOptionFixture().cells,
		});
		expect(result.current.offer).toBeUndefined();
	});

	it("given_aPublishedRoster_when_theOfferIsSent_then_aDayOffShiftOfferWithTheCells", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${OFFERS}`]: { status: 201, body: envelope(coverOfferFixture()) },
		});
		const { result } = hook({
			coverOffers: { offers: [], timeZone: "Asia/Singapore" },
		});
		await waitFor(() => {
			expect(result.current.offer?.ready).toBe(true);
		});

		expect(result.current.offer?.consentKind).toBe("OFF_DAY_SHIFT");
		act(() => {
			result.current.offer?.send();
		});

		await waitFor(() => {
			expect(calls.find((call) => call.path === OFFERS)).toBeDefined();
		});
		expect(calls.find((call) => call.path === OFFERS)?.body).toMatchObject({
			optionKind: "OFF_DAY_SHIFT",
			rosterDate: GAP.day,
			expectedRevision: 1,
			cells: coverOptionFixture().cells,
			send: true,
		});
	});
});
