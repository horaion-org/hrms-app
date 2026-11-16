import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	SHIFT_FIXTURES,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";
import { ShiftTable } from "@/features/scheduling/shifts/ShiftTable";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** Front Desk AM in Front Office and Breakfast Prep in Bar, at Main branch. */
const rows = [
	departmentShiftFixture(SHIFT_FIXTURES[0]),
	{
		...departmentShiftFixture(SHIFT_FIXTURES[1]),
		departmentId: "d-2",
		departmentName: "Bar",
	},
];

const headers = (): Array<string> =>
	screen.getAllByRole("columnheader").map((header) => header.textContent ?? "");

describe("ShiftTable", () => {
	it("given_noBranchOrDepartmentChosen_when_rendered_then_namesEachRowsBranchAndDepartmentUnderItsName", () => {
		render(<ShiftTable showBranch showDepartment shifts={rows} />);

		expect(headers()).not.toContain("Branch");
		expect(headers()).not.toContain("Department");
		const bar = screen.getByRole("row", { name: /Breakfast Prep/ });
		expect(bar).toHaveTextContent("Main branch › Bar");
	});

	it("given_branchAndDepartmentChosen_when_rendered_then_leavesTheirColumnsOut", () => {
		render(<ShiftTable shifts={rows} />);

		expect(headers()).not.toContain("Branch");
		expect(headers()).not.toContain("Department");
	});

	it("given_shiftsInGroups_when_rendered_then_headsEachGroupWithItsCountInTheOrderTheDayRuns", () => {
		render(<ShiftTable shifts={SHIFT_FIXTURES} />);

		const groups = ["Kitchen", "Front Desk", "Concierge", "Service", "Night"];
		expect(
			screen
				.getAllByRole("columnheader")
				.filter((header) => header.getAttribute("scope") === "colgroup")
				// Each heading ends with the hours its group spans.
				.map((header) => header.textContent?.replace(/ · [^·]*$/, ""))
		).toEqual(
			groups.map((group) =>
				group === "Service" ? `${group} · 3 shifts` : `${group} · 1 shift`
			)
		);
		expect(screen.queryByRole("tablist")).toBeNull();
	});

	it("given_aTickableGroup_when_folded_then_itsHeadingSaysItsSpanAndHowManyAreTicked_andTheTicksStay", async () => {
		const user = userEvent.setup();
		window.localStorage.clear();
		const onChange = vi.fn();
		const service = SHIFT_FIXTURES.filter((shift) => shift.group === "Service");
		render(
			<ShiftTable
				selection={{ selectedIds: [service[0]!.shiftId], onChange }}
				shifts={SHIFT_FIXTURES}
			/>
		);

		const heading = screen.getByRole("button", { name: /^Service · 3 shifts/ });
		expect(heading).toHaveAttribute("aria-expanded", "true");
		await user.click(heading);

		expect(heading).toHaveAttribute("aria-expanded", "false");
		expect(heading).toHaveTextContent("1 of 3 chosen");
		expect(
			screen.queryByRole("row", { name: new RegExp(service[0]!.name) })
		).toBeNull();
		expect(onChange).not.toHaveBeenCalled();
		await user.click(screen.getByRole("button", { name: "Expand all" }));
		expect(
			screen.getByRole("checkbox", { name: new RegExp(service[0]!.name) })
		).toBeChecked();
	});

	it("given_aShift_when_rendered_then_readsItsTimesAndDaysAndNamesItsJobTitles", () => {
		render(<ShiftTable shifts={[rows[0]!]} />);

		const frontDesk = screen.getByRole("row", { name: /Front Desk AM/ });
		expect(frontDesk).toHaveTextContent(/09:00 – 15:00 · /);
		// Its bar, in its column and, for phones, on the name's line.
		expect(within(frontDesk).getAllByTestId("shift-day-bar")).not.toHaveLength(
			0
		);
	});

	it("given_needs_when_rendered_then_saysWhatEachShiftNeedsAndWarnsWhereTooFewHoldTheTitles", () => {
		const need = {
			constraintId: "c-1",
			name: "Desk cover",
			departmentId: "d-1",
			comparison: "AT_LEAST",
			headcount: 3,
			jobTitleNames: ["Clerk"],
			onDuty: false,
			ifPossible: false,
		};
		render(
			<ShiftTable
				shifts={rows}
				needs={{
					byShift: new Map([["front-desk-am", [need]]]),
					capacityOf: () => ({
						headcount: 3,
						peopleWithTitles: 2,
						jobTitleNames: ["Clerk"],
					}),
				}}
			/>
		);

		expect(screen.getByRole("columnheader", { name: "Needed" })).toBeVisible();
		const frontDesk = screen.getByRole("row", { name: /Front Desk AM/ });
		expect(frontDesk).toHaveTextContent("3 Clerk");
		expect(frontDesk).toHaveTextContent("Only 2 hold the title");
		expect(
			screen.getByRole("row", { name: /Breakfast Prep/ })
		).toHaveTextContent("Not set");
	});

	it("given_noNeeds_when_rendered_then_leavesTheNeededColumnOut", () => {
		render(<ShiftTable shifts={rows} />);

		expect(screen.queryByRole("columnheader", { name: "Needed" })).toBeNull();
	});

	it("given_editAndDeleteByRow_when_rendered_then_eachButtonFollowsItsOwnRule", () => {
		render(
			<ShiftTable
				canDelete={(shift) => shift.departmentId === "d-2"}
				canEdit={(shift) => shift.departmentId === "d-1"}
				shifts={rows}
				onDelete={vi.fn()}
				onEdit={vi.fn()}
			/>
		);

		expect(
			screen.getByRole("button", { name: "Edit Front Desk AM" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Delete Front Desk AM" })
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Edit Breakfast Prep" })
		).toBeNull();
		expect(
			screen.getByRole("button", { name: "Delete Breakfast Prep" })
		).toBeVisible();
	});

	it("given_aPhone_when_rendered_then_keepsOnlyTheNameAndActionsAsColumns", () => {
		render(
			<ShiftTable
				showBranch
				showDepartment
				shifts={rows}
				onDelete={vi.fn()}
				onEdit={vi.fn()}
			/>
		);

		const hiddenOnPhones = screen
			.getAllByRole("columnheader")
			.filter((header) => header.className.includes("hidden md:table-cell"))
			.map((header) => header.textContent);
		expect(hiddenOnPhones).toEqual([
			expect.stringMatching(/^When it runs/),
			"Paid hours",
			"Job titles",
		]);
		const frontDesk = screen.getByRole("row", { name: /Front Desk AM/ });
		expect(frontDesk).toHaveTextContent("09:00 – 15:00");
	});

	it("given_noShifts_when_rendered_then_showsTheEmptyStateGiven", () => {
		render(<ShiftTable emptyState="Nothing matches." shifts={[]} />);

		expect(screen.getByText("Nothing matches.")).toBeVisible();
		expect(screen.queryByRole("tablist")).toBeNull();
	});
});
