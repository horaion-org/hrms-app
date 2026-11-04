import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { FIXTURE_RANGE } from "@/features/leave/fixtures";
import { LeaveRangeNavigator } from "@/features/leave/LeaveRangeNavigator";

const meta = {
	title: "Features/Leave/LeaveRangeNavigator",
	component: LeaveRangeNavigator,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: { range: FIXTURE_RANGE, onRangeChange: (): void => {} },
} satisfies Meta<typeof LeaveRangeNavigator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
