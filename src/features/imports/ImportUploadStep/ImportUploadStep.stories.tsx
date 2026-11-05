import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { ImportUploadStep } from "./ImportUploadStep";

const meta = {
	title: "Features/Imports/ImportUploadStep",
	component: ImportUploadStep,
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
		accept: [".xlsx", ".csv"],
		checking: false,
		helpItems: ["Name: required.", "Email: required, one per person."],
		onFileChange: fn(),
		onBack: fn(),
	},
} satisfies Meta<typeof ImportUploadStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const People: Story = {};

export const Checking: Story = { args: { checking: true } };

export const Refused: Story = {
	args: { refusalText: "Upload an .xlsx or .csv file." },
};

export const Organisation: Story = {
	args: {
		textPrefix: "organisation.import",
		accept: [".xlsx"],
		helpItems: ["Branches: one row per branch."],
	},
};
