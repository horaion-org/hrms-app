import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { Button, type ButtonProps } from "./Button";

const PlaceholderIcon = (): FunctionComponent => (
	<svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
		<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
	</svg>
);

const meta = {
	title: "UI/Button",
	component: Button,
	args: {
		children: "Button",
		variant: "primary",
		size: "lg",
		disabled: false,
		leadingIcon: <PlaceholderIcon />,
		trailingIcon: <PlaceholderIcon />,
	},
	argTypes: {
		variant: {
			control: "select",
			options: ["primary", "secondary", "textlink", "hyperlink"],
		},
		size: { control: "inline-radio", options: ["lg", "sm"] },
		leadingIcon: { control: false },
		trailingIcon: { control: false },
	},
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Small: Story = { args: { size: "sm" } };

export const Textlink: Story = {
	args: { variant: "textlink", children: "Textlink" },
};

export const Hyperlink: Story = {
	args: {
		variant: "hyperlink",
		children: "Hyperlink",
		leadingIcon: undefined,
		trailingIcon: undefined,
	},
};

export const Disabled: Story = { args: { disabled: true } };

const rows: Array<{ label: string; props: ButtonProps }> = [
	{ label: "Primary, lg", props: { variant: "primary", size: "lg" } },
	{ label: "Secondary, lg", props: { variant: "secondary", size: "lg" } },
	{ label: "Primary, sm", props: { variant: "primary", size: "sm" } },
	{ label: "Secondary, sm", props: { variant: "secondary", size: "sm" } },
	{ label: "Textlink", props: { variant: "textlink", children: "Textlink" } },
	{
		label: "Hyperlink",
		props: {
			variant: "hyperlink",
			children: "Hyperlink",
			leadingIcon: undefined,
			trailingIcon: undefined,
		},
	},
];

/** Every variant in its enabled and disabled state. Hover and press to see the interactive states. */
export const Matrix: Story = {
	render: (args) => (
		<div className="grid grid-cols-[auto_auto_auto] items-center gap-x-8 gap-y-6">
			{rows.map(({ label, props }) => (
				<div key={label} className="contents">
					<span className="text-right text-brand-700">{label}</span>
					<Button {...args} {...props} />
					<Button {...args} {...props} disabled />
				</div>
			))}
		</div>
	),
};
