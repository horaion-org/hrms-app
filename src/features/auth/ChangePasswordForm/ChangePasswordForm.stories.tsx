import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";
import { authTestI18n } from "@/features/auth/testingI18n";

const meta = {
	title: "Features/Auth/ChangePasswordForm",
	component: ChangePasswordForm,
	decorators: [
		withMemoryRouter,
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	parameters: { layout: "centered" },
} satisfies Meta<typeof ChangePasswordForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
