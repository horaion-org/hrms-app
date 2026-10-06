import type { ReactElement } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContactCell } from "@/features/people/ContactCell";

const meta = {
	title: "Features/People/ContactCell",
	component: ContactCell,
	parameters: { layout: "padded" },
	args: { phone: "+6591234821", email: "moses.lee@company.com" },
	decorators: [
		(Story): ReactElement => (
			<div className="w-60 text-xs">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ContactCell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Without a phone number only the email is shown. */
export const WithoutPhone: Story = { args: { phone: null } };
