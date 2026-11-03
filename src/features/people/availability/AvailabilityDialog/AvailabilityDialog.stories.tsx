import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AvailabilityDialog } from "@/features/people/availability/AvailabilityDialog";

const meta = {
	title: "Features/People/AvailabilityDialog",
	component: AvailabilityDialog,
	args: {
		name: "Kent Chua",
		windows: [
			{ day: "MON", startTime: "09:00", endTime: "13:00" },
			{ day: "WED", startTime: "09:00", endTime: "13:00" },
			{ day: "FRI", startTime: "22:00", endTime: "06:00" },
		],
		onSubmit: fn(() => Promise.resolve()),
		onClose: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof AvailabilityDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { windows: [] } };
