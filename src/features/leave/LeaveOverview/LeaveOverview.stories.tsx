import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LeaveOverview } from "@/features/leave/LeaveOverview";
const meta = {
	title: "Features/Leave/LeaveOverview",
	component: LeaveOverview,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="mx-auto max-w-270 p-4">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof LeaveOverview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
