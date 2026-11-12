import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { ConstraintValue } from "@/features/scheduling/constraints/api";
import { constraintFixture } from "@/features/scheduling/constraints/fixtures";
import {
	MonthChoiceDialog,
	type MonthChoiceDialogProps,
} from "@/features/scheduling/MonthChoiceDialog";
import type { MonthChoices } from "@/features/scheduling/months/monthGeneration";
import { shiftFixture } from "@/features/scheduling/shifts/fixtures";
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
const CONSTRAINTS = [
	constraintFixture({
		constraintId: "opening-cover",
		name: "Opening cover",
		type: "SHIFT_STAFFING",
		requiresPeople: true,
		values: [shiftValue("opening", "Opening")],
	}),
	constraintFixture({
		constraintId: "sunday-cover",
		name: "Sunday cover",
		type: "SHIFT_STAFFING",
		requiresPeople: true,
		values: [shiftValue("sunday", "Sunday")],
	}),
];
const EVERYTHING = allOf(SHIFTS, CONSTRAINTS);
const WEEKS = [
	{ periodStart: "2026-12-07", label: "Dec 7 – 13" },
	{ periodStart: "2026-12-14", label: "Dec 14 – 20" },
	{ periodStart: "2026-12-21", label: "Dec 21 – 27" },
];
const ALL_TICKED: MonthChoices = Object.fromEntries(
	WEEKS.map((week) => [week.periodStart, EVERYTHING])
);

const show = (
	props: Partial<MonthChoiceDialogProps> = {}
): { onApply: ReturnType<typeof vi.fn> } => {
	const onApply = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<MonthChoiceDialog
				constraints={CONSTRAINTS}
				monthName="December"
				shifts={SHIFTS}
				value={ALL_TICKED}
				weeks={WEEKS}
				onApply={onApply}
				onClose={vi.fn()}
				{...props}
			/>
		</I18nextProvider>
	);
	return { onApply };
};

const apply = (): HTMLElement =>
	screen.getByRole("button", { name: "Use for December" });

describe("MonthChoiceDialog", () => {
	it("given_threeWeeksAllTicked_when_shown_then_aTabPerWeekAndApplySendsThemAsTheyAre", async () => {
		const { onApply } = show();

		expect(
			within(screen.getByRole("tablist", { name: "Weeks of December" }))
				.getAllByRole("tab")
				.map((tab) => tab.textContent?.trim())
		).toEqual(["Dec 7 – 13", "Dec 14 – 20", "Dec 21 – 27"]);
		await userEvent.click(apply());
		expect(onApply).toHaveBeenCalledWith(ALL_TICKED);
	});

	it("given_aShiftUntickedInOneWeek_when_applied_then_onlyThatWeekChangesAndItsTabCounts", async () => {
		const { onApply } = show();

		await userEvent.click(screen.getByRole("tab", { name: "Dec 14 – 20" }));
		const panel = screen.getByRole("tabpanel");
		await userEvent.click(
			within(panel).getByRole("checkbox", { name: "Select Sunday" })
		);

		expect(
			screen.getByRole("tab", { name: "Dec 14 – 20 · 2 left out" })
		).toBeInTheDocument();
		await userEvent.click(apply());
		const choices = onApply.mock.calls[0]?.[0] as MonthChoices;
		expect(choices["2026-12-07"]).toEqual(EVERYTHING);
		expect(choices["2026-12-14"]).toEqual({
			shiftIds: ["opening"],
			constraintIds: ["opening-cover"],
		});
	});

	it("given_oneWeeksChoice_when_usedForEveryWeek_then_everyWeekTakesIt", async () => {
		const { onApply } = show();

		await userEvent.click(screen.getByRole("tab", { name: "Dec 14 – 20" }));
		await userEvent.click(
			within(screen.getByRole("tabpanel")).getByRole("checkbox", {
				name: "Select Sunday",
			})
		);
		await userEvent.click(
			screen.getByRole("button", {
				name: "Use this week’s choice for every week",
			})
		);
		await userEvent.click(apply());

		const choices = onApply.mock.calls[0]?.[0] as MonthChoices;
		expect(Object.values(choices)).toEqual(
			WEEKS.map(() => ({
				shiftIds: ["opening"],
				constraintIds: ["opening-cover"],
			}))
		);
	});

	it("given_aWeekThatRostersNobody_when_shown_then_applyWaitsAndNamesTheWeek", () => {
		show({
			value: {
				...ALL_TICKED,
				"2026-12-21": { shiftIds: [], constraintIds: [] },
			},
		});

		expect(apply()).toBeDisabled();
		expect(screen.getByRole("alert")).toHaveTextContent(/^Dec 21 – 27: /);
	});

	it("given_aChange_when_cancelled_then_nothingIsApplied", async () => {
		const onClose = vi.fn();
		const { onApply } = show({ onClose });

		await userEvent.click(
			within(screen.getByRole("tabpanel")).getByRole("checkbox", {
				name: "Select Sunday",
			})
		);
		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(onClose).toHaveBeenCalledOnce();
		expect(onApply).not.toHaveBeenCalled();
	});
});
