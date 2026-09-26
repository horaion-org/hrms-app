import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";

const meta = {
	title: "UI/Tabs/TabPanel",
	component: TabPanel,
	args: { children: "Overview content", className: "mt-6" },
	render: (args): NonNullable<FunctionComponent> => (
		<Tabs>
			<TabList aria-label="Profile">
				<Tab>Overview</Tab>
				<Tab>Employment</Tab>
			</TabList>
			<TabPanels>
				<TabPanel {...args} />
				<TabPanel>Employment content</TabPanel>
			</TabPanels>
		</Tabs>
	),
} satisfies Meta<typeof TabPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
