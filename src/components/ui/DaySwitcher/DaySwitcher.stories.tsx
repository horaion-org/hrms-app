import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { DaySwitcher } from "@/components/ui/DaySwitcher";

const WEEK = [
	"2026-11-09",
	"2026-11-10",
	"2026-11-11",
	"2026-11-12",
	"2026-11-13",
	"2026-11-14",
	"2026-11-15",
];

const meta = {
	title: "UI/DaySwitcher",
	component: DaySwitcher,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	// Shown below `md` only: the stories open at a phone's width.
	parameters: { viewport: { defaultViewport: "mobile1" } },
	args: { days: WEEK, day: "2026-11-11", onDayChange: (): void => {} },
	render: function Example(args): ReactElement {
		const [day, setDay] = useState(args.day);
		return <DaySwitcher {...args} day={day} onDayChange={setDay} />;
	},
} satisfies Meta<typeof DaySwitcher>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Week: Story = {};
/** More days than seven, such as a leave timeline's window: one row that scrolls, the chosen day in view. */
export const LongerWindow: Story = {
	args: {
		days: [...WEEK, "2026-11-16", "2026-11-17", "2026-11-18"],
		day: "2026-11-17",
	},
};
