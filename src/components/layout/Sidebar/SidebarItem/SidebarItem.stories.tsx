import { HomeIcon } from "@heroicons/react/24/outline";
import { HomeIcon as HomeFilledIcon } from "@heroicons/react/24/solid";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { SidebarItem } from "@/components/layout/Sidebar";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";

const meta = {
	title: "Layout/Sidebar/SidebarItem",
	component: SidebarItem,
	args: {
		to: "/",
		label: "Dashboard",
		icon: HomeIcon,
		activeIcon: HomeFilledIcon,
		activeOptions: { exact: true },
	},
	argTypes: {
		icon: { control: false },
		activeIcon: { control: false },
	},
	parameters: { initialEntry: "/example" },
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<div className="bg-ink-blue-900 p-7">
				<Story />
			</div>
		),
		withMemoryRouter,
	],
} satisfies Meta<typeof SidebarItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Force only the inactive hover fill; clicking still shows the active state. */
export const Hover: Story = {
	args: { className: "not-data-[status=active]:bg-ink-blue-800" },
};

export const Active: Story = { parameters: { initialEntry: "/" } };
