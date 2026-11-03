import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { WeekSelector } from "@/features/people/availability/WeekSelector";
import {
	formatWeekStart,
	type AvailabilityScope,
} from "@/features/people/availability/availabilityModel";

const WEDNESDAY = new Date("2026-11-04T12:00:00");
const weekOf = (monday: string): string =>
	`Week of ${formatWeekStart(monday, "en")}`;

const show = (
	scope: AvailabilityScope = { kind: "pattern" },
	onChange = vi.fn()
): ReturnType<typeof vi.fn> => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<WeekSelector
				overrideWeeks={["2026-11-09"]}
				scope={scope}
				today={WEDNESDAY}
				onChange={onChange}
			/>
		</I18nextProvider>
	);
	return onChange;
};

describe("WeekSelector", () => {
	it("given_today_when_opened_then_offersThePatternAndSixWeeksThisOneFirst", async () => {
		const user = userEvent.setup();
		show();

		const trigger = screen.getByRole("button", { name: "Week" });
		expect(trigger).toHaveTextContent("Default pattern");
		await user.click(trigger);

		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual([
			"Default pattern",
			weekOf("2026-11-02"),
			weekOf("2026-11-09"),
			weekOf("2026-11-16"),
			weekOf("2026-11-23"),
			weekOf("2026-11-30"),
			weekOf("2026-12-07"),
		]);
	});

	it("given_aWeekPicked_when_chosen_then_reportsThatWeek", async () => {
		const user = userEvent.setup();
		const onChange = show();

		await user.click(screen.getByRole("button", { name: "Week" }));
		await user.click(
			screen.getByRole("option", { name: weekOf("2026-11-16") })
		);

		expect(onChange).toHaveBeenCalledWith({
			kind: "week",
			weekStartMonday: "2026-11-16",
		});
	});

	it("given_thePattern_when_shown_then_marksNothing", () => {
		show();

		expect(screen.queryByText("Custom")).not.toBeInTheDocument();
		expect(screen.queryByText("Default")).not.toBeInTheDocument();
	});

	it("given_aWeekWithAnOverride_when_shown_then_marksItCustomOnly", () => {
		show({ kind: "week", weekStartMonday: "2026-11-09" });

		expect(screen.getByText("Custom")).toBeVisible();
		expect(screen.queryByText("Default")).not.toBeInTheDocument();
	});

	it("given_aWeekWithoutAnOverride_when_shown_then_saysTheDefaultAppliesOnly", () => {
		show({ kind: "week", weekStartMonday: "2026-11-16" });

		expect(screen.getByText("Default")).toBeVisible();
		expect(screen.queryByText("Custom")).not.toBeInTheDocument();
	});
});
