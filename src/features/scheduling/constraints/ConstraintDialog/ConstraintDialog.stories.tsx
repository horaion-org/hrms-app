import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ConstraintDialog } from "@/features/scheduling/constraints/ConstraintDialog";
import {
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS,
} from "@/features/scheduling/constraints/fixtures";

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintDialog",
	component: ConstraintDialog,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		options: { status: "ready", options: CONSTRAINT_OPTIONS },
		onSave: (): Promise<void> => Promise.resolve(),
		onClose: (): void => {},
	},
} satisfies Meta<typeof ConstraintDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Add: Story = {};
export const EditShiftStaffing: Story = {
	args: { editing: CONSTRAINT_FIXTURES[2] },
};
export const EditStandIns: Story = {
	args: { editing: CONSTRAINT_FIXTURES[1] },
};
export const EditWithoutRequirement: Story = {
	args: { editing: CONSTRAINT_FIXTURES[5] },
};
export const OptionsLoading: Story = {
	args: { options: { status: "pending" } },
};
export const OptionsHidden: Story = { args: { options: { status: "hidden" } } };
