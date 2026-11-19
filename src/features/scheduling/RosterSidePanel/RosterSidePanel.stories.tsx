import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	IssuesPanelHead,
	RosterIssuesList,
} from "@/features/scheduling/roster/IssuesPanel";
import { rosterIssuesFixture } from "@/features/scheduling/roster/rosterIssueFixtures";
import { RosterSidePanel } from "@/features/scheduling/RosterSidePanel";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterSidePanel",
	component: RosterSidePanel,
	parameters: { layout: "padded" },
	args: {
		title: "Changed",
		onClose: fn(),
		sections: [
			{
				key: "days",
				items: [
					{
						key: "a-1",
						title: "Aisha Rahman · Mon, Oct 12",
						lines: [
							"Day off → Front Desk AM · 09:00 – 15:00",
							"Changed Sat, Oct 10 by Moses Lee",
						],
					},
				],
			},
		],
	},
} satisfies Meta<typeof RosterSidePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One list, as Changed shows it. */
export const Default: Story = {};

/** A titled section beside one with nothing in it, which is left out. */
export const WithTitledSection: Story = {
	args: {
		title: "Issues",
		sections: [
			{ key: "empty", title: "Never shown", items: [] },
			{
				key: "startingPoints",
				title: "Where people started the week",
				items: [
					{
						key: "m-1",
						lines: [
							"Aisha Rahman has worked 3 days in a row before this week.",
						],
					},
				],
			},
		],
	},
};

/** An Issues row with a button under its lines, as Find cover sits on a shift left short. */
export const WithItemAction: Story = {
	args: {
		title: "Issues",
		sections: [
			{
				key: "leaveAndCover",
				title: "Leave and cover",
				items: [
					{
						key: "m-1",
						title: "Aisha Rahman · Sat, Oct 17",
						lines: ["On leave: Sick leave", "Needs cover: Front Desk AM"],
						action: { label: "Find cover", onClick: fn() },
					},
				],
			},
		],
	},
};

/** Issues as it opens: "2 to fix · Checked 15:42 · Check again", the filters, then one row per issue. */
export const IssuesAsOneList: Story = {
	args: {
		title: "Issues",
		summary: (
			<IssuesPanelHead
				checkLine={{
					state: "checked",
					checkedAt: new Date(2026, 9, 12, 15, 42).getTime(),
					incomplete: false,
				}}
				mustFix={2}
				onCheck={fn()}
			/>
		),
		sections: [
			{
				key: "issues",
				content: (
					<RosterIssuesList
						issues={rosterIssuesFixture()}
						shiftName={() => "Front Desk AM"}
						onShow={fn()}
					/>
				),
			},
		],
	},
};
