import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { CalendarDayView } from "@/components/forms/Calendar/CalendarDayView";

const meta = {
	title: "Forms/Calendar/CalendarDayView",
	component: CalendarDayView,
	args: {
		"aria-label": "Leave date",
		month: "2026-06-01",
		today: "2026-06-15",
		selectedDate: "2026-06-10",
		language: "en",
		onSelect: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<div className="w-63">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof CalendarDayView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
