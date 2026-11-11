import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import { SetupDepartmentField } from "@/features/scheduling/SetupDepartmentField";
import { workspaceQuery } from "@/features/workspace/api";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
	title: "Features/Scheduling/SetupDepartmentField",
	component: SetupDepartmentField,
	parameters: { layout: "padded" },
	decorators: [storyProviders(client)],
	beforeEach: (): void => {
		client.setQueryData(
			workspaceQuery.queryKey,
			schedulingWorkspace(["shift:create"])
		);
	},
	args: {
		department: {
			kind: "choose",
			companyId: "c-1",
			keys: ["shift:create"],
			value: "",
			onChange: fn(),
		},
		labels: {
			label: "Department",
			placeholder: "Select a department",
			hint: "Shifts belong to one department.",
			empty: "No active department you can add shifts to.",
		},
	},
} satisfies Meta<typeof SetupDepartmentField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Adding: the active departments where the person may add shifts. */
export const Choose: Story = {};

/** Editing: the shift's own department, shown and not changed. */
export const Fixed: Story = {
	args: {
		department: {
			kind: "fixed",
			departmentId: "d-1",
			label: "Main branch › Front Office",
		},
	},
};
