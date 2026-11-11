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
	it("given_noBranchOrDepartmentChosen_when_rendered_then_namesEachRowsBranchAndDepartment", () => {
		render(<ShiftTable showBranch showDepartment shifts={rows} />);

		expect(headers()).toEqual(expect.arrayContaining(["Branch", "Department"]));
		const bar = screen.getByRole("row", { name: /Breakfast Prep/ });
		expect(bar).toHaveTextContent("Main branch");
		expect(bar).toHaveTextContent("Bar");
	});

	it("given_branchAndDepartmentChosen_when_rendered_then_leavesTheirColumnsOut", () => {
		render(<ShiftTable shifts={rows} />);

		expect(headers()).not.toContain("Branch");
		expect(headers()).not.toContain("Department");
	});

	it("given_shiftsInGroups_when_rendered_then_countsEachGroupOnItsTab", async () => {
		const user = userEvent.setup();
		render(<ShiftTable shifts={SHIFT_FIXTURES} />);

		const tabs = screen.getByRole("tablist", { name: "Shift types" });
		expect(within(tabs).getByRole("tab", { name: /^All/ })).toHaveTextContent(
			String(SHIFT_FIXTURES.length)
		);
		expect(
			within(tabs).getByRole("tab", { name: /Service/ })
		).toHaveTextContent("3");

		await user.click(within(tabs).getByRole("tab", { name: /Kitchen/ }));
		const table = screen.getByRole("table", { name: "Shifts" });
		expect(within(table).getAllByRole("row")).toHaveLength(2);
	});

	it("given_aRowThePersonMayNotChange_when_rendered_then_leavesOutOnlyItsButtons", () => {
		render(
			<ShiftTable
				canChange={(shift) => shift.departmentId === "d-1"}
				shifts={rows}
				onDelete={vi.fn()}
				onEdit={vi.fn()}
			/>
		);

		expect(
			screen.getByRole("button", { name: "Edit Front Desk AM" })
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Delete Front Desk AM" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Edit Breakfast Prep" })
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Delete Breakfast Prep" })
		).toBeNull();
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
			"Branch",
			"Department",
			"Time range",
			"Paid hours",
			"Days applied to",
			"Role count",
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
