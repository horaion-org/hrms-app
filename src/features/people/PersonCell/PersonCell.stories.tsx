import type { ReactElement } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PersonCell } from "@/features/people/PersonCell";

const meta = {
	title: "Features/People/PersonCell",
	component: PersonCell,
	parameters: { layout: "padded" },
	args: { name: "Moses Lee", employeeCode: "EMP-10482" },
	decorators: [
		(Story): ReactElement => (
			<div className="w-60">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PersonCell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A long name is cut short rather than widening the column. */
export const LongName: Story = {
	args: { name: "Aisha binte Abdul Rahman Mohamed Salleh" },
};
