import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { byDay } from "@/features/availability/availabilityModel";
import {
	FIXTURE_WEEK,
	WEEKDAY_MORNINGS,
} from "@/features/availability/fixtures";
import { WeekGrid } from "@/features/availability/WeekGrid";

const meta = {
	title: "Features/Availability/WeekGrid/WeekGrid",
	component: WeekGrid,
	parameters: { layout: "padded" },
	args: {
		label: "Your week",
		weekStartMonday: FIXTURE_WEEK,
		rows: [{ id: "me", days: byDay(WEEKDAY_MORNINGS) }],
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof WeekGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One row and no heading: a person's own week. */
export const OneWeek: Story = {};

/** A heading per row, as the team view draws a member. */
export const WithHeadings: Story = {
	args: {
		label: "Team availability",
		headingLabel: "Member",
		rows: [
			{ id: "a", heading: "Aisha Rahman", days: byDay(WEEKDAY_MORNINGS) },
			{ id: "f", heading: "Faris Ahmad", days: byDay([]) },
		],
	},
};

export const Empty: Story = {
	args: {
		headingLabel: "Member",
		rows: [],
		emptyState: "No part-time members here.",
	},
};
