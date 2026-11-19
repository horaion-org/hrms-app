import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ScheduleStepper } from "@/features/scheduling/createSchedule/ScheduleStepper";

describe("ScheduleStepper", () => {
	it("given_setupDone_when_onForecast_then_namesTheThreeStepsAndSetupCanBeReturnedTo", async () => {
		const onStepClick = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<ScheduleStepper
					completion={{ setup: true, forecast: false, generate: false }}
					current={1}
					onStepClick={onStepClick}
				/>
			</I18nextProvider>
		);

		expect(
			screen.getAllByRole("listitem").map((step) => step.textContent)
		).toEqual([
			expect.stringContaining("Setup"),
			expect.stringContaining("Forecast"),
			expect.stringContaining("Generate"),
		]);
		// Only the step whose work is done is a button.
		await userEvent.click(screen.getByRole("button", { name: /Setup/ }));
		expect(onStepClick).toHaveBeenCalledExactlyOnceWith(0);
	});
});
