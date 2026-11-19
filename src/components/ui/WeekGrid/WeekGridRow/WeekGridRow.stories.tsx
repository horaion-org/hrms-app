import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { WEEKDAYS } from "@/common/weekdays";
import { Chip } from "@/components/ui/Chip";
import { WeekGridRow } from "@/components/ui/WeekGrid/WeekGridRow";

const meta = {
	title: "UI/WeekGrid/WeekGridRow",
	component: WeekGridRow,
	parameters: { layout: "padded" },
	args: {
		days: WEEKDAYS.map((day) => ({
			day,
			cell: <Chip label="09:00–13:00" />,
		})),
		withHeading: true,
		heading: "Aisha Rahman",
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<table className="w-full table-fixed border border-neutral-400">
				<tbody>
					<Story />
				</tbody>
			</table>
		),
	],
} satisfies Meta<typeof WeekGridRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithHeading: Story = {};

export const DaysOnly: Story = { args: { withHeading: false } };
