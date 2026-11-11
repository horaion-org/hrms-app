import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { WeekChoiceSummary } from "@/features/scheduling/WeekChoiceSummary";

const meta = {
	title: "Features/Scheduling/WeekChoiceSummary",
	component: WeekChoiceSummary,
	parameters: { layout: "padded" },
	args: {
		line: "Uses all 3 shifts and 5 constraints of Kitchen.",
		actionLabel: "Choose for this week",
		onAction: fn(),
		editShifts: {
			to: "/scheduling",
			search: { view: "shifts", branch: "b-1", department: "d-1" },
		},
		editConstraints: {
			to: "/scheduling",
			search: { view: "constraints", branch: "b-1", department: "d-1" },
		},
	},
	decorators: [
		withMemoryRouter,
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof WeekChoiceSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Everything: Story = {};

export const SomeLeftOut: Story = {
	args: { line: "Uses 2 of 3 shifts and 4 of 5 constraints of Kitchen." },
};

export const Generated: Story = {
	args: {
		line: "Generated with 2 shifts and 4 constraints.",
		actionLabel: "View",
	},
};
