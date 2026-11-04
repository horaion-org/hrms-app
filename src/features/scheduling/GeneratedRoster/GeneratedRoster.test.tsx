import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { beforeAll, describe, expect, it } from "vitest";
import { GeneratedRoster } from "@/features/scheduling/GeneratedRoster";
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

describe("GeneratedRoster", () => {
	it("given_aGeneratedWeek_when_rendered_then_countsItAndShowsEachMember", () => {
		render(
			<GeneratedRoster
				assignments={scheduleAssignmentsFixture()}
				schedule={schedule}
			/>
		);

		expect(
			screen.getByRole("region", { name: "Staff Rostered" })
		).toHaveTextContent("3of 3 staff");
		expect(screen.getByRole("region", { name: "On Leave" })).toHaveTextContent(
			"2"
		);
		const roster = screen.getByRole("table", { name: "Roster" });
		expect(within(roster).getAllByRole("row")).toHaveLength(4);
	});

	it("given_aMembersOwnView_when_renderedWithoutTheSummary_then_onlyTheRoster", () => {
		render(
			<GeneratedRoster
				assignments={scheduleAssignmentsFixture()}
				withSummary={false}
				schedule={{
					periodStart: schedule.periodStart,
					periodEnd: schedule.periodEnd,
					timeZone: schedule.timeZone,
				}}
			/>
		);

		expect(screen.queryByRole("region", { name: "Staff Rostered" })).toBeNull();
		const roster = screen.getByRole("table", { name: "Roster" });
		expect(within(roster).getAllByRole("row")).toHaveLength(4);
	});

	it("given_aChosenDay_when_clicked_then_showsItsShiftReadOnly", async () => {
		const user = userEvent.setup();
		render(
			<GeneratedRoster
				assignments={scheduleAssignmentsFixture()}
				schedule={schedule}
			/>
		);

		await user.click(
			screen.getByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" })
		);

		const panel = screen.getByRole("complementary", { name: "Shift Details" });
		expect(panel).toHaveTextContent("ShiftLunch Rush");
		expect(screen.queryByRole("button", { name: "Edit Shift" })).toBeNull();
	});

	it("given_noRows_when_rendered_then_saysNoOneIsRostered", () => {
		render(<GeneratedRoster assignments={[]} schedule={schedule} />);

		expect(
			screen.getByText("No one is rostered in this schedule.")
		).toBeInTheDocument();
	});

	it("given_findings_when_theSummaryIsToggled_then_showsAndHidesTheFindingsPanel", async () => {
		const user = userEvent.setup();
		render(
			<GeneratedRoster
				assignments={scheduleAssignmentsFixture()}
				schedule={schedule}
			/>
		);

		expect(screen.getByRole("note")).toHaveTextContent(
			"The scheduling engine left 3 roster notes and 1 setup issue."
		);
		await user.click(screen.getByRole("button", { name: "Show details" }));
		expect(
			screen.getByRole("region", { name: "Roster notes (3)" })
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Hide details" }));
		expect(
			screen.queryByRole("region", { name: "Roster notes (3)" })
		).toBeNull();
	});

	it("given_aMarkersShowAll_when_chosen_then_opensAndFocusesTheFindingsPanel", async () => {
		const user = userEvent.setup();
		render(
			<GeneratedRoster
				assignments={scheduleAssignmentsFixture()}
				schedule={schedule}
			/>
		);

		await user.click(
			screen.getByRole("button", { name: "1 note for Ben Ong" })
		);
		await user.click(
			await screen.findByRole("button", { name: "Show in findings" })
		);

		const roster = screen.getByRole("region", { name: "Roster notes (3)" });
		expect(document.activeElement).toContainElement(roster);
	});

	it("given_nothingFound_when_rendered_then_saysNothingAboutFindings", () => {
		render(
			<GeneratedRoster
				assignments={scheduleAssignmentsFixture()}
				schedule={generatedScheduleFixture({
					status: "GENERATED",
					generation: generationFixture({ findings: emptyFindingsFixture() }),
				})}
			/>
		);

		expect(screen.queryByRole("note")).toBeNull();
		expect(screen.queryByRole("button", { name: /note/ })).toBeNull();
	});
});
