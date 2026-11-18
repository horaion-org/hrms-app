import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ApplyForSomeoneDialog } from "@/features/people/ApplyForSomeoneDialog";

const meta = {
	title: "Features/People/ApplyForSomeoneDialog",
	component: ApplyForSomeoneDialog,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		title: "Apply shift preferences",
		people: [
			{ membershipId: "m-1", displayName: "Alex Example" },
			{ membershipId: "m-2", displayName: "Bea Kitchen" },
		],
		maySetFor: (): boolean => true,
		onChoose: (): void => {},
		onClose: (): void => {},
	},
} satisfies Meta<typeof ApplyForSomeoneDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Loading: Story = { args: { people: undefined } };
export const NoOneToApplyFor: Story = { args: { maySetFor: () => false } };
export const Failed: Story = {
	args: {
		problem: "We couldn’t load the team’s shift preferences. Try again.",
	},
};
