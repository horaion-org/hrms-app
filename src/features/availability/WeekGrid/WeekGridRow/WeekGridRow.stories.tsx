import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { byDay } from "@/features/availability/availabilityModel";
import { WEEKDAY_MORNINGS } from "@/features/availability/fixtures";
import { WeekGridRow } from "@/features/availability/WeekGrid/WeekGridRow";

const meta = {
	title: "Features/Availability/WeekGrid/WeekGridRow",
	component: WeekGridRow,
	parameters: { layout: "padded" },
	args: {
		days: byDay(WEEKDAY_MORNINGS),
		withHeading: true,
		heading: "Aisha Rahman",
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<table className="w-full table-fixed border border-neutral-400">
					<tbody>
						<Story />
					</tbody>
				</table>
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof WeekGridRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithHeading: Story = {};

export const DaysOnly: Story = { args: { withHeading: false } };
