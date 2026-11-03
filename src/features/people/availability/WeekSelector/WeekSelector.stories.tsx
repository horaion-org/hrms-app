import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { WeekSelector } from "@/features/people/availability/WeekSelector";

const meta = {
	title: "Features/People/WeekSelector",
	component: WeekSelector,
	parameters: { layout: "padded" },
	args: {
		scope: { kind: "pattern" },
		overrideWeeks: ["2026-11-09"],
		today: new Date("2026-11-04T12:00:00"),
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

export const DefaultPattern: Story = {};

export const CustomWeek: Story = {
	args: { scope: { kind: "week", weekStartMonday: "2026-11-09" } },
};

export const ReadOnly: Story = { args: { disabled: true } };
