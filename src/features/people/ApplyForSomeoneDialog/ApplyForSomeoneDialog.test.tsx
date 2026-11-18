import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	ApplyForSomeoneDialog,
	type ApplyForSomeoneDialogProps,
	type PersonToApplyFor,
} from "@/features/people/ApplyForSomeoneDialog";

const ALEX = { membershipId: "m-1", displayName: "Alex Example" };
const BEA = { membershipId: "m-2", displayName: "Bea Kitchen" };

/** The dialog over Alex and Bea, of whom only Alex may be set for, with `props` over the defaults. */
const renderDialog = (
	props: Partial<ApplyForSomeoneDialogProps<PersonToApplyFor>> = {}
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ApplyForSomeoneDialog
				maySetFor={(person) => person.membershipId === ALEX.membershipId}
				people={[ALEX, BEA]}
				title="Apply shift preferences"
				onChoose={vi.fn()}
				onClose={vi.fn()}
				{...props}
			/>
		</I18nextProvider>
	);
};

const dialog = (): HTMLElement =>
	screen.getByRole("dialog", { name: "Apply shift preferences" });

describe("ApplyForSomeoneDialog", () => {
	it("offers only the people the caller may set for, and goes on with the one chosen", async () => {
		const user = userEvent.setup();
		const onChoose = vi.fn();
		renderDialog({ onChoose });

		const continueButton = within(dialog()).getByRole("button", {
			name: "Continue",
		});
		expect(continueButton).toBeDisabled();
		await user.click(
			within(dialog()).getByRole("button", { name: "Employee" })
		);
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Alex Example"]);
		await user.click(screen.getByRole("option", { name: "Alex Example" }));
		await user.click(continueButton);

		expect(onChoose).toHaveBeenCalledWith(ALEX);
	});

	it("says no one matches a search that finds only people the caller may not set for", async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.type(
			within(dialog()).getByRole("searchbox", { name: "Search employees" }),
			"Bea"
		);

		expect(
			within(dialog()).getByText(
				"No one you may apply for matches this search."
			)
		).toBeVisible();
	});

	it("says what to do when no one listed may be set for", () => {
		renderDialog({ maySetFor: () => false });

		expect(
			within(dialog()).getByText(
				"There’s no one here you may apply for. Choose another branch or department, then try again."
			)
		).toBeVisible();
	});

	it("holds the choice back while the people load", () => {
		renderDialog({ people: undefined });

		expect(
			within(dialog()).getByRole("button", { name: "Employee" })
		).toBeDisabled();
		expect(within(dialog()).queryByText(/no one/i)).not.toBeInTheDocument();
	});

	it("shows why the people could not be listed in place of the choice", () => {
		renderDialog({ problem: "We couldn’t load the team. Try again." });

		expect(within(dialog()).getByRole("alert")).toHaveTextContent(
			"We couldn’t load the team. Try again."
		);
		expect(within(dialog()).queryByRole("searchbox")).not.toBeInTheDocument();
	});

	it("closes on Cancel", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		renderDialog({ onClose });

		await user.click(within(dialog()).getByRole("button", { name: "Cancel" }));

		expect(onClose).toHaveBeenCalled();
	});

	it("tells two people with the same name apart by the line under it", async () => {
		const user = userEvent.setup();
		renderDialog({
			maySetFor: () => true,
			people: [
				{ ...ALEX, departmentName: "Sales", employeeCode: "EMP-1" },
				{
					membershipId: "m-9",
					displayName: "Alex Example",
					departmentName: "Kitchen",
					jobTitleName: "Cook",
				},
			],
		});

		await user.click(
			within(dialog()).getByRole("button", { name: "Employee" })
		);

		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Alex Example Sales · EMP-1", "Alex Example Kitchen · Cook"]);
	});
});
