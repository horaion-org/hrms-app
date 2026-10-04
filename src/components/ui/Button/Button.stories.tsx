import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import {
	Button,
	buttonSizes,
	buttonVariants,
	type ButtonProps,
} from "@/components/ui/Button";
import { ChevronLeftIcon, SettingsIcon } from "@/components/ui/Icon";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";

const PlaceholderIcon = (): FunctionComponent => (
	<svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
		<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
	</svg>
);

/** The stories render the native button; `AsLink` covers the router link. */
type ButtonElementProps = Extract<ButtonProps, { to?: never }>;
const ButtonElement: (props: ButtonElementProps) => FunctionComponent = Button;

const meta = {
	title: "UI/Button",
	component: ButtonElement,
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
			options: [...buttonVariants, "icon"],
		},
		size: { control: "inline-radio", options: buttonSizes },
		leadingIcon: { control: false },
		trailingIcon: { control: false },
	},
} satisfies Meta<typeof ButtonElement>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const PrimaryLoading: Story = { args: { loading: true } };

export const SecondaryLoading: Story = {
	args: { variant: "secondary", loading: true },
};

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

export const Icon: Story = {
	args: {
		variant: "icon",
		children: <ChevronLeftIcon />,
		"aria-label": "Previous month",
		size: undefined,
		leadingIcon: undefined,
		trailingIcon: undefined,
	},
};

export const IconDisabled: Story = {
	args: { ...Icon.args, disabled: true },
};

/** Given `to`, the Button renders as a router link with the same styling. */
export const AsLink: Story = {
	decorators: [withMemoryRouter],
	render: () => (
		<div className="flex items-center gap-6">
			<Button to="/register">Register</Button>
			<Button to="/register" variant="textlink">
				Register
			</Button>
			<Button aria-label="Settings" to="/register" variant="icon">
				<SettingsIcon />
			</Button>
		</div>
	),
};

const rows: Array<{
	label: string;
	props: Exclude<ButtonElementProps, { variant: "icon" }>;
}> = [
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
					<span className="text-right text-ink-blue-700">{label}</span>
					<Button
						{...args}
						{...props}
						loading={undefined}
						variant={props.variant}
					/>
					<Button
						{...args}
						{...props}
						disabled
						loading={undefined}
						variant={props.variant}
					/>
				</div>
			))}
		</div>
	),
};
