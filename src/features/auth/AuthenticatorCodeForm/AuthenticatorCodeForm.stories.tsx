import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AuthenticatorCodeForm } from "@/features/auth/AuthenticatorCodeForm";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";

const meta = {
	title: "Features/Auth/AuthenticatorCodeForm",
	component: AuthenticatorCodeForm,
	decorators: [
		withMemoryRouter,
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	parameters: { layout: "centered" },
} satisfies Meta<typeof AuthenticatorCodeForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
