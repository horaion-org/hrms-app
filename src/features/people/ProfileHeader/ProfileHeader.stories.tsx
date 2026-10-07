import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/Button";
import { EditIcon } from "@/components/ui/Icon";
import { ProfileHeader } from "@/features/people/ProfileHeader";
import "@/common/i18n";

const meta = {
	title: "Features/People/ProfileHeader",
	component: ProfileHeader,
	parameters: { layout: "padded" },
	args: {
		profile: {
			displayName: "Kent Chua",
			employeeCode: "EMP-10392",
			jobTitleName: "Pastry chef",
			status: "ACTIVE",
			invitationPending: false,
		},
		actions: (
			<Button leadingIcon={<EditIcon />} variant="secondary">
				Edit profile
			</Button>
		),
	},
	argTypes: { actions: { control: false } },
} satisfies Meta<typeof ProfileHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Someone who has yet to log in for the first time. */
export const Invited: Story = {
	args: { profile: { ...meta.args.profile, invitationPending: true } },
};

export const Inactive: Story = {
	args: {
		profile: { ...meta.args.profile, status: "INACTIVE", jobTitleName: null },
		actions: undefined,
	},
};
