import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { WeekNavigator } from "@/components/ui/WeekNavigator";

const show = (
	week: string,
	earliestWeek?: string
): ReturnType<typeof vi.fn> => {
	const onWeekChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<WeekNavigator
				currentWeek="2026-11-09"
				earliestWeek={earliestWeek}
				week={week}
				onWeekChange={onWeekChange}
			/>
		</I18nextProvider>
	);
	return onWeekChange;
};

describe("WeekNavigator", () => {
	it("given_aWeek_when_shown_then_namesItsMondayToSunday", () => {
		show("2026-11-30");

		expect(screen.getByRole("group", { name: "Week" })).toHaveTextContent(
			"Mon, Nov 30 – Sun, Dec 6, 2026"
		);
	});

	it("given_previousAndNext_when_pressed_then_asksForTheWeekBeforeAndAfter", async () => {
		const user = userEvent.setup();
		const onWeekChange = show("2026-11-09");

		await user.click(screen.getByRole("button", { name: "Previous week" }));
		await user.click(screen.getByRole("button", { name: "Next week" }));

		expect(onWeekChange.mock.calls).toEqual([["2026-11-02"], ["2026-11-16"]]);
	});

	it("given_anotherWeek_when_thisWeekIsPressed_then_asksForTheCurrentWeek", async () => {
		const user = userEvent.setup();
		const onWeekChange = show("2027-01-04");

		await user.click(screen.getByRole("button", { name: "This week" }));

		expect(onWeekChange).toHaveBeenCalledWith("2026-11-09");
	});

	it("given_theEarliestWeek_when_shown_then_offersNoPreviousWeek", () => {
		show("2026-11-09", "2026-11-09");

		expect(
			screen.getByRole("button", { name: "Previous week" })
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Next week" })).toBeEnabled();
	});
});
