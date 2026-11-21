import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { RepairOption } from "@/features/scheduling/cover/engineRepairApi";
import {
	callInOption,
	daySwapOption,
	moveOption,
	NOT_ASSIGNED_FIXTURE,
	repairOptionsFixture,
	stretchAfterOption,
	stretchBeforeOption,
} from "@/features/scheduling/cover/engineRepairFixtures";
import { coverOptionsFixture } from "@/features/scheduling/cover/fixtures";
import {
	rosterChangeFixture,
	rosterChangePreviewFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import { GapCover, type IssueCoverContext } from "./GapCover";

/*
 * A short shift's Issues row, open: Front Desk AM one short on Saturday 17
 * October, through the stubbed API. Aisha (off that day) and Chen (overtime)
 * are the backend's people; the engine's answer varies by test.
 */

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const COVER_OPTIONS = `${SCHEDULE}/cover-options`;
const PREVIEW = `${SCHEDULE}/roster-changes/preview`;
const CHANGES = `${SCHEDULE}/roster-changes`;
const REPAIR_OPTIONS = `${SCHEDULE}/repair-options`;
const GAP = coverOptionsFixture().gap;
const UNREACHABLE = "The engine could not be reached.";
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

/** The open row for the gap, on a draft unless `published`; gives its context. */
const show = (published = false): IssueCoverContext => {
	const cover: IssueCoverContext = {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
			runId: "r-1",
		},
		revision: 1,
		assignments: scheduleAssignmentsFixture(),
		shifts: frozenShiftsFixture(),
		coverOffers: published
			? { offers: [], timeZone: "Asia/Singapore" }
			: undefined,
		onPreviewDays: vi.fn(),
		onApplied: vi.fn(),
	};
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<GapCover cover={cover} gap={{ shiftId: GAP.shiftId, day: GAP.day }} />
			</QueryClientProvider>
		</I18nextProvider>
	);
	return cover;
};

describe("GapCover", () => {
	it("given_aDraftAndTheEngineAnswering_when_opened_then_oneLineWhileItWorksThenItsOptionsAsCardsOneSuggested", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture(
					[callInOption(), stretchAfterOption()],
					NOT_ASSIGNED_FIXTURE
				)
			),
		});
		show();

		expect(screen.getByText("Working out the options…")).toBeVisible();
		const cards = await screen.findAllByRole("listitem");
		expect(cards).toHaveLength(2);
		expect(cards[0]).toHaveTextContent(/Aisha Rahman.*Suggested.*Within hours/);
		expect(cards[1]).toHaveTextContent(
			/Ben Ong.*Stays on 2 h.*Lunch Rush .*\+2 h/
		);
		expect(screen.getAllByText("Suggested")).toHaveLength(1);
		const whyNot = screen.getByRole("button", { name: "Why not others (3)" });
		expect(whyNot).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Working out the options…")).toBeNull();
	});

	it("given_anEngineOption_when_reviewedAndApplied_then_itsChangeShowsInsideTheRowAndGoesIn", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${CHANGES}`]: {
				status: 201,
				body: envelope(rosterChangeFixture()),
			},
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture([callInOption()])
			),
		});
		const { onApplied } = show();
		const user = userEvent.setup();

		await user.click(
			await screen.findByRole("button", {
				name: "Review Aisha Rahman’s change",
			})
		);

		expect(
			screen.getByRole("heading", { name: "What changes for Aisha Rahman" })
		).toBeVisible();
		const apply = screen.getByRole("button", { name: "Apply change" });
		await waitFor(() => {
			expect(apply).toBeEnabled();
		});
		await user.click(apply);
		await waitFor(() => {
			expect(onApplied).toHaveBeenCalled();
		});
		expect(calls.find((call) => call.path === CHANGES)?.body).toMatchObject({
			cells: [{ membershipId: "m-1", day: GAP.day, kind: "WORK" }],
		});
	});

	it("given_theEngineUnreachable_when_opened_then_thePlainLineAndTheBackendsPeopleWithTheirWeekInTheReview", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: { status: 503 },
		});
		show();
		const user = userEvent.setup();

		expect(await screen.findByText(UNREACHABLE)).toBeVisible();
		expect(
			screen.getByText("Free by their hours, not checked against the rules")
		).toBeVisible();
		const cards = await screen.findAllByRole("listitem");
		expect(cards[0]).toHaveTextContent(
			/Aisha Rahman.*Suggested.*Not rule-checked/
		);
		await user.click(
			within(cards[0]!).getByRole("button", { name: /^Review/ })
		);

		expect(screen.getByText("This week 24 → 30 h of 44 h")).toBeVisible();
		expect(screen.getByRole("progressbar")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Back" }));
		expect(screen.getAllByRole("button", { name: /^Review/ })).toHaveLength(2);
	});

	/** The open row with the engine answering `options` (and `answer` overrides). */
	const showAnswer = async (
		options: Array<RepairOption>,
		overrides: Parameters<typeof repairOptionsFixture>[2] = {},
		notAssigned: Parameters<typeof repairOptionsFixture>[1] = []
	): Promise<void> => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture(options, notAssigned, overrides)
			),
		});
		show();
		await waitFor(() => {
			expect(screen.queryByText("Working out the options…")).toBeNull();
		});
	};

	it("given_fourOptions_when_shown_then_threeCardsAndTheRestBehindShowAll", async () => {
		const user = userEvent.setup();
		await showAnswer([
			callInOption(),
			moveOption(),
			daySwapOption(),
			stretchAfterOption(),
		]);

		expect(screen.getAllByRole("button", { name: /^Review/ })).toHaveLength(3);
		expect(screen.queryByText("Cover part of it")).toBeNull();
		await user.click(screen.getByRole("button", { name: "Show all 4" }));

		expect(screen.getAllByRole("button", { name: /^Review/ })).toHaveLength(4);
		expect(screen.getByText("Cover part of it")).toBeVisible();
	});

	it("given_partFillsAfterAFullOne_when_shown_then_theyAreUnderTheirCaptionAndOnlyTheFirstIsSuggested", async () => {
		await showAnswer([
			callInOption(),
			stretchAfterOption(),
			stretchBeforeOption(),
		]);

		const cards = screen.getAllByRole("listitem");
		expect(cards[1]).toHaveTextContent(/^Cover part of it.*Ben Ong/);
		expect(screen.getAllByText("Suggested")).toHaveLength(1);
		expect(cards[0]).toHaveTextContent("Suggested");
	});

	it("given_onlyPartFills_when_shown_then_saysNothingCoversTheWholeShiftAndSuggestsNone", async () => {
		await showAnswer([stretchAfterOption(), stretchBeforeOption()]);

		expect(screen.getByText("Nothing covers the whole shift.")).toBeVisible();
		expect(screen.queryByText("Suggested")).toBeNull();
		expect(screen.queryByText("Cover part of it")).toBeNull();
	});

	it("given_aSearchCutShort_when_shown_then_saysSoWithTryAgainAndHowManyWereFound", async () => {
		await showAnswer([callInOption()], {
			search: { complete: false, optionsFound: 12 },
		});

		expect(
			screen.getByText("Ran out of time. These are the options found so far.")
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
		expect(screen.getByText("The best 1 of 12.")).toBeVisible();
		expect(screen.getByText("1 option found")).toHaveClass("sr-only");
	});

	it("given_noOptionAtAll_when_shown_then_saysNobodyCanAndWhyNotIsOpen", async () => {
		await showAnswer([], {}, NOT_ASSIGNED_FIXTURE);

		expect(
			screen.getByText("Nobody can cover this within the rules.")
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Why not others (3)" })
		).toHaveAttribute("aria-expanded", "true");
	});

	it("given_someoneWithACard_when_whyNotOpens_then_theyAreNotListedAgain", async () => {
		await showAnswer([callInOption()], {}, [
			...NOT_ASSIGNED_FIXTURE,
			{
				memberProfileId: "mp-1",
				name: "Aisha Rahman",
				couldTake: true,
				reasons: [],
			},
		]);

		expect(
			screen.getByRole("button", { name: "Why not others (3)" })
		).toBeVisible();
	});

	it.each([
		[504, "REPAIR_ENGINE_TOO_SLOW", "The engine took too long.", "Try again"],
		[503, "REPAIR_ENGINE_NOT_CONFIGURED", UNREACHABLE, "Try again"],
		[500, undefined, UNREACHABLE, "Try again"],
		[
			409,
			"ROSTER_REVISION_CONFLICT",
			"The roster changed.",
			"Find options again",
		],
		[
			410,
			"REPAIR_GAP_EXPIRED",
			"This roster’s engine run is no longer kept. Generate the week again to get checked options.",
			undefined,
		],
		[
			409,
			"REPAIR_GAP_NOT_SEEN_BY_ENGINE",
			"The engine counts this shift as staffed.",
			undefined,
		],
	])(
		"given_theEngineRefusing_%s_%s_when_opened_then_itsLineAndAction",
		async (status, errorCode, line, action) => {
			stubApi({
				[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
				[`POST ${REPAIR_OPTIONS}`]: {
					status,
					body: errorCode ? { errorCode } : undefined,
				},
			});
			show();

			const alert = await screen.findByText(line);
			expect(alert.closest("[role=alert]")).not.toBeNull();
			const buttons = within(alert.closest("[role=alert]") as HTMLElement)
				.queryAllByRole("button")
				.map((button) => button.textContent);
			expect(buttons).toEqual(action ? [action] : []);
		}
	);

	it("given_aRefusal_when_triedAgain_then_theHoursBasedPeopleStayWhileItAsks", async () => {
		const replies = [
			{ status: 504, body: { errorCode: "REPAIR_ENGINE_TOO_SLOW" } },
		];
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: replies,
		});
		show();
		const user = userEvent.setup();
		await screen.findByText("The engine took too long.");
		const fetchOnce = vi.fn((): Promise<Response> => new Promise(() => {}));
		const stubbed = globalThis.fetch;
		vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
			url.endsWith("/repair-options") ? fetchOnce() : stubbed(url, init)
		);

		await user.click(screen.getByRole("button", { name: "Try again" }));

		expect(await screen.findByText("Working out the options…")).toBeVisible();
		expect(screen.getAllByRole("button", { name: /^Review/ })).toHaveLength(2);
		expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
	});

	it("given_aCardReviewed_when_backIsPressed_then_focusReturnsToItsReview", async () => {
		const user = userEvent.setup();
		await showAnswer([callInOption(), moveOption()]);

		await user.click(
			screen.getByRole("button", { name: "Review Ben Ong’s change" })
		);
		await user.click(await screen.findByRole("button", { name: "Back" }));

		expect(
			screen.getByRole("button", { name: "Review Ben Ong’s change" })
		).toHaveFocus();
	});
});

describe("GapCover: a long wait", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("given_theEngineStillWorkingAfterEightSeconds_when_waited_then_saysItCanTakeHalfAMinute", async () => {
		stubApi({ [`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()) });
		vi.stubGlobal("fetch", (url: string) =>
			url.endsWith("/repair-options")
				? new Promise(() => {})
				: Promise.resolve(
						new Response(JSON.stringify(envelope(coverOptionsFixture())), {
							status: 200,
						})
					)
		);
		show();

		expect(screen.getByText("Working out the options…")).toBeVisible();
		expect(screen.queryByText(/Still working/)).toBeNull();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(8_000);
		});

		expect(
			screen.getByText("Still working. This can take up to half a minute.")
		).toBeVisible();
	});
});
