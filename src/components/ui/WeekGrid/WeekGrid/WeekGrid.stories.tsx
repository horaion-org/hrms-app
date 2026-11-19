import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { WEEKDAYS } from "@/common/weekdays";
import { Chip } from "@/components/ui/Chip";
import { WeekGrid, type WeekGridDay } from "@/components/ui/WeekGrid";
import { authTestI18n } from "@/features/auth/testingI18n";

/** A week with one chip on each weekday and nothing at the weekend. */
const weekdaysWith = (label: string): Array<WeekGridDay> =>
	WEEKDAYS.map((day, index) => ({
		day,
		cell: index < 5 ? <Chip label={label} /> : null,
	}));

const meta = {
	title: "UI/WeekGrid/WeekGrid",
	component: WeekGrid,
	parameters: { layout: "padded" },
	args: {
		label: "Your week",
		weekStartMonday: "2026-11-09",
		rows: [{ id: "me", days: weekdaysWith("09:00–13:00") }],
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

/** A heading per row, as a team view draws a member. */
export const WithHeadings: Story = {
	args: {
		label: "Team shift preferences",
		headingLabel: "Member",
		rows: [
			{ id: "a", heading: "Aisha Rahman", days: weekdaysWith("Morning") },
			{ id: "f", heading: "Faris Ahmad", days: weekdaysWith("Late") },
		],
	},
};

export const Empty: Story = {
	args: {
		headingLabel: "Member",
		rows: [],
		emptyState: "No members here.",
	},
};
