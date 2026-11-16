import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { rosterIssuesFixture } from "@/features/scheduling/roster/rosterIssueFixtures";
import { RosterIssueGroups } from "@/features/scheduling/roster/RosterIssueGroups";

const meta = {
	title: "Features/Scheduling/RosterIssueGroups",
	component: RosterIssueGroups,
	args: {
		issues: rosterIssuesFixture(),
		onFindCover: fn(),
		onShow: fn(),
	},
} satisfies Meta<typeof RosterIssueGroups>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A shift short, a must broken, a rule not met and a note, in their groups. */
export const Mixed: Story = {};

/** Nothing to fix. */
export const NothingWrong: Story = { args: { issues: [] } };
