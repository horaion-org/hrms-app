import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { WeekNavigator } from "@/components/ui/WeekNavigator";

const meta = {
	title: "UI/WeekNavigator",
	component: WeekNavigator,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		week: "2026-11-09",
		currentWeek: "2026-11-09",
		onWeekChange: (): void => {},
	},
	render: function Example(args): ReactElement {
		const [week, setWeek] = useState(args.week);
		return <WeekNavigator {...args} week={week} onWeekChange={setWeek} />;
	},
} satisfies Meta<typeof WeekNavigator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AnyWeek: Story = {};
export const FromThisWeekOn: Story = { args: { earliestWeek: "2026-11-09" } };
