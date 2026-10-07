import type { Meta, StoryObj } from "@storybook/react-vite";
import { PeopleNotice } from "@/features/people/PeopleNotice";
import "@/common/i18n";

const meta = {
	title: "Features/People/PeopleNotice",
	component: PeopleNotice,
	parameters: { layout: "padded" },
	args: {
		notice: { kind: "saved", name: "Kent Chua", roleNotAssigned: false },
	},
} satisfies Meta<typeof PeopleNotice>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Saved: Story = {};

export const Added: Story = {
	args: {
		notice: { kind: "added", name: "Kent Chua", roleNotAssigned: false },
	},
};

/** Saved, but the system role could not be changed: a warning. */
export const RoleNotChanged: Story = {
	args: { notice: { kind: "saved", name: "Kent Chua", roleNotAssigned: true } },
};

/** Saved, but the changes to their skills were not: a warning. */
export const SkillsNotSaved: Story = {
	args: {
		notice: {
			kind: "saved",
			name: "Kent Chua",
			roleNotAssigned: false,
			skillsNotSaved: true,
		},
	},
};

export const Deactivated: Story = {
	args: {
		notice: { kind: "deactivated", name: "Kent Chua", roleNotAssigned: false },
	},
};
