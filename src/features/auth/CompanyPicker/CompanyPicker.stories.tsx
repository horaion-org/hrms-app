import type { ReactElement } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { I18nextProvider } from "react-i18next";
import { CompanyPicker } from "@/features/auth/CompanyPicker";
import { authTestI18n } from "@/features/auth/testingI18n";

const meta = {
	title: "Features/Auth/CompanyPicker",
	component: CompanyPicker,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	parameters: { layout: "centered" },
	args: {
		companies: [
			{ companyId: "acme", companyName: "Acme", subdomain: "acme" },
			{ companyId: "north", companyName: "North Company", subdomain: "north" },
		],
		onChoose: (): void => {},
	},
} satisfies Meta<typeof CompanyPicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const LongNames: Story = {
	args: {
		companies: [
			{
				companyId: "long",
				companyName:
					"A company with a long name that should wrap on a narrow screen",
				subdomain: "long-company-address",
			},
		],
	},
};
