import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { Weekday } from "@/common/weekdays";
import { DaysMultiSelect } from "@/components/forms/DaysMultiSelect";
import { authTestI18n } from "@/features/auth/testingI18n";

const show = (
	value: Array<Weekday>,
	onChange = vi.fn()
): ReturnType<typeof vi.fn> => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<DaysMultiSelect aria-label="Days" value={value} onChange={onChange} />
		</I18nextProvider>
	);
	return onChange;
};

describe("DaysMultiSelect", () => {
	it("given_opened_when_listed_then_offersTheWeekMondayFirst", async () => {
		const user = userEvent.setup();
		show([]);

		await user.click(screen.getByRole("button", { name: "Days" }));

		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual([
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		]);
	});

	it("given_aDayPickedAfterALaterOne_when_chosen_then_reportsTheDaysInWeekOrder", async () => {
		const user = userEvent.setup();
		const onChange = show(["FRI"]);

		await user.click(screen.getByRole("button", { name: "Days" }));
		await user.click(screen.getByRole("option", { name: "Monday" }));

		expect(onChange).toHaveBeenCalledWith(["MON", "FRI"]);
	});
});
