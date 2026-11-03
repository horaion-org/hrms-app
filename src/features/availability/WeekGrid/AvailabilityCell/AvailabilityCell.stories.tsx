import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AvailabilityCell } from "@/features/availability/WeekGrid/AvailabilityCell";

const meta = {
	title: "Features/Availability/WeekGrid/AvailabilityCell",
	component: AvailabilityCell,
	parameters: { layout: "centered" },
	args: {
		windows: [
			{ startTime: "09:00", endTime: "13:00" },
			{ startTime: "18:00", endTime: "22:00" },
		],
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="w-28">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof AvailabilityCell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TwoWindows: Story = {};

export const NotAvailable: Story = { args: { windows: [] } };
