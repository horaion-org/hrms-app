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
