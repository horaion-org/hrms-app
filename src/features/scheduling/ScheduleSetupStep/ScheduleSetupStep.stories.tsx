import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { periodStartingOn } from "@/features/scheduling/periods";
import { ScheduleSetupStep } from "@/features/scheduling/ScheduleSetupStep";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ScheduleSetupStep",
	component: ScheduleSetupStep,
	parameters: { layout: "padded" },
	args: {
		formId: "setup",
		defaultValues: {
			departmentId: "",
			name: "",
			periodStart: "2026-04-13",
			includeLeave: true,
			allowOpenShifts: false,
		},
		departments: {
			status: "ready",
			total: 5,
			items: [
				"Front Office",
				"Housekeeping",
				"Food & Beverage",
				"Kitchen",
				"Service Crew",
			].map((name, index) => ({
				departmentId: `d-${index + 1}`,
				branchId: "b-1",
				name,
				status: "ACTIVE" as const,
			})),
		},
		periods: ["2026-04-13", "2026-04-20", "2026-04-27"].map(periodStartingOn),
		onSubmit: fn(() => Promise.resolve(undefined)),
	},
} satisfies Meta<typeof ScheduleSetupStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LoadingDepartments: Story = {
	args: { departments: { status: "pending" } },
};

export const DepartmentsHidden: Story = {
	args: { departments: { status: "hidden" } },
};

export const SavedDraft: Story = {
	args: {
		defaultValues: {
			departmentId: "d-1",
			name: "Front Office - Week 16",
			periodStart: "2026-04-13",
			includeLeave: true,
			allowOpenShifts: false,
		},
		lockedDepartment: { departmentId: "d-1", name: "Front Office" },
	},
};
