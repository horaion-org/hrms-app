import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	MonthSetupStep,
	type MonthSetupStepProps,
} from "@/features/scheduling/MonthSetupStep";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import { workspaceQuery } from "@/features/workspace/api";

const DEFAULTS = {
	departmentId: "",
	month: "2026-11",
	includeLeave: true,
	allowOpenShifts: false,
};

const clientWithWorkspace = (): QueryClient => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	client.setQueryData(
		workspaceQuery.queryKey,
		schedulingWorkspace(["schedule:read", "schedule:create"])
	);
	return client;
};

const Harness = (props: Partial<MonthSetupStepProps>): FunctionComponent => (
	<I18nextProvider i18n={authTestI18n}>
		<QueryClientProvider client={clientWithWorkspace()}>
			<MonthSetupStep
				companyId="c-1"
				defaultValues={DEFAULTS}
				formId="month-setup"
				months={["2026-11", "2026-12", "2027-01"]}
				onDepartmentChange={vi.fn()}
				onMonthChange={vi.fn()}
				onSubmit={vi.fn()}
				{...props}
			/>
			<button form="month-setup" type="submit">
				Next
			</button>
		</QueryClientProvider>
	</I18nextProvider>
);

// Dates read as the test browser (en-US) writes them.
describe("MonthSetupStep", () => {
	it("given_november_when_shown_then_namesItsFiveWeeks", () => {
		render(<Harness />);

		expect(
			screen.getByText(
				"5 weeks: Mon, Nov 2 to Sun, Dec 6. A week belongs to the month its Monday falls in."
			)
		).toBeInTheDocument();
	});

	it("given_decemberChosen_when_shown_then_namesItsFourWeeksAndTellsThePage", async () => {
		const user = userEvent.setup();
		const onMonthChange = vi.fn();
		render(<Harness onMonthChange={onMonthChange} />);

		await user.click(screen.getByRole("button", { name: /Month/ }));
		await user.click(
			await screen.findByRole("option", { name: "December 2026" })
		);

		expect(
			screen.getByText(
				"4 weeks: Mon, Dec 7 to Sun, Jan 3. A week belongs to the month its Monday falls in."
			)
		).toBeInTheDocument();
		expect(onMonthChange).toHaveBeenLastCalledWith("2026-12");
	});

	it("given_nothingChosen_when_submitted_then_asksForADepartment", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<Harness onSubmit={onSubmit} />);

		await user.click(screen.getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Choose a department.")).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("given_everythingChosen_when_submitted_then_givesTheValuesAndToldTheDepartment", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		const onDepartmentChange = vi.fn();
		render(
			<Harness onDepartmentChange={onDepartmentChange} onSubmit={onSubmit} />
		);

		await user.click(screen.getByRole("button", { name: /Department/ }));
		await user.click(await screen.findByRole("option", { name: "Kitchen" }));
		await user.click(
			screen.getByRole("checkbox", { name: "Allow open shifts" })
		);
		await user.click(screen.getByRole("button", { name: "Next" }));

		await vi.waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});
		expect(onSubmit.mock.calls[0]?.[0]).toEqual({
			departmentId: "d-2",
			month: "2026-11",
			includeLeave: true,
			allowOpenShifts: true,
		});
		expect(onDepartmentChange).toHaveBeenLastCalledWith("d-2");
	});
});
