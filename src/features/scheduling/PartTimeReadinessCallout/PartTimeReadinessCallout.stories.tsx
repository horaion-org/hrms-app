import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PartTimeReadinessCallout } from "@/features/scheduling/PartTimeReadinessCallout";

const meta = {
	title: "Features/Scheduling/PartTimeReadinessCallout",
	component: PartTimeReadinessCallout,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-xl",
		members: [
			{ membershipId: "m-1", memberProfileId: "p-1", displayName: "Kent Chua" },
			{
				membershipId: "m-2",
				memberProfileId: "p-2",
				displayName: "Priya Nair",
			},
		],
	},
	decorators: [
		withMemoryRouter,
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof PartTimeReadinessCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TwoMembers: Story = {};

export const OneMember: Story = {
	args: {
		members: [
			{ membershipId: "m-1", memberProfileId: "p-1", displayName: "Kent Chua" },
		],
	},
};
