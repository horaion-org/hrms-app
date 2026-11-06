import { render, screen, within } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { beforeAll, describe, expect, it } from "vitest";
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

	it("given_noRows_when_rendered_then_saysNoOneIsRostered", () => {
		render(<Roster assignments={[]} schedule={schedule} />);

		expect(
			screen.getByText("No one is rostered in this schedule.")
		).toBeInTheDocument();
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

	it("given_aMarkersShowAll_when_chosen_then_opensAndFocusesTheIssuesPanel", async () => {
		const user = userEvent.setup();
		render(
			<Roster assignments={scheduleAssignmentsFixture()} schedule={schedule} />
		);

		await user.click(
			screen.getByRole("button", { name: "1 note for Ben Ong" })
		);
		await user.click(
			await screen.findByRole("button", { name: "Show in findings" })
		);

		expect(
			screen.getByRole("heading", { level: 2, name: "Issues" })
		).toHaveFocus();
		expect(
			screen.getByRole("region", { name: "Roster notes (3)" })
		).toBeInTheDocument();
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
		expect(screen.queryByRole("button", { name: /note/ })).toBeNull();
	});
});
