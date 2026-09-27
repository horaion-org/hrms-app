import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CompanyPicker } from "@/features/auth/components/CompanyPicker";

const meta = {
	title: "Features/Auth/Components/CompanyPicker",
	component: CompanyPicker,
	parameters: { layout: "fullscreen" },
	args: {
		companies: [
			{ companyId: "c-1", companyName: "Acme Logistics", subdomain: "acme" },
			{
				companyId: "c-2",
				companyName: "Borealis Foods",
				subdomain: "borealis",
			},
		],
		onChoose: fn(),
		onSignOut: fn(),
	},
} satisfies Meta<typeof CompanyPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Several: Story = {};

export const NoCompany: Story = {
	args: { companies: [] },
};
