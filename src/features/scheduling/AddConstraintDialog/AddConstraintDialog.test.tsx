import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { AddConstraintDialog } from "@/features/scheduling/AddConstraintDialog";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const shifts = [{ shiftId: "lunch-rush", name: "Lunch Rush" }];
const roles = [{ jobTitleId: "cashier", name: "Cashier" }];

const show = (): { onSubmit: ReturnType<typeof vi.fn> } => {
	const onSubmit = vi.fn();
	render(
		<AddConstraintDialog
			roles={roles}
			shifts={shifts}
			onClose={vi.fn()}
			onSubmit={onSubmit}
		/>
	);
	return { onSubmit };
};

const choose = async (
	user: ReturnType<typeof userEvent.setup>,
	field: RegExp,
	option: string
): Promise<void> => {
	await user.click(screen.getByRole("button", { name: field }));
	await user.click(screen.getByRole("option", { name: option }));
	if (screen.queryByRole("listbox")) await user.keyboard("{Escape}");
};

describe("AddConstraintDialog", () => {
	it("given_aNewRule_when_opened_then_startsAsAnIncompleteMustRule", () => {
		show();

		const dialog = screen.getByRole("dialog", { name: "Add Constraint" });
		expect(within(dialog).getByText("Incomplete")).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: /^Rule/ })
		).toHaveTextContent("Staffing requirement");
		expect(
			within(dialog).getByRole("button", { name: /^Requirement/ })
		).toHaveTextContent("must");
	});

	it("given_missingParts_when_saved_then_namesEachAndSubmitsNothing", async () => {
		const user = userEvent.setup();
		const { onSubmit } = show();

		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(await screen.findByText("Choose a condition.")).toBeInTheDocument();
		expect(
			screen.getByText("Enter a headcount from 1 to 999.")
		).toBeInTheDocument();
		expect(screen.getByText("Choose at least one role.")).toBeInTheDocument();
		expect(screen.getByText("Choose at least one shift.")).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("given_everyPart_when_saved_then_submitsTheRuleAndItsSentence", async () => {
		const user = userEvent.setup();
		const { onSubmit } = show();

		await choose(user, /^Condition/, "at least");
		await user.type(screen.getByRole("spinbutton", { name: /Headcount/ }), "2");
		await choose(user, /^Roles/, "Cashier");
		await choose(user, /^Shifts/, "Lunch Rush");

		expect(screen.getByText("Complete")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(onSubmit).toHaveBeenCalledWith(
			{
				type: "STAFFING_REQUIREMENT",
				requirement: "MUST",
				condition: "AT_LEAST",
				headcount: 2,
				roleIds: ["cashier"],
				shiftIds: ["lunch-rush"],
			},
			"There must be at least 2 employees with roles Cashier assigned to the Lunch Rush shifts."
		);
	});

	it("given_selectAll_when_chosen_then_summarisesAsAllShifts", async () => {
		const user = userEvent.setup();
		show();

		await choose(user, /^Shifts/, "Select All");

		expect(screen.getByRole("button", { name: /^Shifts/ })).toHaveTextContent(
			"All shifts"
		);
	});

	it("given_choices_when_reset_then_returnsToTheStart", async () => {
		const user = userEvent.setup();
		show();
		await choose(user, /^Condition/, "exactly");

		await user.click(screen.getByRole("button", { name: "Reset" }));

		expect(
			screen.getByRole("button", { name: /^Condition/ })
		).toHaveTextContent("Please Select");
	});
});
