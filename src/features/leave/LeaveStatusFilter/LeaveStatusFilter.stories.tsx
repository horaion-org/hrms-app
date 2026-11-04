import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LeaveStatusFilter } from "@/features/leave/LeaveStatusFilter";

const meta = {
	title: "Features/Leave/LeaveStatusFilter",
	component: LeaveStatusFilter,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: { onChange: (): void => {} },
} satisfies Meta<typeof LeaveStatusFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryStatus: Story = {};
export const Pending: Story = { args: { status: "PENDING" } };
