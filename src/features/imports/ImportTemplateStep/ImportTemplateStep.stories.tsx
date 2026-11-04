import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ImportTemplateStep } from "./ImportTemplateStep";

const meta = {
	title: "Features/Imports/ImportTemplateStep",
	component: ImportTemplateStep,
	parameters: { layout: "padded" },
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		textPrefix: "people.importPage",
		downloading: false,
		downloadFailed: false,
		onDownload: fn(),
		onNext: fn(),
	},
} satisfies Meta<typeof ImportTemplateStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const People: Story = {};

export const Organisation: Story = {
	args: { textPrefix: "organisation.import" },
};

export const Downloading: Story = { args: { downloading: true } };

export const DownloadFailed: Story = { args: { downloadFailed: true } };
