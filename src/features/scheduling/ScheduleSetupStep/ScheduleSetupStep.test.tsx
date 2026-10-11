import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { periodStartingOn } from "@/features/scheduling/periods";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import {
	ScheduleSetupStep,
	type ScheduleSetupStepProps,
} from "@/features/scheduling/ScheduleSetupStep";
import { workspaceQuery, type Workspace } from "@/features/workspace/api";

const PERIODS = [
	periodStartingOn("2026-10-12"),
	periodStartingOn("2026-10-19"),
];

const DEFAULTS = {
	departmentId: "",
	name: "",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
};

const clientWith = (workspace: Workspace): QueryClient => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	client.setQueryData(workspaceQuery.queryKey, workspace);
	return client;
};

const Harness = ({
	workspace = schedulingWorkspace(["schedule:read", "schedule:create"]),
	...props
}: Partial<ScheduleSetupStepProps> & {
	workspace?: Workspace;
}): FunctionComponent => (
	<I18nextProvider i18n={authTestI18n}>
		<QueryClientProvider client={clientWith(workspace)}>
			<ScheduleSetupStep
				companyId="c-1"
				defaultValues={DEFAULTS}
				formId="setup"
				periods={PERIODS}
				onSubmit={vi.fn().mockResolvedValue(undefined)}
				{...props}
			/>
			<button form="setup" type="submit">
				Next
			</button>
		</QueryClientProvider>
	</I18nextProvider>
);

describe("ScheduleSetupStep", () => {
	it("given_nothingEntered_when_submitted_then_asksForDepartmentAndName", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(<Harness onSubmit={onSubmit} />);

		await user.click(screen.getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Choose a department.")).toBeVisible();
		expect(screen.getByText("Enter a schedule name.")).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("given_everythingChosen_when_submitted_then_reportsTheSetup", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(<Harness onSubmit={onSubmit} />);

		await user.click(screen.getByRole("button", { name: /Department/ }));
		await user.click(
			await screen.findByRole("option", { name: "Main branch › Kitchen" })
		);
		await user.type(
			screen.getByRole("textbox", { name: /Schedule name/ }),
			"  Kitchen - Week 42 "
		);
		await user.click(screen.getByRole("button", { name: /Schedule period/ }));
		await user.click(await screen.findByRole("option", { name: /19.+25/ }));
		await user.click(
			screen.getByRole("checkbox", { name: "Allow open shifts" })
		);
		await user.click(screen.getByRole("button", { name: "Next" }));

		await vi.waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});
		expect(onSubmit.mock.calls[0]?.[0]).toEqual({
			departmentId: "d-2",
			name: "Kitchen - Week 42",
			periodStart: "2026-10-19",
			includeLeave: true,
			allowOpenShifts: true,
		});
	});

	it("given_theWorkspace_when_departmentsListed_then_offersOnlyActiveOnesWhereSchedulesMayBeCreated", async () => {
		const user = userEvent.setup();
		const workspace = schedulingWorkspace(["schedule:read"]);
		const kitchen = workspace.companies[0]?.branches[0]?.departments[1];
		kitchen?.permissions.push("schedule:create");
		render(<Harness workspace={workspace} />);

		await user.click(screen.getByRole("button", { name: /Department/ }));

		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Main branch › Kitchen"]);
	});

	it("given_noDepartmentToCreateIn_when_rendered_then_saysWhy", () => {
		render(<Harness workspace={schedulingWorkspace(["schedule:read"])} />);

		expect(
			screen.getByText(
				"You don’t have permission to create schedules in any active department."
			)
		).toBeVisible();
	});

	it("given_aNameOutsideTheRule_when_submitted_then_saysWhatIsAllowed", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				defaultValues={{ ...DEFAULTS, departmentId: "d-1", name: "W" }}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Use 2 to 100 characters.")).toBeVisible();
	});

	it("given_theSettings_when_rendered_then_eachIsDescribed", () => {
		render(<Harness />);

		expect(
			screen.getByRole("checkbox", { name: "Include leave requests" })
		).toHaveAccessibleDescription(
			"Consider approved leave when generating the schedule."
		);
		expect(screen.getByRole("note")).toHaveTextContent(
			"Select a period that aligns with your business operations."
		);
	});

	it("given_aSavedDraft_when_rendered_then_showsItsDepartmentWithoutAChoice", () => {
		render(
			<Harness
				defaultValues={{ ...DEFAULTS, departmentId: "d-9", name: "Week 42" }}
				lockedDepartment={{
					departmentId: "d-9",
					label: "Main branch › Concierge",
				}}
			/>
		);

		const department = screen.getByRole("button", { name: /Department/ });
		expect(department).toBeDisabled();
		expect(department).toHaveTextContent("Main branch › Concierge");
		expect(
			screen.getByText("A saved draft stays with its department.")
		).toBeVisible();
	});

	it("given_readOnly_when_rendered_then_nothingCanBeChangedButItStillSubmits", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(
			<Harness
				readOnly
				defaultValues={{ ...DEFAULTS, departmentId: "d-1", name: "Week 42" }}
				lockedDepartment={{
					departmentId: "d-1",
					label: "Main branch › Front Office",
				}}
				onSubmit={onSubmit}
			/>
		);

		expect(
			screen.getByRole("textbox", { name: /Schedule name/ })
		).toHaveAttribute("readonly");
		expect(
			screen.getByRole("button", { name: /Schedule period/ })
		).toBeDisabled();
		expect(
			screen.getByRole("checkbox", { name: "Include leave requests" })
		).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "Next" }));
		await vi.waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});
	});

	it("given_aRefusedField_when_submitted_then_showsItOnTheField", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				defaultValues={{ ...DEFAULTS, departmentId: "d-1", name: "Week 42" }}
				onSubmit={vi
					.fn()
					.mockResolvedValue({ periodStart: "Choose a Monday." })}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Choose a Monday.")).toBeVisible();
	});
});
