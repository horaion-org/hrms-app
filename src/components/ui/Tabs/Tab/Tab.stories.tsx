import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";

const meta = {
	title: "UI/Tabs/Tab",
	component: Tab,
	args: { children: "Employment" },
	render: (args): NonNullable<FunctionComponent> => (
		<Tabs>
			<TabList aria-label="Profile">
				<Tab>Overview</Tab>
				<Tab {...args} />
			</TabList>
			<TabPanels className="pt-6">
				<TabPanel>Overview content</TabPanel>
				<TabPanel>Employment content</TabPanel>
			</TabPanels>
		</Tabs>
	),
} satisfies Meta<typeof Tab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inactive: Story = {};
/** Like SidebarItem's Hover story, force only the inactive hover colour. */
export const Hover: Story = {
	args: { className: "not-data-disabled:not-data-selected:text-ink-blue-700" },
};

export const Disabled: Story = { args: { disabled: true } };

/** In horizontal Tabs the description is the accessible description only. */
export const WithDescription: Story = {
	args: { description: "Contract, role and reporting line" },
};

const renderVertical = (
	args: Story["args"]
): NonNullable<FunctionComponent> => (
	<Tabs className="w-63" orientation="vertical">
		<TabList aria-label="Settings">
			<Tab description="Core workspace preferences.">General</Tab>
			<Tab {...args} />
		</TabList>
		<TabPanels className="pt-6">
			<TabPanel>General content</TabPanel>
			<TabPanel>Notifications content</TabPanel>
		</TabPanels>
	</Tabs>
);

export const Vertical: Story = {
	args: {
		children: "Notifications",
		description: "Control what you are notified about and how.",
	},
	render: renderVertical,
};

export const VerticalHover: Story = {
	args: {
		...Vertical.args,
		className: "not-data-disabled:not-data-selected:bg-neutral-50",
	},
	render: renderVertical,
};

export const VerticalDisabled: Story = {
	args: { ...Vertical.args, disabled: true },
	render: renderVertical,
};
