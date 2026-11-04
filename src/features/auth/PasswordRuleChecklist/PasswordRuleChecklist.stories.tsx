import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PasswordRuleChecklist } from "@/features/auth/PasswordRuleChecklist";
import { authTestI18n } from "@/features/auth/testingI18n";

const meta = {
	title: "Features/Auth/PasswordRuleChecklist",
	component: PasswordRuleChecklist,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	parameters: { layout: "centered" },
	args: { id: "rules", password: "", currentPassword: "" },
} satisfies Meta<typeof PasswordRuleChecklist>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = {};
export const InProgress: Story = {
	args: { password: "example1", currentPassword: "Current123!" },
};
export const AllMet: Story = {
	args: { password: "Example123!", currentPassword: "Current123!" },
};
