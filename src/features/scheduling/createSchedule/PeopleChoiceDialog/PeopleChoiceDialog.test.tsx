import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	PeopleChoiceDialog,
	type PeopleChoiceDialogProps,
} from "@/features/scheduling/createSchedule/PeopleChoiceDialog";
import { PLAN_PEOPLE } from "@/features/scheduling/dates/fixtures";

/** Renders the dialog over Kitchen's three people, everyone chosen unless `props` says otherwise. */
const show = (props: Partial<PeopleChoiceDialogProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<PeopleChoiceDialog
				departmentName="Kitchen"
				people={PLAN_PEOPLE}
				value={undefined}
				onApply={vi.fn()}
				onClose={vi.fn()}
				{...props}
			/>
		</I18nextProvider>
	);
};

describe("PeopleChoiceDialog", () => {
	it("given_everyone_when_opened_then_everyBoxIsTickedAndTheSentenceSaysWhatLeavingOutDoes", () => {
		show();

		expect(
			screen.getByText("People you leave out get no shifts from this schedule.")
		).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "Select Avery Example" })
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Select Casey Example" })
		).toBeChecked();
	});

	it("given_twoOfThreeTicked_when_applied_then_getsTheTwoIds", async () => {
		const user = userEvent.setup();
		const onApply = vi.fn();
		show({ onApply });

		await user.click(
			screen.getByRole("checkbox", { name: "Select Casey Example" })
		);
		await user.click(screen.getByRole("button", { name: "Use these people" }));

		expect(onApply).toHaveBeenCalledWith(["m-1", "m-2"]);
	});

	it("given_nobodyTicked_when_shown_then_applyIsDisabledWithItsReason", () => {
		show({ value: [] });

		expect(
			screen.getByRole("button", { name: "Use these people" })
		).toBeDisabled();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose at least one person."
		);
	});

	it("given_chosenPeopleTheNewDaysNoLongerList_when_opened_then_onlyTheListedOnesAreTicked", () => {
		show({ value: ["m-2", "m-9"] });

		expect(
			screen.getByRole("checkbox", { name: "Select Blake Example" })
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "Select Avery Example" })
		).not.toBeChecked();
	});

	it("given_noneOfTheChosenStillListed_when_opened_then_applyWaitsWithItsReason", () => {
		show({ value: ["m-9"] });

		expect(
			screen.getByRole("button", { name: "Use these people" })
		).toBeDisabled();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose at least one person."
		);
	});
});
