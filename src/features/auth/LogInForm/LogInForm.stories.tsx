import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LogInForm } from "@/features/auth/LogInForm";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";

const meta = {
	title: "Features/Auth/LogInForm",
	component: LogInForm,
	decorators: [
		withMemoryRouter,
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	parameters: { layout: "centered" },
} satisfies Meta<typeof LogInForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
