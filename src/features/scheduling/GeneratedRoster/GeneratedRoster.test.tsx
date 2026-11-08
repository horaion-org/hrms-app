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
				"3 people · 15 shifts · 4 days off · 2 days on leave · 94 h"
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
							before: { kind: "OFF", shift: null, jobTitle: null },
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
			"2 people’s days before this week changed after this schedule was generated."
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
				name: "Saturday, October 17: 1 to look at. Show in Issues",
			})
		);

		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(within(panel).getByText("Sat, Oct 17")).toBeVisible();
		expect(panel).toHaveTextContent("1 person short");
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
});
