import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState, type ReactElement } from "react";
import { initReactI18next } from "react-i18next";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import en from "@/assets/locales/en/translations.json";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi, type StubReply } from "@/common/testing/stubApi";
import { WEEKLY_RULE_FIXTURE } from "@/features/scheduling/constraints/fixtures";
import {
	GeneratedRoster,
	type GeneratedRosterProps,
} from "@/features/scheduling/roster/GeneratedRoster";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import {
	rosterChangeFixture,
	rosterChangePreviewFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import {
	ruleFixture,
	rulesCheckFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

const CHANGES =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/roster-changes";
const PREVIEW = `${CHANGES}/preview`;

const FRIDAY = "2026-10-16";
const SUNDAY = "2026-10-18";

/** The engine's sentence for someone short of a rest day that week. */
const sentenceOf = (name: string): string =>
	`${name}: needs at least 1 day of Rest day in the week of 12 Oct to 18 Oct: missed by 1 day.`;

const GENERAL_ADVICE =
	"What to do: Change one of this person’s shifts in that week to a rest day (or a day off).";
const MAKE_IT = "Make it a rest day";
const MAKE_ALL =
	"Give each of these 2 people a rest day on one of their days off";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
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

/**
 * The fixture's week with no rest day for the two full-timers: Aisha has
 * Saturday and Sunday as days off, Chen has Friday as a day off and works
 * the rest. `changes` set single days apart, by assignment id.
 */
const weekWithoutRestDays = (
	changes: Record<string, Partial<ScheduleAssignment>> = {}
): Array<ScheduleAssignment> =>
	scheduleAssignmentsFixture().map((row) => ({
		...row,
		...(row.member?.memberProfileId === "mp-1" && row.day === SUNDAY
			? { dayType: "OFF" }
			: {}),
		...changes[row.assignmentId],
	}));

/** Validate schedule's answer: the weekly rest rule broken by Aisha and Chen, each marked on the week's first day. */
const check = rulesCheckFixture({
	status: "BROKEN",
	brokenRules: [
		ruleFixture({
			rule: "days_of_day_types_per_period",
			constraintId: WEEKLY_RULE_FIXTURE.constraintId,
			constraintName: WEEKLY_RULE_FIXTURE.name,
			violations: [
				{
					employeeId: "mp-1",
					date: "2026-10-12",
					messages: [sentenceOf("Aisha Rahman")],
				},
				{
					employeeId: "mp-3",
					date: "2026-10-12",
					messages: [sentenceOf("Chen Wei")],
				},
			],
		}),
	],
});

/** The roster with its view kept as its page keeps it in the URL, starting on the fixtures' week. */
const Roster = (
	props: Omit<GeneratedRosterProps, "view" | "onViewChange">
): ReactElement => {
	const [view, setView] = useState<RosterSearch>({ week: "2026-10-12" });
	return <GeneratedRoster {...props} view={view} onViewChange={setView} />;
};

/** Shows the validated roster with Issues open, for someone who may change it unless `mayEdit` is false. */
const showIssues = async ({
	assignments = weekWithoutRestDays(),
	published = false,
	mayEdit = true,
}: {
	assignments?: Array<ScheduleAssignment>;
	published?: boolean;
	mayEdit?: boolean;
} = {}): Promise<{ user: UserEvent; panel: HTMLElement }> => {
	const user = userEvent.setup();
	render(
		<QueryClientProvider
			client={
				new QueryClient({ defaultOptions: { queries: { retry: false } } })
			}
		>
			<Roster
				assignments={assignments}
				constraints={[WEEKLY_RULE_FIXTURE]}
				schedule={generatedScheduleFixture({ status: "GENERATED" })}
				editing={
					mayEdit
						? {
								target: {
									companyId: "c-1",
									unit: { branchId: "b-1", departmentId: "d-1" },
									scheduleId: "s-1",
									runId: "r-1",
								},
								revision: 1,
								shifts: [],
								nonWorkingDayTypes: ["OFF", "REST"],
								notifiesMembers: published,
							}
						: undefined
				}
				validation={{
					status: "ready",
					check,
					ask: vi.fn(),
					last: { revision: 1, check },
					revision: 1,
				}}
			/>
		</QueryClientProvider>
	);
	await user.click(screen.getByRole("button", { name: /^Issues: / }));
	return {
		user,
		panel: screen.getByRole("complementary", { name: "Issues" }),
	};
};

/** The Issues row about `name`, opened (each row opens inline, under itself). */
const rowOf = async (
	user: ReturnType<typeof userEvent.setup>,
	panel: HTMLElement,
	name: string
): Promise<HTMLElement> => {
	const rowButton = within(panel).getByRole("button", {
		name: new RegExp(`${WEEKLY_RULE_FIXTURE.name}.*${name}`),
		expanded: false,
	});
	await user.click(rowButton);
	const row = rowButton.closest("li") as HTMLElement;
	expect(row).toHaveTextContent(sentenceOf(name));
	return row;
};

/** The words of the buttons a row opens to, the row's own button left out. */
const bodyButtons = (row: HTMLElement): Array<string | null> =>
	within(row)
		.getAllByRole("button")
		.slice(1)
		.map((button) => button.textContent);

/** A preview with nothing standing against the change. */
const cleanPreview: StubReply = {
	status: 200,
	body: envelope(
		rosterChangePreviewFixture({ checks: [], checksFingerprint: "fp-1" })
	),
};

/** The change landing. */
const applied: StubReply = {
	status: 201,
	body: envelope(rosterChangeFixture()),
};

/** The bodies sent to a route, in order. */
const bodiesTo = (
	calls: ReturnType<typeof stubApi>,
	path: string
): Array<unknown> =>
	calls
		.filter((call) => call.method === "POST" && call.path === path)
		.map((call) => call.body);

const aishaSunday = {
	membershipId: "m-1",
	day: SUNDAY,
	kind: "OFF",
	dayType: "REST",
};
const chenFriday = {
	membershipId: "m-3",
	day: FRIDAY,
	kind: "OFF",
	dayType: "REST",
};

describe("GeneratedRoster: the fix on a weekly day-type issue", () => {
	it("given_someoneWithDaysOffThatWeek_when_issuesOpens_then_theRowNamesTheLastOneAndOffersToMakeItTheRestDay", async () => {
		stubApi({});
		const { user, panel } = await showIssues();

		const row = await rowOf(user, panel, "Aisha Rahman");
		expect(row).toHaveTextContent(
			/What to do: Sun.*18.* is a day off for Aisha Rahman\. Make it the rest day\./
		);
		expect(row).not.toHaveTextContent(GENERAL_ADVICE);
		expect(bodyButtons(row)).toEqual([MAKE_IT, "Show"]);
	});

	it("given_someoneWhoseOnlyDayNotWorkedIsLeave_when_issuesOpens_then_theRowReadsAsBeforeWithShowOnly", async () => {
		stubApi({});
		const { user, panel } = await showIssues({
			assignments: weekWithoutRestDays({
				[`a-mp-3-${FRIDAY}`]: { offReason: "LEAVE" },
			}),
		});

		const row = await rowOf(user, panel, "Chen Wei");
		expect(row).toHaveTextContent(GENERAL_ADVICE);
		expect(bodyButtons(row)).toEqual(["Show"]);
	});

	it("given_someoneWhoMayNotChangeTheRoster_when_issuesOpens_then_noFixIsOffered", async () => {
		stubApi({});
		const { user, panel } = await showIssues({ mayEdit: false });

		expect(await rowOf(user, panel, "Aisha Rahman")).toHaveTextContent(
			GENERAL_ADVICE
		);
		expect(within(panel).queryByRole("button", { name: MAKE_IT })).toBeNull();
		expect(within(panel).queryByRole("button", { name: MAKE_ALL })).toBeNull();
	});

	it("given_aRosterNotPublished_when_theFixIsPressed_then_itPreviewsAndAppliesTheRetypeAndSaysRosterChanged", async () => {
		const calls = stubApi({
			[`POST ${PREVIEW}`]: cleanPreview,
			[`POST ${CHANGES}`]: applied,
		});
		const { user, panel } = await showIssues();

		const row = await rowOf(user, panel, "Aisha Rahman");
		await user.click(within(row).getByRole("button", { name: MAKE_IT }));

		expect(await screen.findByText("Roster changed.")).toBeVisible();
		expect(bodiesTo(calls, PREVIEW)).toEqual([
			{ expectedRevision: 1, cells: [aishaSunday] },
		]);
		expect(bodiesTo(calls, CHANGES)).toEqual([
			{ expectedRevision: 1, cells: [aishaSunday], checksFingerprint: "fp-1" },
		]);
		// The list stays open: it validates again by itself once the roster moves.
		expect(screen.getByRole("complementary", { name: "Issues" })).toBeVisible();
	});

	it("given_theRosterMovedSince_when_theFixIsPressed_then_theRowSaysSoInTheDayEditorsWords", async () => {
		stubApi({
			[`POST ${PREVIEW}`]: cleanPreview,
			[`POST ${CHANGES}`]: {
				status: 409,
				body: { errorCode: "ROSTER_REVISION_CONFLICT" },
			},
			// The roster is read again after a stale revision.
		});
		const { user, panel } = await showIssues();

		const row = await rowOf(user, panel, "Aisha Rahman");
		await user.click(within(row).getByRole("button", { name: MAKE_IT }));

		expect(await within(row).findByRole("alert")).toHaveTextContent(en.scheduling.rosterEdit.error.revision);
		expect(screen.queryByText("Roster changed.")).toBeNull();
	});

	it("given_aCheckThatAsksForATick_when_theFixIsPressed_then_nothingIsAppliedAndTheDaysEditorOpensWithTheTypeChosen", async () => {
		const calls = stubApi({
			[`POST ${PREVIEW}`]: {
				status: 200,
				body: envelope(
					rosterChangePreviewFixture({
						checks: [
							rosterCheckFixture({
								severity: "NEEDS_ACKNOWLEDGEMENT",
								membershipId: "m-1",
								day: SUNDAY,
							}),
						],
					})
				),
			},
		});
		const { user, panel } = await showIssues();

		const row = await rowOf(user, panel, "Aisha Rahman");
		await user.click(within(row).getByRole("button", { name: MAKE_IT }));

		expect(
			await screen.findByRole("radio", { name: "Another day type" })
		).toBeChecked();
		expect(bodiesTo(calls, CHANGES)).toEqual([]);
	});

	it("given_aPublishedRoster_when_theFixIsPressed_then_theDaysEditorOpensWithTheRestDayChosenAndNothingIsApplied", async () => {
		const calls = stubApi({ [`POST ${PREVIEW}`]: cleanPreview });
		const { user, panel } = await showIssues({ published: true });

		expect(within(panel).queryByRole("button", { name: MAKE_ALL })).toBeNull();
		const row = await rowOf(user, panel, "Aisha Rahman");
		await user.click(within(row).getByRole("button", { name: MAKE_IT }));

		expect(
			await screen.findByRole("radio", { name: "Another day type" })
		).toBeChecked();
		expect(screen.getByRole("button", { name: "Day type" })).toHaveTextContent(
			"Rest day"
		);
		// The editor previews the chosen change itself; nothing is applied until the manager says so.
		expect(bodiesTo(calls, PREVIEW)).toEqual([
			{ expectedRevision: 1, cells: [aishaSunday] },
		]);
		expect(bodiesTo(calls, CHANGES)).toEqual([]);
	});

	it("given_twoRowsWithAFix_when_fixThemAllIsPressed_then_everyDayGoesInOneChange", async () => {
		const calls = stubApi({
			[`POST ${PREVIEW}`]: cleanPreview,
			[`POST ${CHANGES}`]: applied,
		});
		const { user, panel } = await showIssues();

		await user.click(within(panel).getByRole("button", { name: MAKE_ALL }));

		expect(await screen.findByText("Roster changed.")).toBeVisible();
		expect(bodiesTo(calls, CHANGES)).toEqual([
			{
				expectedRevision: 1,
				cells: [aishaSunday, chenFriday],
				checksFingerprint: "fp-1",
			},
		]);
	});

	it("given_aDayACheckRefuses_when_fixThemAllIsPressed_then_theOthersAreChangedAndItSaysHowMany", async () => {
		const calls = stubApi({
			[`POST ${PREVIEW}`]: [
				{
					status: 200,
					body: envelope(
						rosterChangePreviewFixture({
							refused: true,
							checks: [
								rosterCheckFixture({
									code: "MEMBER_GONE",
									severity: "REFUSED",
									membershipId: "m-3",
									day: FRIDAY,
								}),
							],
						})
					),
				},
				cleanPreview,
			],
			[`POST ${CHANGES}`]: applied,
		});
		const { user, panel } = await showIssues();

		await user.click(within(panel).getByRole("button", { name: MAKE_ALL }));

		expect(
			await within(panel).findByText(
				"1 of 2 changed. The others need a look first: use each one’s own button."
			)
		).toBeVisible();
		expect(bodiesTo(calls, PREVIEW)).toEqual([
			{ expectedRevision: 1, cells: [aishaSunday, chenFriday] },
			{ expectedRevision: 1, cells: [aishaSunday] },
		]);
		expect(bodiesTo(calls, CHANGES)).toEqual([
			{ expectedRevision: 1, cells: [aishaSunday], checksFingerprint: "fp-1" },
		]);
	});

	it("given_theChangeIsRefused_when_fixThemAllIsPressed_then_nothingIsChangedAndItSaysWhy", async () => {
		stubApi({
			[`POST ${PREVIEW}`]: cleanPreview,
			[`POST ${CHANGES}`]: {
				status: 422,
				body: { errorCode: "ROSTER_CHANGE_REFUSED" },
			},
		});
		const { user, panel } = await showIssues();

		await user.click(within(panel).getByRole("button", { name: MAKE_ALL }));

		expect(await within(panel).findByRole("alert")).toHaveTextContent(
			en.scheduling.rosterEdit.error.refused
		);
		expect(screen.queryByText("Roster changed.")).toBeNull();
	});
});
