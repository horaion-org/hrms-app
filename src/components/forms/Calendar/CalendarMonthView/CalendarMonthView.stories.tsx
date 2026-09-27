import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { CalendarMonthView } from "@/components/forms/Calendar/CalendarMonthView";

const meta = {
	title: "Forms/Calendar/CalendarMonthView",
	component: CalendarMonthView,
	args: {
		"aria-label": "Leave date",
		month: "2026-06-01",
		selectedDate: "2026-06-10",
		language: "en",
		onNavigate: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<div className="w-63">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof CalendarMonthView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Spanish: Story = { args: { language: "es" } };
