import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActivityItem } from "@/components/ui/ActivityItem";
import {
	DepartmentIcon,
	OrganisationIcon,
	PermissionsIcon,
	UserIcon,
} from "@/components/ui/Icon";

const meta = {
	title: "UI/ActivityItem",
	component: ActivityItem,
	args: {
		icon: OrganisationIcon,
		title: "Branch created: Orchard",
		details: ["by Aisha Rahman", "2 hours ago"],
	},
	argTypes: { icon: { control: false } },
} satisfies Meta<typeof ActivityItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDetails: Story = { args: { details: [] } };

export const LongTitle: Story = {
	args: {
		title:
			"Department updated: Front Office and Guest Relations, Orchard Road flagship",
	},
	render: (args) => (
		<div className="w-80">
			<ActivityItem {...args} />
		</div>
	),
};

/** The design's Recent Activity list. */
export const List: Story = {
	render: () => (
		<ul className="flex flex-col gap-7">
			<li>
				<ActivityItem
					details={["by Aisha Rahman", "2 hours ago"]}
					icon={OrganisationIcon}
					title="Branch created: Orchard"
				/>
			</li>
			<li>
				<ActivityItem
					details={["by Ethan Wong", "Yesterday"]}
					icon={DepartmentIcon}
					title="Department updated: Front Office"
				/>
			</li>
			<li>
				<ActivityItem
					details={["by Faris Ahmad", "2 days ago"]}
					icon={UserIcon}
					title="Role created: Manager"
				/>
			</li>
			<li>
				<ActivityItem
					details={["by Marcus Tan", "5 days ago"]}
					icon={PermissionsIcon}
					title="Permissions updated for Manager role"
				/>
			</li>
		</ul>
	),
};
