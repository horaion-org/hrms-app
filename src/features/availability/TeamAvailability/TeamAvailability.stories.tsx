import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	FIXTURE_WEEK,
	MEMBER_WEEK_FIXTURES,
} from "@/features/availability/fixtures";
import { TeamAvailability } from "@/features/availability/TeamAvailability";

const meta = {
	title: "Features/Availability/TeamAvailability",
	component: TeamAvailability,
	parameters: { layout: "padded" },
	args: {
		members: MEMBER_WEEK_FIXTURES,
		weekStartMonday: FIXTURE_WEEK,
		canEdit: (): boolean => true,
		onEdit: fn(),
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof TeamAvailability>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Editable: Story = {};

export const ReadOnly: Story = { args: { canEdit: (): boolean => false } };

export const NoPartTimers: Story = { args: { members: [] } };
