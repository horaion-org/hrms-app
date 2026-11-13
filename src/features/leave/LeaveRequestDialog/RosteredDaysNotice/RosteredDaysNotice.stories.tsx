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
		// Storybook makes every on* prop an action; a set onRetry means the days could not be read.
		onRetry: undefined,
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

const shortened = [
	{
		day: "2026-06-03",
		minutes: 480,
		shiftStart: "07:00",
		shiftEnd: "15:00",
		outcome: "SHORTENED" as const,
		workedTimes: [{ start: "11:00", end: "15:00" }],
		gap: { start: "07:00", end: "11:00" },
	},
];

/** Pending morning leave, as the applicant reads it. */
export const PartDayOwn: Story = { args: { days: shortened } };

/** Pending morning leave, as the reviewer approving it reads it. */
export const PartDayReviewer: Story = {
	args: {
		days: shortened,
		name: "Alex Tan",
		confirmed: false,
		onConfirmedChange: fn(),
	},
};
