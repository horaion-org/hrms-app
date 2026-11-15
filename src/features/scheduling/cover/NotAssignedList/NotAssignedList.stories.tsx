import type { Meta, StoryObj } from "@storybook/react-vite";
import { NOT_ASSIGNED_FIXTURE } from "@/features/scheduling/cover/engineRepairFixtures";
import { NotAssignedList } from "@/features/scheduling/cover/NotAssignedList";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Cover/NotAssignedList",
	component: NotAssignedList,
	parameters: { layout: "padded" },
	args: { people: NOT_ASSIGNED_FIXTURE },
} satisfies Meta<typeof NotAssignedList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Farid could take it; Dana is on leave; Ella would break the company's rest rule. */
export const PeopleNotAssigned: Story = {};

/** Nobody else holds the shift's job title. */
export const NobodyElse: Story = { args: { people: [] } };

/** The engine could not work it out: nothing shows. */
export const NotKnown: Story = { args: { people: null } };
