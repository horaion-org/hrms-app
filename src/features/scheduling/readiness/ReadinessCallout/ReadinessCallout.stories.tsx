import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import { ReadinessCallout } from "@/features/scheduling/readiness/ReadinessCallout";

const KITCHEN = {
	departmentId: "d-1",
	name: "Kitchen",
	branchId: "b-1",
	branchName: "Orchard",
	country: "SG",
	status: "ACTIVE",
} as const;

const meta = {
	title: "Features/Scheduling/ReadinessCallout",
	component: ReadinessCallout,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-xl",
		view: "shifts",
		onChooseDepartment: fn(),
		rows: [
			readinessFixture(),
			readinessFixture({
				departmentId: "d-2",
				departmentName: "Bar",
				ready: false,
				missing: ["STAFFING_CONSTRAINT"],
			}),
		],
	},
	decorators: [
		withMemoryRouter,
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof ReadinessCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EveryDepartment: Story = {};

export const ChecklistNothingSetUp: Story = {
	args: {
		department: KITCHEN,
		rows: [
			readinessFixture({
				ready: false,
				missing: ["SHIFT", "STAFFING_CONSTRAINT"],
			}),
		],
	},
};

export const ChecklistShiftsOnly: Story = {
	args: {
		department: KITCHEN,
		rows: [
			readinessFixture({ ready: false, missing: ["STAFFING_CONSTRAINT"] }),
		],
	},
};

export const ReadyToCreate: Story = {
	args: {
		department: KITCHEN,
		rows: [readinessFixture()],
		returnTo: {
			to: "/scheduling/new",
			search: { department: "d-1", week: "2026-11-16" },
		},
	},
};
