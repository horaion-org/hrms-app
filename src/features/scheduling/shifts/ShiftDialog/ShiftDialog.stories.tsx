import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	SHIFT_FIXTURES,
	SHIFT_ROLE_OPTIONS,
} from "@/features/scheduling/shifts/fixtures";
import { ShiftDialog } from "@/features/scheduling/shifts/ShiftDialog";
import type { ShiftRoleOptions } from "@/features/scheduling/shifts/useShiftRoleOptions";

/** The department's active job titles, as `shift-role-options` answers them. */
const roles: ShiftRoleOptions = {
	status: "ready",
	items: [
		...SHIFT_ROLE_OPTIONS,
		{ jobTitleId: "concierge", name: "Concierge" },
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
		roles,
		groups: ["Front Desk", "Kitchen", "Service"],
		onSave: (): Promise<void> => Promise.resolve(),
		onClose: (): void => {},
	},
} satisfies Meta<typeof ShiftDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Add: Story = {};
export const Edit: Story = { args: { editing: SHIFT_FIXTURES[0] } };
export const NoRoles: Story = {
	args: { roles: { status: "ready", items: [] } },
};
export const RolesLoading: Story = { args: { roles: { status: "pending" } } };
export const RolesHidden: Story = { args: { roles: { status: "hidden" } } };
