import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ListProblem } from "@/features/organisation/ListProblem";

const meta = {
	title: "Features/Organisation/ListProblem",
	component: ListProblem,
	parameters: { layout: "padded" },
	args: {
		problem: {
			message: authTestI18n.t("organisation.list.stillUpdating"),
			alert: true,
			retry: fn(),
		},
	},
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof ListProblem>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Access is still being updated after a recent change. */
export const StillUpdating: Story = {};

/** The person's grants don't reach the list: nothing to try again. */
export const Forbidden: Story = {
	args: {
		problem: {
			message: authTestI18n.t("organisation.list.forbidden"),
			alert: false,
		},
	},
};
