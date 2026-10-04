import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";

const meta = {
	title: "UI/Tabs/TabList",
	component: TabList,
	args: { "aria-label": "Profile" },
	render: (args): NonNullable<FunctionComponent> => (
		<Tabs>
			<TabList {...args}>
				<Tab>Overview</Tab>
				<Tab>Employment</Tab>
			</TabList>
			<TabPanels className="pt-6">
				<TabPanel>Overview content</TabPanel>
				<TabPanel>Employment content</TabPanel>
			</TabPanels>
		</Tabs>
	),
} satisfies Meta<typeof TabList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Vertical: Story = {
	args: { "aria-label": "Settings", className: "w-63" },
	render: (args): NonNullable<FunctionComponent> => (
		<Tabs className="flex gap-6" orientation="vertical">
			<TabList {...args}>
				<Tab description="Core workspace preferences.">General</Tab>
				<Tab description="Control what you are notified about and how.">
					Notifications
				</Tab>
			</TabList>
			<TabPanels>
				<TabPanel>General content</TabPanel>
				<TabPanel>Notifications content</TabPanel>
			</TabPanels>
		</Tabs>
	),
};
