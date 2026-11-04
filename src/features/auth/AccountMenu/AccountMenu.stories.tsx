import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { authTestI18n } from "@/features/auth/testingI18n";

const meta = {
	title: "Features/Auth/AccountMenu",
	component: AccountMenu,
	decorators: [
		withMemoryRouter,
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	parameters: { layout: "centered" },
	args: { displayName: "Kent Chua" },
} satisfies Meta<typeof AccountMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
