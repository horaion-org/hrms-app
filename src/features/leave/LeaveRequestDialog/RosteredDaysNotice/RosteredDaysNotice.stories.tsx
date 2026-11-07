import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { RosteredDaysNotice } from "./RosteredDaysNotice";

const meta = {
	title: "Features/Leave/LeaveRequestDialog/RosteredDaysNotice",
	component: RosteredDaysNotice,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="max-w-150 p-6">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
	args: {
		days: [
			{ day: "2026-06-03", minutes: 480 },
			{ day: "2026-06-04", minutes: 480 },
		],
	},
} satisfies Meta<typeof RosteredDaysNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The applicant is told; nothing to confirm. */
export const OwnDays: Story = {};

/** A reviewer must confirm taking the person off the shifts. */
export const Reviewer: Story = {
	args: { name: "Alex Tan", confirmed: false, onConfirmedChange: fn() },
};

/** The days could not be read, so nothing can be confirmed until they are. */
export const CouldNotRead: Story = {
	args: { days: [], name: "Alex Tan", onRetry: fn() },
};
