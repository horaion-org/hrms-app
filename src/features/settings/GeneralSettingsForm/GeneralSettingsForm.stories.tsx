import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { GeneralSettingsForm } from "@/features/settings/GeneralSettingsForm";
import { DEFAULT_PREFERENCES } from "@/features/settings/options";

const meta = {
	title: "Features/Settings/GeneralSettingsForm",
	component: GeneralSettingsForm,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	parameters: { layout: "padded" },
	args: {
		className: "max-w-3xl",
		defaultValues: { ...DEFAULT_PREFERENCES, workspaceName: "Horaion" },
	},
} satisfies Meta<typeof GeneralSettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Focus the empty name, then leave it, to see the required message. */
export const MissingWorkspaceName: Story = {
	args: {
		defaultValues: { ...DEFAULT_PREFERENCES, workspaceName: "" },
	},
};
