import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { FormRow } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NotesIcon, PhoneIcon, UserIcon } from "@/components/ui/Icon";

const meta = {
	title: "UI/Card",
	component: Card,
	args: {
		title: "Contact information",
		icon: PhoneIcon,
		children: (
			<p className="text-sm text-neutral-700">Card content goes here.</p>
		),
	},
	argTypes: {
		icon: { control: false },
		action: { control: false },
		children: { control: false },
	},
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One card at the design's half-width column. */
const framed: Story["render"] = (args) => (
	<div className="w-132 max-w-full">
		<Card {...args} />
	</div>
);

export const Default: Story = { render: framed };

export const WithAction: Story = {
	args: {
		title: "Notes (4)",
		icon: NotesIcon,
		action: <Button variant="hyperlink">Add note</Button>,
	},
	render: framed,
};

export const LongTitle: Story = {
	args: {
		title:
			"Department and system role information for people who move between branches",
		action: <Button variant="hyperlink">Add skill</Button>,
	},
	render: framed,
};

/** The Add employee form: stacked rows of label and control. */
export const WithFormRows: Story = {
	args: {
		title: "Personal information",
		icon: UserIcon,
		children: (
			<div className="flex flex-col gap-4">
				<FormRow htmlFor="card-full-name" label="Full name">
					<Input
						className="w-full"
						id="card-full-name"
						placeholder="Enter full name"
					/>
				</FormRow>
				<FormRow htmlFor="card-employee-id" label="Employee ID">
					<Input
						className="w-full"
						id="card-employee-id"
						placeholder="Enter employee ID"
					/>
				</FormRow>
			</div>
		),
	},
	render: framed,
};

const readOnlyRows: Array<[string, string]> = [
	["Full name", "Kent Chua"],
	["Date of birth", "22 Mar 1987"],
	["Employee ID", "EMP-10392"],
];

/** The person detail page: label and value pairs. */
export const WithReadOnlyValues: Story = {
	args: {
		title: "Personal information",
		icon: UserIcon,
		children: (
			<dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-base">
				{readOnlyRows.map(([term, value]): NonNullable<FunctionComponent> => (
					<div key={term} className="contents">
						<dt className="text-neutral-700">{term}</dt>
						<dd className="text-neutral-900">{value}</dd>
					</div>
				))}
			</dl>
		),
	},
	render: framed,
};
