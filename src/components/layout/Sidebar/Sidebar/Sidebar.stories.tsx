import { Button } from "@/components/ui/Button";
import en from "@/assets/locales/en/translations.json";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sidebar, SidebarItem } from "@/components/layout/Sidebar";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import {
	DashboardIcon,
	DashboardFilledIcon,
	SchedulingIcon,
	SchedulingFilledIcon,
	LeaveIcon,
	LeaveFilledIcon,
	PeopleIcon,
	PeopleFilledIcon,
	OrganisationIcon,
	OrganisationFilledIcon,
} from "@/components/ui/Icon";

const meta = {
	title: "Layout/Sidebar/Sidebar",
	component: Sidebar,
	parameters: { layout: "fullscreen", initialEntry: "/" },
	argTypes: { children: { control: false } },
	args: {
		children: [
			<SidebarItem
				key="dashboard"
				activeIcon={DashboardFilledIcon}
				activeOptions={{ exact: true }}
				icon={DashboardIcon}
				label="Dashboard"
				to="/"
			/>,
			<SidebarItem
				key="scheduling"
				activeIcon={SchedulingFilledIcon}
				icon={SchedulingIcon}
				label="Scheduling"
				search={{ module: "scheduling" }}
				to="/register"
			/>,
			<SidebarItem
				key="leave"
				activeIcon={LeaveFilledIcon}
				icon={LeaveIcon}
				label="Leave"
				search={{ module: "leave" }}
				to="/register"
			/>,
			<SidebarItem
				key="people"
				activeIcon={PeopleFilledIcon}
				icon={PeopleIcon}
				label="People"
				search={{ module: "people" }}
				to="/register"
			/>,
			<SidebarItem
				key="organisation"
				activeIcon={OrganisationFilledIcon}
				icon={OrganisationIcon}
				label="Organisation"
				search={{ module: "organisation" }}
				to="/register"
			/>,
		],
	},
	decorators: [withMemoryRouter],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample Module destinations stay within the app's registered route types.
export const Dashboard: Story = {};
export const Scheduling: Story = {
	parameters: { initialEntry: "/register?module=scheduling" },
};
export const Leave: Story = {
	parameters: { initialEntry: "/register?module=leave" },
};
export const People: Story = {
	parameters: { initialEntry: "/register?module=people" },
};
export const Organisation: Story = {
	parameters: { initialEntry: "/register?module=organisation" },
};

export const WithFooter: Story = {
	args: { footer: <Button>{en.auth.logOut}</Button> },
};
