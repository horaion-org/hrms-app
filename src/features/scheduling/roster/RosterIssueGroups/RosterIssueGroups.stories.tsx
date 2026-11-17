import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Callout } from "@/components/ui/Callout";
import { rosterIssuesFixture } from "@/features/scheduling/roster/rosterIssueFixtures";
import { RosterIssueGroups } from "@/features/scheduling/roster/RosterIssueGroups";
import "@/common/i18n";

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

/** A shift short, a must broken, a rule not met and a note, in their groups; More information folded. */
export const Mixed: Story = {};

/** The validation card at the head of the groups. */
export const WithValidationCard: Story = {
	args: {
		validationNote: <Callout tone="error">Validated: 1 rule broken</Callout>,
	},
};

/** Nothing to fix: only the green card, no group. */
export const NothingWrong: Story = {
	args: {
		issues: [],
		validationNote: <Callout tone="success">Validated: no rule broken</Callout>,
	},
};
