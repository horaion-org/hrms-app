import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as Router from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	callInOption,
	repairOptionsFixture,
} from "@/features/scheduling/cover/engineRepairFixtures";
import {
	rosterChangeFixture,
	rosterChangePreviewFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import {
	GeneratedRoster,
	type GeneratedRosterProps,
} from "@/features/scheduling/roster/GeneratedRoster";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import {
	ruleFixture,
	rulesCheckFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	useRosterRulesCheck,
	type RosterRulesCheckState,
	type RosterValidation,
} from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import {
	emptyFindingsFixture,
	generatedScheduleFixture,
	generationFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof Router>()),
	Link: ({
		search,
		children,
	}: {
		search: Record<string, string>;
		children: React.ReactNode;
	}): React.JSX.Element => (
		<a href={`/leave?${new URLSearchParams(search).toString()}`}>{children}</a>
	),
}));

const schedule = generatedScheduleFixture({ status: "GENERATED" });

/** The roster with its view kept as its page keeps it in the URL, starting on the fixtures' week. */
const Roster = (
	props: Omit<GeneratedRosterProps, "view" | "onViewChange">
): ReactElement => {
	const [view, setView] = useState<RosterSearch>({ week: "2026-10-12" });
	return <GeneratedRoster {...props} view={view} onViewChange={setView} />;
};

describe("GeneratedRoster", () => {
	it("given_aGeneratedWeek_when_rendered_then_sumsItUpInOneLineAndShowsEachMember", () => {
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);

		expect(
			screen.getByText(
				"3 people · 15 shifts · 3 days off · 2 days on leave · 94 h"
			)
		).toBeInTheDocument();
		expect(screen.queryByRole("region")).toBeNull();
		const roster = screen.getByRole("table", { name: "Roster" });
		expect(within(roster).getAllByRole("row")).toHaveLength(4);
	});

	it("given_aColleaguesLeaveNote_when_theirDayIsChosen_then_itsPanelSaysItAndOpensTheirRequestAsAReviewer", async () => {
		const user = userEvent.setup();
		const [first, ...rest] = scheduleAssignmentsFixture();
		if (!first?.member) throw new Error("fixture has a member");

		render(
			<Roster
				schedule={schedule}
				viewerMembershipId="someone-else"
				assignments={[
					{ ...first, flag: "LEAVE_REQUESTED", leaveRequestId: "r1" },
					...rest,
				]}
			/>
		);

		expect(screen.queryByText("Leave requested")).toBeNull();
		await user.click(
			screen.getByRole("button", {
				name: "Aisha Rahman, Mon 09:00 – 15:00, needs a look: 1",
			})
		);

		const panel = screen.getByRole("complementary", { name: "Shift Details" });
		const notes = within(panel).getByRole("region", { name: "Needs a look" });
		expect(notes).toHaveTextContent("Leave requested");
		expect(
			within(notes).getByRole("link", { name: "Review in Leave" })
		).toHaveAttribute(
			"href",
			`/leave?requestId=r1&memberId=${first.member.membershipId}&view=requests`
		);
	});

	it("given_aMembersOwnView_when_renderedWithoutTheSummary_then_onlyTheRoster", () => {
		render(
			<Roster
				assignments={scheduleAssignmentsFixture()}
				withSummary={false}
				schedule={{
					periodStart: schedule.periodStart,
					periodEnd: schedule.periodEnd,
					coveredFrom: schedule.coveredFrom,
					coveredTo: schedule.coveredTo,
					timeZone: schedule.timeZone,
				}}
			/>
		);

		expect(screen.queryByText(/ shifts · /)).toBeNull();
		expect(screen.queryByRole("button", { name: /^Issues/ })).toBeNull();
		expect(screen.queryByRole("button", { name: /^Changed/ })).toBeNull();
		const roster = screen.getByRole("table", { name: "Roster" });
		expect(within(roster).getAllByRole("row")).toHaveLength(4);
	});

	it("given_aChosenDay_when_clicked_then_showsItsShiftReadOnly", async () => {
		const user = userEvent.setup();
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);

		await user.click(
			screen.getByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" })
		);

		const panel = screen.getByRole("complementary", { name: "Shift Details" });
		expect(panel).toHaveTextContent("ShiftLunch Rush");
		expect(screen.queryByRole("button", { name: "Edit Shift" })).toBeNull();
	});

	describe("on a phone, one day at a time", () => {
		/** The day headers left visible below `md`, as their weekday. */
		const shownDays = (): Array<string | null> =>
			within(screen.getByRole("table", { name: "Roster" }))
				.getAllByRole("columnheader")
				.slice(1)
				.filter((header) => !header.classList.contains("hidden"))
				.map((header) => header.textContent);

		it("given_noDayChosen_when_rendered_then_showsTheWeeksFirstDayWithItsSwitcher", () => {
			render(
				<Roster
					assignments={scheduleAssignmentsFixture()}
					schedule={schedule}
				/>
			);

			expect(shownDays()).toEqual(["MonOct 12"]);
			expect(
				screen.getByRole("button", { name: "Monday, October 12" })
			).toHaveAttribute("aria-pressed", "true");
		});

		it("given_theSwitcher_when_anotherDayIsChosen_then_showsThatDaysColumn", async () => {
			const user = userEvent.setup();
			render(
				<Roster
					assignments={scheduleAssignmentsFixture()}
					schedule={schedule}
				/>
			);

			await user.click(
				screen.getByRole("button", { name: "Tuesday, October 13" })
			);
			expect(shownDays()).toEqual(["TueOct 13"]);
			await user.click(
				screen.getByRole("button", { name: "Friday, October 16" })
			);
			expect(shownDays()).toEqual(["FriOct 16"]);
		});

		it("given_aTileOnAnotherDay_when_chosen_then_showsThatDaySoTheTileStaysInView", async () => {
			const user = userEvent.setup();
			render(
				<Roster
					assignments={scheduleAssignmentsFixture()}
					schedule={schedule}
				/>
			);

			await user.click(
				screen.getByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" })
			);

			expect(shownDays()).toEqual(["FriOct 16"]);
		});
	});

	it("given_aPanelOpensBesideTheGrid_when_shown_then_tilesShowTheirTimeOnly", async () => {
		const user = userEvent.setup();
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);
		const aisha = screen.getByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00",
		});
		expect(aisha).toHaveTextContent(/^09:00 – 15:00Front Desk AM$/);

		await user.click(
			screen.getByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" })
		);

		expect(aisha).toHaveTextContent(/^09:00 – 15:00$/);
	});

	it("given_noRows_when_rendered_then_saysNoOneIsRostered", () => {
		render(<Roster assignments={[]} schedule={schedule} />);

		expect(
			screen.getByText("No one is rostered in this schedule.")
		).toBeInTheDocument();
	});

	it("given_aDayMarkedForLeave_when_itsLeaveAndCoverRowOpens_then_saysTheLeaveRequested", async () => {
		const [first, ...rest] = scheduleAssignmentsFixture();
		if (!first) throw new Error("fixture has a day");
		render(
			<Roster
				schedule={schedule}
				assignments={[
					{ ...first, flag: "LEAVE_REQUESTED", leaveTypeName: "Annual leave" },
					...rest,
				]}
			/>
		);
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /^Issues/ }));

		const panel = screen.getByRole("complementary", { name: "Issues" });
		await user.click(
			within(panel).getByRole("button", { name: /Leave and cover/ })
		);
		expect(
			within(panel).getByText("Leave requested: Annual leave")
		).toBeVisible();
	});

	it("given_aDayNeedingAttention_when_issuesOpen_then_listedToDecideWithNoWordOfLeave", async () => {
		const [first, ...rest] = scheduleAssignmentsFixture();
		if (!first) throw new Error("fixture has a day");
		render(
			<Roster
				schedule={schedule}
				assignments={[
					{
						...first,
						off: true,
						offReason: "OFF",
						shift: null,
						jobTitle: null,
						flag: "NEEDS_ATTENTION",
					},
					...rest,
				]}
			/>
		);
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: /^Issues/ }));

		const row = within(
			screen.getByRole("complementary", { name: "Issues" })
		).getByRole("button", { name: /Days to decide/ });
		await user.click(row);
		const toDecide = row.closest("li");
		expect(toDecide).not.toBeNull();
		expect(
			within(toDecide!).getByText(
				/^This day needs attention\. Give .+ a shift or confirm the day off\.$/
			)
		).toBeVisible();
		expect(toDecide).not.toHaveTextContent(/leave/i);
	});

	it("given_findings_when_issuesIsToggled_then_opensAndClosesThemBesideTheGrid", async () => {
		const user = userEvent.setup();
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);

		expect(screen.queryByRole("note")).toBeNull();
		const issues = screen.getByRole("button", { name: /^Issues: / });
		await user.click(issues);
		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(
			within(panel).getByRole("group", { name: "Show" })
		).toBeInTheDocument();
		expect(
			within(panel).getByRole("heading", { level: 2, name: "Issues" })
		).toHaveFocus();
		await user.click(issues);
		expect(screen.queryByRole("complementary", { name: "Issues" })).toBeNull();
	});

	it("given_anOpenIssuesPanel_when_escapeIsPressed_then_closesItAndReturnsFocus", async () => {
		const user = userEvent.setup();
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);

		const issues = screen.getByRole("button", { name: /^Issues: / });
		await user.click(issues);
		await user.keyboard("{Escape}");

		expect(screen.queryByRole("complementary", { name: "Issues" })).toBeNull();
		expect(issues).toHaveFocus();
	});

	it("given_changedStartsAndHandChanges_when_issuesOpens_then_saysSoThereNotAboveTheGrid", async () => {
		const user = userEvent.setup();
		const [first, ...rest] = scheduleAssignmentsFixture();
		render(
			<Roster
				membersWithChangedStart={2}
				schedule={schedule}
				assignments={[
					{
						...first!,
						lastChange: {
							changeId: "rc-1",
							appliedAt: "2026-10-10T09:00:00Z",
							appliedBy: { membershipId: "m-9", displayName: "Moses Lee" },
							remark: null,
							before: {
								kind: "OFF",
								dayType: "OFF",
								shift: null,
								jobTitle: null,
							},
						},
					},
					...rest,
				]}
			/>
		);

		expect(screen.queryByRole("note")).toBeNull();
		await user.click(screen.getByRole("button", { name: /^Issues: / }));
		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(panel).toHaveTextContent("2 people’s days before this week changed");
		expect(panel).toHaveTextContent("These notes are from generation");
		await user.click(
			within(panel).getByRole("button", { name: /Days before changed/ })
		);
		expect(panel).toHaveTextContent(
			"This roster was generated from what was known then."
		);
		await user.click(
			within(panel).getByRole("button", { name: /Notes from generation/ })
		);
		expect(panel).toHaveTextContent(
			"Changes made by hand since aren’t reflected."
		);
		await user.click(
			screen.getByRole("button", { name: "Changed by hand: 1 day" })
		);
		expect(
			screen.getByRole("complementary", { name: "Changed" })
		).toHaveTextContent(
			/Aisha Rahman · Mon, Oct 12.*Day off→Front Desk AM · 09:00 – 15:00/
		);
	});

	it("given_aRowsCount_when_chosen_then_listsOnlyThatMembersIssuesAndClearsBackToAll", async () => {
		const user = userEvent.setup();
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);

		const count = screen.getByRole("button", {
			name: "Ben Ong: 1 issue. Show in Issues",
		});
		await user.click(count);

		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(
			within(panel).getByRole("heading", { level: 2, name: "Issues" })
		).toHaveFocus();
		expect(within(panel).getByText("Ben Ong")).toBeVisible();
		expect(
			within(panel).getByRole("heading", { name: "Roster" })
		).toBeVisible();
		expect(panel).toHaveTextContent(
			"Ben Ong works more than five days in a row."
		);
		expect(panel).not.toHaveTextContent(
			"Chen Wei covers the Sunday swing alone."
		);
		expect(
			within(panel).queryByRole("region", { name: /Roster notes/ })
		).toBeNull();

		await user.click(
			within(panel).getByRole("button", { name: "Clear filters" })
		);
		// The whole list opens afresh, its heading taking focus.
		const all = screen.getByRole("complementary", { name: "Issues" });
		expect(
			within(all).getByRole("group", { name: "Show" })
		).toBeInTheDocument();
		expect(
			within(all).getByRole("heading", { level: 2, name: "Issues" })
		).toHaveFocus();
		await user.keyboard("{Escape}");
		expect(count).toHaveFocus();
	});

	it("given_aDaysCount_when_chosen_then_listsWhatTheEngineLeftAboutThatDay", async () => {
		const user = userEvent.setup();
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);

		await user.click(
			screen.getByRole("button", {
				name: "Saturday, October 17: 1 person short. Show in Issues",
			})
		);

		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(within(panel).getByText("Sat, Oct 17")).toBeVisible();
		expect(panel).toHaveTextContent("1 Front Desk Staff short");
		expect(panel).not.toHaveTextContent(
			"Ben Ong works more than five days in a row."
		);
	});

	it("given_aColleaguesDayNote_when_theirRowIsCounted_then_itsListNamesTheLeave", async () => {
		const user = userEvent.setup();
		const [first, ...rest] = scheduleAssignmentsFixture();
		if (!first) throw new Error("fixture has a day");
		render(
			<Roster
				schedule={schedule}
				assignments={[
					{ ...first, flag: "LEAVE_REQUESTED", leaveTypeName: "Annual leave" },
					...rest,
				]}
			/>
		);

		await user.click(
			screen.getByRole("button", {
				name: "Aisha Rahman: 1 issue. Show in Issues",
			})
		);

		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(
			within(panel).getByRole("heading", { name: "Leave and cover" })
		).toBeVisible();
		expect(
			within(panel).getByText("Leave requested: Annual leave")
		).toBeVisible();
	});

	it("given_nothingFound_when_rendered_then_saysNothingAboutFindings", () => {
		render(
			<Roster
				assignments={scheduleAssignmentsFixture()}
				schedule={generatedScheduleFixture({
					status: "GENERATED",
					generation: generationFixture({ findings: emptyFindingsFixture() }),
				})}
			/>
		);

		expect(screen.queryByRole("button", { name: /^Issues/ })).toBeNull();
		expect(
			screen.queryByRole("button", { name: / issues?\. Show in Issues$/ })
		).toBeNull();
	});

	describe("on a published roster with offers out", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("given_anOfferOut_when_issuesOpens_then_listsItWithoutAddingToTheCount", async () => {
			stubApi({});
			const user = userEvent.setup();
			render(
				<QueryClientProvider client={new QueryClient()}>
					<Roster
						assignments={scheduleAssignmentsFixture()}
						schedule={schedule}
						editing={{
							target: {
								companyId: "c-1",
								unit: { branchId: "b-1", departmentId: "d-1" },
								scheduleId: "s-1",
								runId: "r-1",
							},
							revision: 1,
							shifts: [],
							nonWorkingDayTypes: [],
							notifiesMembers: true,
							coverOffers: {
								offers: [
									// Still waiting whenever the test runs.
									coverOfferFixture({ expiresAt: "2099-01-01T00:00:00Z" }),
								],
								failed: false,
								retry: vi.fn(),
							},
						}}
					/>
				</QueryClientProvider>
			);

			// The same count as without the offer: the gap is counted once.
			await user.click(screen.getByRole("button", { name: /^Issues: / }));

			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(
				within(panel).getByRole("heading", { name: "Offers out" })
			).toBeVisible();
			expect(panel).toHaveTextContent(
				/Aisha Rahman · Overtime · 6 h · waiting/
			);
		});
	});

	describe("Issues with Validate schedule", () => {
		const editing = {
			target: {
				companyId: "c-1",
				unit: { branchId: "b-1", departmentId: "d-1" },
				scheduleId: "s-1",
				runId: "r-1",
			},
			revision: 1,
			shifts: [],
			nonWorkingDayTypes: [],
			notifiesMembers: false,
		};
		/** The generation's own gap on Saturday, as the fixture's findings carry it. */
		// Each gap's line names its shift, its times and how short it is.
		// Issues names a gap by its job title and time: the two gaps differ by their time.
		const GENERATED_GAP = "09:00–15:00";
		const NEW_GAP = "14:00–22:00";

		/** The roster at revision 1 with Validate schedule in the given state; for an editor unless told otherwise. */
		const showValidated = (
			validation: RosterRulesCheckState &
				Pick<RosterValidation, "ask" | "last">,
			mayEdit = true
		): void => {
			render(
				<QueryClientProvider client={new QueryClient()}>
					<Roster
						assignments={scheduleAssignmentsFixture()}
						editing={mayEdit ? editing : undefined}
						schedule={schedule}
						validation={{ askAt: vi.fn(), ...validation, revision: 1 }}
					/>
				</QueryClientProvider>
			);
		};

		it("given_someoneWhoMayOnlyReadTheRoster_when_shown_then_validateScheduleIsOfferedAndAsks", async () => {
			const user = userEvent.setup();
			const ask = vi.fn();
			showValidated({ status: "idle", ask }, false);

			await user.click(
				screen.getByRole("button", { name: /Validate schedule/ })
			);

			expect(ask).toHaveBeenCalledOnce();
		});

		it("given_noValidationYet_when_issuesOpens_then_theGenerationsConflictsWithNoNote", async () => {
			const user = userEvent.setup();
			showValidated({ status: "idle", ask: vi.fn() });

			await user.click(screen.getByRole("button", { name: /^Issues: / }));

			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(panel).toHaveTextContent(GENERATED_GAP);
			expect(panel).not.toHaveTextContent(
				"has changed since this list was made"
			);
		});

		it("given_aValidationOfTheRosterOnScreen_when_issuesOpens_then_itsGapsReplaceTheGenerationsAndItsRulesJoin", async () => {
			const user = userEvent.setup();
			const check = rulesCheckFixture({
				status: "BROKEN",
				brokenRules: [
					{
						rule: "most_minutes_a_day",
						constraintId: "k-1",
						constraintName: "Twelve hours a day",
						violations: null,
					},
				],
				staffingGaps: [
					staffingGapFixture({
						conflictId: "validated-2",
						date: "2026-10-16",
						start: "2026-10-16T14:00",
						end: "2026-10-16T22:00",
						message: NEW_GAP,
						shiftUuids: ["swing-shift-copy"],
					}),
				],
			});
			showValidated({
				status: "ready",
				check,
				ask: vi.fn(),
				last: { revision: 1, check },
			});

			// The generation's one gap gone, the new gap and the broken rule in: the count follows the list.
			await user.click(screen.getByRole("button", { name: /^Issues: / }));

			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(panel).not.toHaveTextContent(GENERATED_GAP);
			expect(panel).toHaveTextContent(NEW_GAP);
			expect(
				within(panel).getByRole("button", { name: /Twelve hours a day/ })
			).toHaveTextContent("Must fix");
			expect(panel).toHaveTextContent("Checked");
			expect(panel).toHaveTextContent(/\d+ to fix/);
		});

		it("given_aValidationThatSaysWho_when_issuesOpens_then_mustsByPersonAndDayAndIfPossibleApartAndUncounted", async () => {
			const user = userEvent.setup();
			const check = rulesCheckFixture({
				status: "BROKEN",
				brokenRules: [
					ruleFixture({
						constraintName: "Twelve hours a day",
						violations: [
							{
								employeeId: "mp-1",
								date: "2026-10-16",
								messages: ["Aisha works 13 h."],
							},
							{
								employeeId: "mp-1",
								date: "2026-10-17",
								messages: ["Aisha works 14 h."],
							},
						],
					}),
				],
				notMet: [
					ruleFixture({
						rule: "max_consecutive_work_days",
						constraintName: "Five days in a row",
						violations: [
							{
								employeeId: "mp-2",
								date: "2026-10-16",
								messages: ["If possible, not met: six in a row"],
							},
							{
								employeeId: "mp-2",
								date: "2026-10-17",
								messages: ["If possible, not met: seven in a row"],
							},
						],
					}),
				],
				members: [
					{
						memberProfileId: "mp-1",
						membershipId: "m-1",
						displayName: "Aisha Rahman",
					},
					{
						memberProfileId: "mp-2",
						membershipId: "m-2",
						displayName: "Ben Ong",
					},
				],
			});
			showValidated({
				status: "ready",
				check,
				ask: vi.fn(),
				last: { revision: 1, check },
			});

			// The generation's gap and Ben's violation out (no gaps now); the must's two lines in, its rule not
			// counted again; Chen's day message and the setup issue stay; the two not met if possible never count.
			await user.click(screen.getByRole("button", { name: /^Issues: / }));

			const panel = screen.getByRole("complementary", { name: "Issues" });
			// The must's people and days replace the generation's violation about Ben.
			expect(panel).not.toHaveTextContent(
				"Ben Ong works more than five days in a row."
			);
			// One row per day, as the engine's two sentences differ.
			expect(
				within(panel).getAllByRole("button", {
					name: /^Must fix.*Aisha Rahman/,
				})
			).toHaveLength(2);
			await user.click(
				within(panel).getByRole("button", { name: "If possible" })
			);
			const ifPossible = within(panel).getAllByRole("listitem");
			expect(ifPossible).toHaveLength(2);
			for (const row of ifPossible) {
				expect(row).toHaveTextContent("Five days in a row");
				expect(row).toHaveTextContent(/Ben Ong/);
			}
		});

		it("given_issuesToFixAndNotMet_when_shown_then_theIssuesButtonCountsToFixThenNotMetInAmber", () => {
			const check = rulesCheckFixture({
				status: "BROKEN",
				notMet: [
					ruleFixture({
						rule: "max_consecutive_work_days",
						constraintName: "Five days in a row",
						violations: [
							{
								employeeId: "mp-2",
								date: "2026-10-16",
								messages: ["If possible, not met: six in a row"],
							},
						],
					}),
				],
				members: [
					{
						memberProfileId: "mp-2",
						membershipId: "m-2",
						displayName: "Ben Ong",
					},
				],
			});
			showValidated({
				status: "ready",
				check,
				ask: vi.fn(),
				last: { revision: 1, check },
			});

			// The label names both groups ("Issues: 1 to fix, 1 could not be met"); one badge each, to fix first.
			const issues = screen.getByRole("button", { name: /^Issues: / });
			const [toFix = 0, notMet = 0] = (
				issues.getAttribute("aria-label")?.match(/\d+/g) ?? []
			).map(Number);
			expect(toFix).toBeGreaterThan(0);
			expect(notMet).toBeGreaterThan(0);
			expect(issues).toHaveTextContent(new RegExp(`^Issues${toFix}${notMet}$`));
			// The amber count is the button's last.
			const counts = within(issues).getAllByText(String(notMet));
			expect(counts[counts.length - 1]).toHaveClass("bg-warning-100");
		});

		it("given_aValidationOfAnEarlierRevision_when_issuesOpens_then_itValidatesAndItsCheckLineOffersCheckNow", async () => {
			const ask = vi.fn();
			const user = userEvent.setup();
			const check = rulesCheckFixture({ staffingGaps: [staffingGapFixture()] });
			showValidated({
				status: "idle",
				ask,
				last: { revision: 0, check },
			});

			await user.click(screen.getByRole("button", { name: /^Issues: / }));

			expect(ask).toHaveBeenCalledOnce();
			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(panel).toHaveTextContent("Not checked since your changes");
			await user.click(
				within(panel).getByRole("button", { name: "Check now" })
			);
			expect(ask).toHaveBeenCalledTimes(2);
		});

		it("given_handChangesNotValidatedInThisVisit_when_issuesOpens_then_itsCheckLineSaysTheChangesAreUncheckedWithCheckNow", async () => {
			const user = userEvent.setup();
			const [first, ...rest] = scheduleAssignmentsFixture();
			const handChanged = {
				...first!,
				lastChange: {
					changeId: "rc-1",
					appliedAt: "2026-10-10T09:00:00Z",
					appliedBy: { membershipId: "m-9", displayName: "Moses Lee" },
					remark: null,
					before: { kind: "OFF", dayType: "OFF", shift: null, jobTitle: null },
				},
			} as const;
			render(
				<QueryClientProvider client={new QueryClient()}>
					<Roster
						assignments={[handChanged, ...rest]}
						editing={editing}
						schedule={schedule}
						validation={{
							status: "idle",
							ask: vi.fn(),
							askAt: vi.fn(),
							revision: 1,
						}}
					/>
				</QueryClientProvider>
			);

			await user.click(screen.getByRole("button", { name: /^Issues: / }));

			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(panel).toHaveTextContent(en.scheduling.issues.panel.unchecked);
			expect(
				within(panel).getByRole("button", { name: "Check now" })
			).toBeVisible();
		});

		it("given_aReloadOfAHandChangedRosterWithIssuesOpen_when_shown_then_itValidatesByItselfAndListsTheCheckedIssues", async () => {
			configureApiClient({
				accessToken: () => Promise.resolve("test-pass"),
				renew: () => Promise.resolve({ kind: "expired" }),
				onUnauthenticated: () => {},
			});
			const check = rulesCheckFixture({
				staffingGaps: [
					staffingGapFixture({
						conflictId: "validated-2",
						date: "2026-10-16",
						start: "2026-10-16T14:00",
						end: "2026-10-16T22:00",
						message: NEW_GAP,
						shiftUuids: ["swing-shift-copy"],
					}),
				],
			});
			const calls = stubApi({
				[`POST /api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/roster-check`]:
					{ status: 200, body: envelope(check) },
			});
			const [first, ...rest] = scheduleAssignmentsFixture();
			const handChanged = {
				...first!,
				lastChange: {
					changeId: "rc-1",
					appliedAt: "2026-10-10T09:00:00Z",
					appliedBy: null,
					remark: null,
					before: { kind: "OFF", dayType: "OFF", shift: null, jobTitle: null },
				},
			} as const;
			/** The page after a reload: Validate schedule's own hook, told the roster has hand changes. */
			const ReloadedRoster = (): ReactElement => {
				const validation = useRosterRulesCheck(editing.target, 1, true);
				return (
					<GeneratedRoster
						assignments={[handChanged, ...rest]}
						editing={editing}
						schedule={schedule}
						validation={validation}
						view={{ week: "2026-10-12", panel: "issues" }}
						onViewChange={() => {}}
					/>
				);
			};
			render(
				<QueryClientProvider client={new QueryClient()}>
					<ReloadedRoster />
				</QueryClientProvider>
			);

			// The grid is there at once, and the list says it is being validated.
			expect(screen.getByRole("table", { name: "Roster" })).toBeVisible();
			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(panel).toHaveTextContent(en.scheduling.issues.panel.checking);

			expect(await within(panel).findByText(/14:00–22:00/)).toBeVisible();
			expect(panel).not.toHaveTextContent(GENERATED_GAP);
			expect(panel).not.toHaveTextContent(en.scheduling.issues.panel.unchecked);
			expect(calls).toHaveLength(1);
			resetApiClient();
			vi.unstubAllGlobals();
		});

		it("given_staffingTheEngineCouldNotWorkOut_when_issuesOpens_then_itsCheckLineSaysIncompleteAndKeepsTheGenerationsList", async () => {
			const user = userEvent.setup();
			const check = rulesCheckFixture({
				status: "UNCHECKED",
				staffingGaps: null,
			});
			showValidated({
				status: "ready",
				check,
				ask: vi.fn(),
				last: { revision: 1, check },
			});

			await user.click(screen.getByRole("button", { name: /^Issues: / }));

			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(panel).toHaveTextContent(GENERATED_GAP);
			expect(panel).toHaveTextContent(/Checked .*may be incomplete/);
		});

		it("given_theValidateButton_when_pressed_then_itValidatesAndOpensIssues", async () => {
			const ask = vi.fn();
			const user = userEvent.setup();
			showValidated({ status: "loading", ask });

			await user.click(
				screen.getByRole("button", { name: /^Validate schedule/ })
			);

			expect(ask).toHaveBeenCalledOnce();
			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(panel).toHaveTextContent("Checking the rules…");
		});

		it("given_noValidation_when_rendered_then_noValidateButton", () => {
			render(
				<QueryClientProvider client={new QueryClient()}>
					<Roster
						assignments={scheduleAssignmentsFixture()}
						schedule={schedule}
					/>
				</QueryClientProvider>
			);

			expect(
				screen.queryByRole("button", { name: /^Validate schedule/ })
			).toBeNull();
		});
	});
});

describe("GeneratedRoster: one place for cover", () => {
	const SCHEDULE_PATH =
		"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
	const coverEditing = {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
			runId: "r-1",
		},
		revision: 1,
		shifts: [],
		nonWorkingDayTypes: [],
		notifiesMembers: false,
	};

	/** The roster opened at `view`, its API stubbed; gives the calls. */
	const showAt = (view: RosterSearch): ReturnType<typeof stubApi> => {
		configureApiClient({
			accessToken: () => Promise.resolve("test-pass"),
			renew: () => Promise.resolve({ kind: "expired" }),
			onUnauthenticated: () => {},
		});
		const calls = stubApi({
			[`POST ${SCHEDULE_PATH}/repair-options`]: {
				status: 200,
				body: envelope(repairOptionsFixture([], [])),
			},
		});
		render(
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<GeneratedRoster
					assignments={scheduleAssignmentsFixture()}
					editing={coverEditing}
					schedule={schedule}
					view={view}
					onViewChange={() => {}}
				/>
			</QueryClientProvider>
		);
		return calls;
	};

	afterEach(() => {
		resetApiClient();
		vi.unstubAllGlobals();
	});

	it("given_findCoverForAGap_when_opened_then_issuesOpensWithThatRowOpenAndTheEngineAsked", async () => {
		const calls = showAt({
			week: "2026-10-12",
			panel: "issues",
			cover: "front-desk-am-copy|2026-10-17",
		});

		const panel = screen.getByRole("complementary", { name: "Issues" });
		const open = within(panel).getByRole("button", { expanded: true });
		expect(open).toHaveTextContent(/Sat, Oct 17/);
		expect(
			await within(panel).findByText("Nobody can cover this within the rules.")
		).toBeVisible();
		expect(
			calls.filter((call) => call.path.endsWith("/repair-options"))
		).toHaveLength(1);
	});

	it("given_aRowThatIsNotAShortShift_when_opened_then_nothingIsAskedOfTheEngine", async () => {
		const user = userEvent.setup();
		const calls = showAt({ week: "2026-10-12", panel: "issues" });

		const panel = screen.getByRole("complementary", { name: "Issues" });
		await user.click(
			within(panel).getAllByRole("button", { name: /Ben Ong/ })[0]!
		);

		expect(
			calls.filter((call) => call.path.endsWith("/repair-options"))
		).toHaveLength(0);
	});

	it("given_anOptionApplied_when_itLands_then_theRosterIsCheckedAtTheNewRevisionAndFocusIsOnTheRow", async () => {
		configureApiClient({
			accessToken: () => Promise.resolve("test-pass"),
			renew: () => Promise.resolve({ kind: "expired" }),
			onUnauthenticated: () => {},
		});
		stubApi({
			[`POST ${SCHEDULE_PATH}/repair-options`]: {
				status: 200,
				body: envelope(repairOptionsFixture([callInOption()], [])),
			},
			[`POST ${SCHEDULE_PATH}/roster-changes/preview`]: {
				status: 200,
				body: envelope(rosterChangePreviewFixture({ checks: [] })),
			},
			[`POST ${SCHEDULE_PATH}/roster-changes`]: {
				status: 201,
				body: envelope(rosterChangeFixture({ fromRevision: 1, toRevision: 2 })),
			},
		});
		const askAt = vi.fn();
		const user = userEvent.setup();
		render(
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<GeneratedRoster
					assignments={scheduleAssignmentsFixture()}
					editing={coverEditing}
					schedule={schedule}
					validation={{ status: "idle", ask: vi.fn(), askAt, revision: 1 }}
					view={{
						week: "2026-10-12",
						panel: "issues",
						cover: "front-desk-am-copy|2026-10-17",
					}}
					onViewChange={() => {}}
				/>
			</QueryClientProvider>
		);

		await user.click(
			await screen.findByRole("button", { name: "Review Aisha Rahman’s change" })
		);
		const apply = await screen.findByRole("button", { name: "Apply change" });
		await waitFor(() => {
			expect(apply).toBeEnabled();
		});
		await user.click(apply);

		await waitFor(() => {
			expect(askAt).toHaveBeenCalledWith(2);
		});
		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(within(panel).getByRole("button", { expanded: true })).toHaveFocus();
	});
});
