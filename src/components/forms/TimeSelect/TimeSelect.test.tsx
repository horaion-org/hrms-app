import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { TimeSelect } from "@/components/forms/TimeSelect";
import { authTestI18n } from "@/features/auth/testingI18n";

const show = (onChange = vi.fn()): ReturnType<typeof vi.fn> => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<TimeSelect aria-label="Start time" onChange={onChange} />
		</I18nextProvider>
	);
	return onChange;
};

describe("TimeSelect", () => {
	it("given_opened_when_listed_then_offersEveryHalfHourFromMidnight", async () => {
		const user = userEvent.setup();
		show();

		await user.click(screen.getByRole("button", { name: "Start time" }));

		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(48);
		expect(options[0]).toHaveTextContent("00:00");
		expect(options[1]).toHaveTextContent("00:30");
		expect(options[47]).toHaveTextContent("23:30");
	});

	it("given_aTimePicked_when_chosen_then_reportsItAsHoursAndMinutes", async () => {
		const user = userEvent.setup();
		const onChange = show();

		await user.click(screen.getByRole("button", { name: "Start time" }));
		await user.click(screen.getByRole("option", { name: "09:30" }));

		expect(onChange).toHaveBeenCalledWith("09:30");
	});
});
