import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { DatesQuickChoices } from "@/features/scheduling/createSchedule/DatesQuickChoices";

/** Thursday 19 November 2026. */
const TODAY = "2026-11-19";

describe("DatesQuickChoices", () => {
	it("given_today_when_shown_then_theFourChoicesUnderTheirLabel", () => {
		render(
			<I18nextProvider i18n={authTestI18n}>
				<DatesQuickChoices today={TODAY} onChoose={vi.fn()} />
			</I18nextProvider>
		);

		const group = screen.getByRole("group", { name: "Quick choices" });
		expect(
			within(group)
				.getAllByRole("button")
				.map((button) => button.textContent)
		).toEqual(["Rest of this week", "Next week", "This month", "Next month"]);
	});

	it.each([
		{ label: "Rest of this week", firstDay: TODAY, lastDay: "2026-11-22" },
		{ label: "Next week", firstDay: "2026-11-23", lastDay: "2026-11-29" },
		{ label: "This month", firstDay: TODAY, lastDay: "2026-11-30" },
		{ label: "Next month", firstDay: "2026-12-01", lastDay: "2026-12-31" },
	])("given_$label_when_pressed_then_handsOverItsTwoDays", async ({
		label,
		firstDay,
		lastDay,
	}) => {
		const user = userEvent.setup();
		const onChoose = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<DatesQuickChoices today={TODAY} onChoose={onChoose} />
			</I18nextProvider>
		);

		await user.click(screen.getByRole("button", { name: label }));

		expect(onChoose).toHaveBeenCalledExactlyOnceWith({ firstDay, lastDay });
	});
});
