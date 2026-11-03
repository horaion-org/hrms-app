import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AvailabilityCard } from "@/features/people/availability/AvailabilityCard";

const meta = {
	title: "Features/People/AvailabilityCard",
	component: AvailabilityCard,
	parameters: { layout: "padded" },
	args: {
		windows: [
			{ day: "MON", startTime: "09:00", endTime: "13:00" },
			{ day: "MON", startTime: "17:00", endTime: "21:00" },
			{ day: "WED", startTime: "09:00", endTime: "17:00" },
			{ day: "FRI", startTime: "22:00", endTime: "06:00" },
		],
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof AvailabilityCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoWindows: Story = { args: { windows: [] } };

export const Empty: Story = {
	args: {
		windows: [],
		emptyMessage:
			"Add the hours this person can work. Without them they can’t be rostered.",
	},
};

export const Loading: Story = { args: { windows: undefined } };

export const Failed: Story = { args: { windows: undefined, failed: true } };
