import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar, SidebarItem } from "@/components/layout/Sidebar";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardFilledIcon, DashboardIcon } from "@/components/ui/Icon";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";

const meta = {
	title: "Layout/AppShell",
	component: AppShell,
	parameters: { layout: "fullscreen", initialEntry: "/" },
	decorators: [withMemoryRouter],
	args: {
		sidebar: (
			<Sidebar className="min-h-0 w-full sm:min-h-dvh sm:w-70">
				<SidebarItem
					activeIcon={DashboardFilledIcon}
					activeOptions={{ exact: true }}
					icon={DashboardIcon}
					label="Dashboard"
					to="/"
				/>
			</Sidebar>
		),
		header: (
			<AppHeader actions={<Avatar name="John Doe" />} title="Welcome, John." />
		),
		children: (
			<h1 className="text-4xl font-medium text-neutral-900">Dashboard</h1>
		),
	},
	argTypes: {
		sidebar: { control: false },
		header: { control: false },
		children: { control: false },
	},
} satisfies Meta<typeof AppShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutHeader: Story = { args: { header: undefined } };
