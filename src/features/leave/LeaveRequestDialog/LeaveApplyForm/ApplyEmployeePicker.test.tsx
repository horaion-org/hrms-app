import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ApplyEmployeePicker } from "./ApplyEmployeePicker";

/** Apply leave's person step over two Kitchens of two Branches and one Sales. */
const renderPicker = (): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ApplyEmployeePicker
				error={undefined}
				id="apply"
				membershipId=""
				employees={{
					search: "",
					onSearch: vi.fn(),
					department: "all",
					departments: [
						{ departmentId: "d-1", name: "Kitchen", branchName: "Orchard" },
						{ departmentId: "d-2", name: "Kitchen", branchName: "Tampines" },
						{ departmentId: "d-3", name: "Sales", branchName: "Orchard" },
					],
					onDepartment: vi.fn(),
					options: [
						{
							membershipId: "m-1",
							displayName: "Aisha Rahman",
							employeeCode: "EMP-1",
							departmentName: "Kitchen",
							branchName: "Orchard",
						},
						{
							membershipId: "m-2",
							displayName: "Aisha Rahman",
							employeeCode: "EMP-2",
							departmentName: "Kitchen",
							branchName: "Tampines",
						},
					],
				}}
				onChoose={vi.fn()}
			/>
		</I18nextProvider>
	);
};

describe("ApplyEmployeePicker", () => {
	it("names two same-named Departments with their Branch first in the filter", async () => {
		const user = userEvent.setup();
		renderPicker();

		await user.click(screen.getByRole("button", { name: "Department" }));

		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual([
			"All departments",
			"Orchard › Kitchen",
			"Tampines › Kitchen",
			"Sales",
		]);
	});

	it("tells two people of one name in same-named Departments apart by their Branch", async () => {
		const user = userEvent.setup();
		renderPicker();

		await user.click(screen.getByRole("button", { name: "Employee" }));

		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual([
			"Aisha Rahman Orchard › Kitchen · EMP-1",
			"Aisha Rahman Tampines › Kitchen · EMP-2",
		]);
	});
});
