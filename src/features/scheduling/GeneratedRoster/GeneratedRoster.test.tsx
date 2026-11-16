import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as Router from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { stubApi } from "@/common/testing/stubApi";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import {
	GeneratedRoster,
	type GeneratedRosterProps,
} from "@/features/scheduling/GeneratedRoster";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import {
	ruleFixture,
	rulesCheckFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import type {
	RosterRulesCheckState,
	RosterValidation,
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

	it("given_aDayMarkedForLeave_when_issuesOpen_then_itIsListedUnderLeaveAndCover", async () => {
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
		expect(
			within(panel).getByRole("heading", { name: "Leave and cover" })
		).toBeVisible();
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

		const toDecide = screen
			.getByRole("heading", { name: "Days to decide" })
			.closest("section");
		expect(toDecide).not.toBeNull();
		expect(within(toDecide!).getByText("Needs attention")).toBeVisible();
		expect(toDecide).not.toHaveTextContent(/leave/i);
	});

	it("given_findings_when_issuesIsToggled_then_opensAndClosesThemBesideTheGrid", async () => {
		const user = userEvent.setup();
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);

		expect(screen.queryByRole("note")).toBeNull();
		const issues = screen.getByRole("button", { name: "Issues: 4" });
		await user.click(issues);
		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(
			within(panel).getByRole("region", { name: "Roster notes (3)" })
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

		const issues = screen.getByRole("button", { name: "Issues: 4" });
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
		await user.click(screen.getByRole("button", { name: "Issues: 5" }));
		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(panel).toHaveTextContent(
			"2 people’s days before this week changed after this roster was generated, so what it says about the week before is what was known then."
		);
		expect(panel).toHaveTextContent(
			"These notes are from generation. Changes made by hand since aren’t reflected."
		);
		await user.click(
			screen.getByRole("button", { name: "Changed by hand: 1 day" })
		);
		expect(
			screen.getByRole("complementary", { name: "Changed" })
		).toHaveTextContent(
			"Aisha Rahman · Mon, Oct 12Day off → Front Desk AM · 09:00 – 15:00"
		);
	});

	it("given_aRowsCount_when_chosen_then_listsOnlyThatMembersIssuesAndClearsBackToAll", async () => {
		const user = userEvent.setup();
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);

		const count = screen.getByRole("button", {
			name: "Ben Ong: 1 to look at. Show in Issues",
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
			within(all).getByRole("region", { name: "Roster notes (3)" })
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
				name: "Aisha Rahman: 1 to look at. Show in Issues",
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
		expect(screen.queryByRole("button", { name: /to look at/ })).toBeNull();
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
			await user.click(screen.getByRole("button", { name: "Issues: 4" }));

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
		const GENERATED_GAP =
			"Front Desk AM 09:00 – 15:00•1 Front Desk Staff short";
		const NEW_GAP = "Swing Shift 14:00 – 22:00•1 Front Desk Staff short";

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
						validation={{ ...validation, revision: 1 }}
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

			await user.click(screen.getByRole("button", { name: "Issues: 4" }));

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
			await user.click(screen.getByRole("button", { name: "Issues: 5" }));

			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(panel).not.toHaveTextContent(GENERATED_GAP);
			expect(panel).toHaveTextContent(NEW_GAP);
			expect(
				within(panel).getByRole("heading", {
					name: "Working-time rules broken",
				})
			).toBeVisible();
			expect(within(panel).getByText("Twelve hours a day")).toBeVisible();
			expect(
				within(panel).getByText(
					"Validated: this list is the schedule as it stands."
				)
			).toBeVisible();
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
			await user.click(screen.getByRole("button", { name: "Issues: 4" }));

			const panel = screen.getByRole("complementary", { name: "Issues" });
			// The must's people and days replace the generation's violation about Ben.
			expect(panel).not.toHaveTextContent(
				"Ben Ong works more than five days in a row."
			);
			expect(panel).toHaveTextContent("Aisha works 13 h.");
			expect(panel).toHaveTextContent("Aisha works 14 h.");
			const ifPossible = within(panel).getByRole("heading", {
				name: "If possible, not met (2)",
			});
			const section = ifPossible.closest("section");
			expect(section).not.toBeNull();
			expect(within(section!).getByText("If possible")).toBeVisible();
			expect(section).toHaveTextContent("Five days in a row");
			expect(section).toHaveTextContent(
				/Ben Ong · .+: “If possible, not met: six in a row”/
			);
		});

		it("given_aValidationOfAnEarlierRevision_when_issuesOpens_then_itValidatesAndSaysTheListIsOutOfDateWithTheAction", async () => {
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
			expect(panel).toHaveTextContent(
				"The schedule has changed since this list was made. Validate it to refresh the list."
			);
			await user.click(
				within(panel).getByRole("button", { name: "Validate schedule" })
			);
			expect(ask).toHaveBeenCalledTimes(2);
		});

		it("given_staffingTheEngineCouldNotWorkOut_when_issuesOpens_then_saysSoAndKeepsTheGenerationsList", async () => {
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

			await user.click(screen.getByRole("button", { name: "Issues: 4" }));

			const panel = screen.getByRole("complementary", { name: "Issues" });
			expect(panel).toHaveTextContent(GENERATED_GAP);
			expect(panel).toHaveTextContent(
				"The working-time rules could not be checked; the list below is from before."
			);
			expect(panel).toHaveTextContent(
				"Staffing could not be checked; the shifts left short below are from before."
			);
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
			expect(panel).toHaveTextContent("Validating the schedule…");
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
