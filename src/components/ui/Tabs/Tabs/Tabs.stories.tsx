import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Input } from "@/components/forms/Input";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";

const labels = [
	"Overview",
	"Personal details",
	"Employment",
	"Compensation",
	"Leave",
	"Attendance",
	"Documents",
	"Activity",
];

const meta = {
	title: "UI/Tabs/Tabs",
	component: Tabs,
	parameters: { layout: "padded" },
	args: { defaultIndex: 0 },
	render: (args): NonNullable<FunctionComponent> => (
		<Tabs {...args}>
			<TabList aria-label="Person profile">
				{labels.map((label) => (
					<Tab key={label}>{label}</Tab>
				))}
			</TabList>
			<TabPanels className="pt-6">
				{labels.map((label) => (
					<TabPanel key={label}>{label} content</TabPanel>
				))}
			</TabPanels>
		</Tabs>
	),
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EightTabRow: Story = {};
export const StartingIndex: Story = { args: { defaultIndex: 2 } };

export const Counts: Story = {
	render: (args): NonNullable<FunctionComponent> => (
		<Tabs {...args}>
			<TabList aria-label="Leave requests">
				<Tab count={3}>Pending</Tab>
				<Tab count={150}>Approved</Tab>
				<Tab disabled count={7}>
					Archived
				</Tab>
				<Tab count={0}>Rejected</Tab>
				<Tab>Overview</Tab>
			</TabList>
			<TabPanels className="pt-6">
				<TabPanel>Pending requests</TabPanel>
				<TabPanel>Approved requests</TabPanel>
				<TabPanel>Archived requests</TabPanel>
				<TabPanel>Rejected requests</TabPanel>
				<TabPanel>Leave overview</TabPanel>
			</TabPanels>
		</Tabs>
	),
};

/** Use horizontal wheel/trackpad, touch, or Home/End and arrow keys. */
export const NarrowOverflow: Story = {
	args: { className: "w-80 max-w-full", defaultIndex: 7 },
	render: (args): NonNullable<FunctionComponent> => (
		<Tabs {...args}>
			<TabList aria-label="Person profile">
				{labels.map((label) => (
					<Tab key={label}>
						{label === "Personal details"
							? "Personal details, emergency contacts and communication preferences"
							: label}
					</Tab>
				))}
			</TabList>
			<TabPanels className="pt-6">
				{labels.map((label) => (
					<TabPanel key={label}>{label} content</TabPanel>
				))}
			</TabPanels>
		</Tabs>
	),
};

export const Controlled: Story = {
	render: function Render(args): NonNullable<FunctionComponent> {
		const [selectedIndex, setSelectedIndex] = useState(0);
		return (
			<>
				<Input
					readOnly
					aria-label="Selected tab index (zero-based)"
					className="mb-6 max-w-xs"
					value={`Selected index: ${selectedIndex}`}
				/>
				<Tabs
					{...args}
					selectedIndex={selectedIndex}
					onChange={setSelectedIndex}
				>
					<TabList aria-label="Person profile">
						{labels.map((label) => (
							<Tab key={label}>{label}</Tab>
						))}
					</TabList>
					<TabPanels className="pt-6">
						{labels.map((label) => (
							<TabPanel key={label}>{label} content</TabPanel>
						))}
					</TabPanels>
				</Tabs>
			</>
		);
	},
};
