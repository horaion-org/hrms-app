import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { ConstraintValue } from "@/features/scheduling/constraints/api";
import {
	companyConstraintFixture,
	constraintFixture,
} from "@/features/scheduling/constraints/fixtures";
import { shiftFixture } from "@/features/scheduling/shifts/fixtures";
import {
	WeekChoiceDialog,
	type WeekChoiceDialogProps,
} from "@/features/scheduling/WeekChoiceDialog";
import { allOf } from "@/features/scheduling/weekChoice";

const shiftValue = (shiftId: string, name: string): ConstraintValue => ({
	field: "SHIFT",
	value: shiftId,
	name,
});

const SHIFTS = [
	shiftFixture({ shiftId: "opening", name: "Opening" }),
	shiftFixture({ shiftId: "sunday", name: "Sunday" }),
];
const OPENING_COVER = constraintFixture({
	constraintId: "opening-cover",
	name: "Opening cover",
	type: "SHIFT_STAFFING",
	requiresPeople: true,
	values: [shiftValue("opening", "Opening")],
});
const SUNDAY_COVER = constraintFixture({
	constraintId: "sunday-cover",
	name: "Sunday cover",
	type: "SHIFT_STAFFING",
	requiresPeople: true,
	values: [shiftValue("sunday", "Sunday")],
});
const COMPANY_REST = companyConstraintFixture({
	constraintId: "company-rest",
	name: "Company rest",
	type: "REST_BETWEEN_SHIFTS",
	category: "WORKING_HOURS",
	requirement: null,
	lock: "LOCKED",
	values: [{ field: "REST_HOURS", value: "11", name: null }],
});
const CONSTRAINTS = [COMPANY_REST, OPENING_COVER, SUNDAY_COVER];

const show = (props: Partial<WeekChoiceDialogProps> = {}): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<WeekChoiceDialog
				constraints={CONSTRAINTS}
				departmentName="Kitchen"
				periodLabel="Nov 16 – 22, 2026"
				shifts={SHIFTS}
				value={allOf(SHIFTS, CONSTRAINTS)}
				onApply={vi.fn()}
				onClose={vi.fn()}
				{...props}
			/>
		</I18nextProvider>
	);
};

const box = (name: string): HTMLElement =>
	screen.getByRole("checkbox", { name: `Select ${name}` });
const use = (): HTMLElement =>
	screen.getByRole("button", { name: "Use for week" });

describe("WeekChoiceDialog", () => {
	it("given_everythingChosen_when_opened_then_startsAllTicked", () => {
		show();

		expect(
			screen.getByRole("dialog", { name: "What Nov 16 – 22, 2026 uses" })
		).toHaveTextContent(
			"Untick to leave something out of this week only. Kitchen keeps it."
		);
		for (const name of ["Opening", "Sunday", "Opening cover", "Sunday cover"])
			expect(box(name)).toBeChecked();
		expect(use()).toBeEnabled();
	});

	it("given_aShiftUnticked_when_shown_then_switchesOffItsConstraintNamingTheShift", async () => {
		const user = userEvent.setup();
		const onApply = vi.fn();
		show({ onApply });

		await user.click(box("Sunday"));

		expect(box("Sunday cover")).not.toBeChecked();
		expect(box("Sunday cover")).toBeDisabled();
		expect(screen.getByRole("row", { name: /Sunday cover/ })).toHaveTextContent(
			"Uses Sunday, which this week leaves out."
		);
		await user.click(use());
		expect(onApply).toHaveBeenCalledWith({
			shiftIds: ["opening"],
			constraintIds: ["company-rest", "opening-cover"],
		});
	});

	it("given_aLockedConstraint_when_shown_then_itIsTickedDisabledAndSaysWhy", () => {
		show();

		expect(box("Company rest")).toBeChecked();
		expect(box("Company rest")).toBeDisabled();
		expect(screen.getByRole("row", { name: /Company rest/ })).toHaveTextContent(
			"Locked by the work policy."
		);
	});

	it("given_noShift_when_chosen_then_saysSoAndUseIsDisabled", async () => {
		const user = userEvent.setup();
		show();

		await user.click(box("Opening"));
		await user.click(box("Sunday"));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose at least one shift for this week."
		);
		expect(use()).toBeDisabled();
	});

	it("given_noStaffingConstraint_when_chosen_then_saysSoAndUseIsDisabled", async () => {
		const user = userEvent.setup();
		show();

		await user.click(box("Opening cover"));
		await user.click(box("Sunday cover"));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Tick at least one staffing constraint. Without one, nobody is rostered."
		);
		expect(use()).toBeDisabled();
	});

	it("given_changes_when_cancelled_then_closesWithoutApplying", async () => {
		const user = userEvent.setup();
		const onApply = vi.fn();
		const onClose = vi.fn();
		show({ onApply, onClose });

		await user.click(box("Sunday"));
		await user.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onClose).toHaveBeenCalled();
		expect(onApply).not.toHaveBeenCalled();
	});

	it("given_aGeneratedSchedule_when_viewed_then_offersNoBoxesAndOnlyClose", () => {
		show({ readOnly: true });

		const dialog = screen.getByRole("dialog", {
			name: "What Nov 16 – 22, 2026 used",
		});
		expect(within(dialog).queryByRole("checkbox")).toBeNull();
		expect(dialog).not.toHaveTextContent("Untick");
		expect(
			within(dialog).queryByRole("button", { name: "Use for week" })
		).toBeNull();
		expect(
			within(dialog).getAllByRole("button", { name: "Close" }).length
		).toBeGreaterThan(0);
	});
});
