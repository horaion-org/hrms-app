import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PublishedWeekCallout } from "@/features/scheduling/publishedWeek/PublishedWeekCallout";

const meta = {
	title: "Features/Scheduling/PublishedWeekCallout",
	component: PublishedWeekCallout,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-xl",
		publishedScheduleId: "s-published",
		stage: "setup",
	},
	decorators: [
		withMemoryRouter,
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof PublishedWeekCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

/** While the week is picked: another week can still be chosen. */
export const WhilePickingTheWeek: Story = {};

/** On the Generate step and the roster page: this schedule can't go further. */
export const Blocked: Story = { args: { stage: "blocked" } };
