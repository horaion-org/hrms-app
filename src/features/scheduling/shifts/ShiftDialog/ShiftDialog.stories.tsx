import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { JobTitle } from "@/features/organisation/api";
import type { OrganisationList } from "@/features/organisation/useOrganisationList";
import { SHIFT_FIXTURES } from "@/features/scheduling/shifts/fixtures";
import { ShiftDialog } from "@/features/scheduling/shifts/ShiftDialog";

const jobTitle = (jobTitleId: string, name: string): JobTitle => ({
	jobTitleId,
	branchId: "b-1",
	branchName: "Main branch",
	departmentId: "d-1",
	departmentName: "Front Office",
	name,
	status: "ACTIVE",
});

const jobTitles: OrganisationList<JobTitle> = {
	status: "ready",
	total: 3,
	items: [
		jobTitle("front-desk-staff", "Front Desk Staff"),
		jobTitle("front-desk-lead", "Front Desk Lead"),
		jobTitle("concierge", "Concierge"),
	],
};

const meta = {
	title: "Features/Scheduling/Shifts/ShiftDialog",
	component: ShiftDialog,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		jobTitles,
		groups: ["Front Desk", "Kitchen", "Service"],
		onSave: (): Promise<void> => Promise.resolve(),
		onClose: (): void => {},
	},
} satisfies Meta<typeof ShiftDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Add: Story = {};
export const Edit: Story = { args: { editing: SHIFT_FIXTURES[0] } };
export const NoJobTitles: Story = {
	args: { jobTitles: { status: "ready", total: 0, items: [] } },
};
export const JobTitlesHidden: Story = {
	args: { jobTitles: { status: "hidden" } },
};
