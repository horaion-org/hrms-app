import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	callInOption,
	daySwapOption,
	repairOptionsFixture,
	stretchAfterOption,
	stretchPairOption,
} from "@/features/scheduling/cover/engineRepairFixtures";
import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
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
 * the first option, Chen the overtime one. The API is stubbed; the hook's
 * list, preview, apply, offer and engine calls go through it. An engine call
 * left unstubbed is answered 404, which the panel reads as the engine failing,
 * so the backend's list is the fallback.
 */

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const COVER_OPTIONS = `${SCHEDULE}/cover-options`;
const PREVIEW = `${SCHEDULE}/roster-changes/preview`;
const CHANGES = `${SCHEDULE}/roster-changes`;
const OFFERS = `${SCHEDULE}/cover-offers`;
const REPAIR_OPTIONS = `${SCHEDULE}/repair-options`;
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
	it("given_aDraftAndTheEngineAnswering_when_opened_then_theEngineIsAskedAndNobodyOfTheBackendListIsChosenOrPreviewed", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture([callInOption()], [])
			),
		});
		const { result, input } = hook();

		expect(result.current.view).toBe("engine");
		await waitFor(() => {
			expect(result.current.engineRepair.status).toBe("ready");
		});
		await waitFor(() => {
			expect(result.current.status).toBe("options");
		});

		expect(result.current.view).toBe("engine");
		expect(result.current.selected).toBeUndefined();
		expect(calls.some((call) => call.path === PREVIEW)).toBe(false);
		expect(input.onPreviewDays).toHaveBeenLastCalledWith([]);
	});

	it("given_aDraftAndTheEngineFailing_when_opened_then_theBackendListIsTheFallback", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: { status: 503 },
		});
		const { result } = hook();

		await waitFor(() => {
			expect(result.current.view).toBe("backendFallback");
		});
		await waitFor(() => {
			expect(result.current.selected?.membershipId).toBe("m-1");
		});
	});

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

	it("given_aRosterThatCannotBeChangedNow_when_listed_then_notEditableRatherThanAFailureToRetry", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: {
				status: 409,
				body: {
					type: "about:blank",
					title: "Conflict",
					status: 409,
					errorCode: "SCHEDULE_ROSTER_NOT_EDITABLE",
				},
			},
		});
		const { result } = hook();

		await waitFor(() => {
			expect(result.current.status).toBe("notEditable");
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

	describe("an engine option", () => {
		/** The panel with the engine answering `option` at revision 5, chosen once the answer is in. */
		const chooseOption = async (
			option: RepairOption,
			routes: Parameters<typeof stubApi>[0] = {},
			props: Partial<CoverPanelInput> = {}
		): Promise<{
			result: { current: ReturnType<typeof useCoverPanel> };
			calls: ReturnType<typeof stubApi>;
			input: CoverPanelInput;
		}> => {
			const calls = stubApi({
				[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
				[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
				[`POST ${REPAIR_OPTIONS}`]: answer(
					repairOptionsFixture([option], [], { revision: 5 })
				),
				...routes,
			});
			const { result, input } = hook(props);
			await waitFor(() => {
				expect(result.current.engineRepair.status).toBe("ready");
			});
			act(() => {
				result.current.chooseRepair(option);
			});
			await waitFor(() => {
				expect(lastPreview(calls)).toBeDefined();
			});
			return { result, calls, input };
		};

		it("given_anOptionChosen_when_previewedAndApplied_then_itsCellsAsSentAtTheAnswersRevisionAndItsKindOnApplyOnly", async () => {
			const option = daySwapOption();
			const { result, calls, input } = await chooseOption(option, {
				[`POST ${CHANGES}`]: {
					status: 201,
					body: envelope(rosterChangeFixture()),
				},
			});

			expect(lastPreview(calls)?.body).toEqual({
				expectedRevision: 5,
				cells: option.cells,
			});
			await waitFor(() => {
				expect(result.current.review.applyBlocked).toBe(false);
			});
			act(() => {
				result.current.review.apply();
			});
			await waitFor(() => {
				expect(input.onApplied).toHaveBeenCalled();
			});
			expect(calls.find((call) => call.path === CHANGES)?.body).toEqual({
				expectedRevision: 5,
				cells: option.cells,
				repairOptionKind: "DAY_SWAP",
			});
		});

		it("given_aPartFillApplied_when_itLands_then_theToastSaysWhatIsStillShort", async () => {
			const { result, input } = await chooseOption(stretchAfterOption(), {
				[`POST ${CHANGES}`]: {
					status: 201,
					body: envelope(rosterChangeFixture()),
				},
			});
			await waitFor(() => {
				expect(result.current.review.applyBlocked).toBe(false);
			});

			act(() => {
				result.current.review.apply();
			});

			await waitFor(() => {
				expect(input.onApplied).toHaveBeenCalledWith(
					expect.anything(),
					"Roster changed. Front Desk AM is still 1 short 09:00 – 11:00."
				);
			});
		});

		it("given_theRosterMovedUnderTheOption_when_applied_then_applyWaitsAndFindingAgainLetsGo", async () => {
			const { result } = await chooseOption(stretchAfterOption(), {
				[`POST ${CHANGES}`]: {
					status: 409,
					body: { errorCode: "ROSTER_REVISION_CONFLICT" },
				},
			});
			await waitFor(() => {
				expect(result.current.review.applyBlocked).toBe(false);
			});

			act(() => {
				result.current.review.apply();
			});

			await waitFor(() => {
				expect(result.current.review.applyRefusal).toBe("revision");
			});
			expect(result.current.review.applyBlocked).toBe(true);
			act(() => {
				result.current.review.findOptionsAgain();
			});
			expect(result.current.repairChosen).toBe(false);
		});

		it("given_aPublishedRoster_when_onePersonsOptionIsSent_then_anOfferOfItsKindForTheDayItAddsWork", async () => {
			const option = stretchAfterOption();
			const { result, calls } = await chooseOption(
				option,
				{
					[`POST ${OFFERS}`]: {
						status: 201,
						body: envelope(coverOfferFixture()),
					},
				},
				{ coverOffers: { offers: [], timeZone: "Asia/Singapore" } }
			);
			await waitFor(() => {
				expect(result.current.offer?.ready).toBe(true);
			});

			expect(result.current.offer?.consentKind).toBe("STRETCH");
			expect(result.current.review.bothMustAgree).toBe(false);
			act(() => {
				result.current.offer?.send();
			});

			await waitFor(() => {
				expect(calls.find((call) => call.path === OFFERS)?.body).toMatchObject({
					optionKind: "STRETCH",
					rosterDate: GAP.day,
					expectedRevision: 5,
					cells: option.cells,
					send: true,
				});
			});
		});

		it("given_aPublishedRoster_when_aTwoPersonOptionIsReviewed_then_noOfferAndApplyWaitsForARemark", async () => {
			const { result } = await chooseOption(
				stretchPairOption(),
				{},
				{
					coverOffers: { offers: [], timeZone: "Asia/Singapore" },
				}
			);
			await waitFor(() => {
				expect(result.current.review.preview).toBeDefined();
			});

			expect(result.current.offer?.consentKind).toBeUndefined();
			expect(result.current.review.bothMustAgree).toBe(true);
			expect(result.current.review.applyBlocked).toBe(true);
			act(() => {
				result.current.review.setRemark("Both said yes by phone.");
			});
			expect(result.current.review.applyBlocked).toBe(false);
		});
	});
});
