import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { beforeAll, describe, expect, it } from "vitest";
import { GeneratedRoster } from "@/features/scheduling/GeneratedRoster";
import {
	generatedScheduleFixture,
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
});
