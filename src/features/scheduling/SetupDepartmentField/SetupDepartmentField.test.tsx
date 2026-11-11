import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import {
	SetupDepartmentField,
	type SetupDepartment,
} from "@/features/scheduling/SetupDepartmentField";
import { workspaceQuery } from "@/features/workspace/api";

const LABELS = {
	label: "Department",
	placeholder: "Select a department",
	hint: "Shifts belong to one department.",
	empty: "No active department you can add shifts to.",
};

/** Renders the field in company c-1, holding `permissions` company-wide over Main branch's departments. */
const renderField = (
	department: SetupDepartment,
	permissions: Array<string> = ["shift:create"]
): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	client.setQueryData(
		workspaceQuery.queryKey,
		schedulingWorkspace(permissions)
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<SetupDepartmentField department={department} labels={LABELS} />
			</QueryClientProvider>
		</I18nextProvider>
	);
};

const choose = (
	overrides: Partial<Extract<SetupDepartment, { kind: "choose" }>> = {}
): SetupDepartment => ({
	kind: "choose",
	companyId: "c-1",
	keys: ["shift:create"],
	value: "",
	onChange: vi.fn(),
	...overrides,
});

describe("SetupDepartmentField", () => {
	it("given_choose_when_opened_then_offersTheActiveDepartmentsWithTheKeyAndReportsTheChoice", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderField(choose({ onChange }));

		expect(screen.getByText(LABELS.hint)).toBeVisible();
		await user.click(screen.getByRole("button", { name: /^Department/ }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Main branch › Front Office", "Main branch › Kitchen"]);
		await user.click(screen.getByRole("option", { name: /Kitchen/ }));
		expect(onChange).toHaveBeenCalledWith("d-2");
	});

	it("given_choose_when_noDepartmentHoldsTheKey_then_saysThereIsNoneToChoose", () => {
		renderField(choose(), ["shift:read"]);

		expect(screen.getByText(LABELS.empty)).toBeVisible();
	});

	it("given_fixed_when_rendered_then_showsTheDepartmentDisabledWithoutAHint", () => {
		renderField({
			kind: "fixed",
			departmentId: "d-1",
			label: "Main branch › Front Office",
		});

		const field = screen.getByRole("button", { name: /^Department/ });
		expect(field).toBeDisabled();
		expect(field).toHaveTextContent("Main branch › Front Office");
		expect(screen.queryByText(LABELS.hint)).toBeNull();
	});
});
