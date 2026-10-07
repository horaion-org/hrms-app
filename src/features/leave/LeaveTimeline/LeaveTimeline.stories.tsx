import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { FIXTURE_RANGE, LEAVE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveTimeline } from "@/features/leave/LeaveTimeline";

const meta = {
	title: "Features/Leave/LeaveTimeline",
	component: LeaveTimeline,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		requests: LEAVE_FIXTURES,
		range: FIXTURE_RANGE,
		onRangeChange: (): void => {},
		onOpen: (): void => {},
	},
} satisfies Meta<typeof LeaveTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { requests: [] } };
