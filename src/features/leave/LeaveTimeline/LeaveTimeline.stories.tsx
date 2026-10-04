import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { sampleRequests } from "@/features/leave/sampleData";
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
	args: { requests: sampleRequests, onOpen: (): void => {} },
} satisfies Meta<typeof LeaveTimeline>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { requests: [] } };
