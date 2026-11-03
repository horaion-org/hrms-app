import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { WeekSelector } from "@/features/availability/WeekSelector";

const meta = {
	title: "Features/Availability/WeekSelector",
	component: WeekSelector,
	parameters: { layout: "padded" },
	args: {
		value: "2026-11-02",
		today: new Date("2026-11-04T12:00:00"),
		className: "w-48",
		onChange: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof WeekSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThisWeek: Story = {};

export const LaterWeek: Story = { args: { value: "2026-11-16" } };

export const PastWeekFromTheUrl: Story = { args: { value: "2026-10-26" } };
