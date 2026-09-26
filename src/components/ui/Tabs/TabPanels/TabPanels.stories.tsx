import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";

const meta = {
	title: "UI/Tabs/TabPanels",
	component: TabPanels,
	args: { className: "pt-6" },
	render: (args): NonNullable<FunctionComponent> => (
		<Tabs>
			<TabList aria-label="Profile">
				<Tab>Overview</Tab>
				<Tab>Employment</Tab>
			</TabList>
			<TabPanels {...args}>
				<TabPanel>Overview content</TabPanel>
				<TabPanel>Employment content</TabPanel>
			</TabPanels>
		</Tabs>
	),
} satisfies Meta<typeof TabPanels>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
