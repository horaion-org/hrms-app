import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { fn } from "storybook/test";
import { RosterSidePanelSlot } from "@/features/scheduling/GeneratedRoster/RosterSidePanelSlot";
import {
	slotEditingFixture,
	slotRosterFixture,
} from "@/features/scheduling/GeneratedRoster/RosterSidePanelSlot/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/Scheduling/GeneratedRoster/RosterSidePanelSlot",
	component: RosterSidePanelSlot,
	parameters: { layout: "padded" },
	decorators: [
		(Story): ReactElement => (
			<QueryClientProvider client={client}>
				<Story />
			</QueryClientProvider>
		),
	],
	args: {
		roster: slotRosterFixture({ cell: "m-1|2026-10-13" }),
		assignments: scheduleAssignmentsFixture(),
		timeZone: "Asia/Singapore",
		list: {
			id: "side-panel",
			resetKey: "changes|",
			sections: [
				{
					key: "days",
					items: [
						{
							key: "a-1",
							title: "Aisha Rahman · Mon, Oct 12",
							lines: ["Day off → Front Desk AM · 09:00 – 15:00"],
						},
					],
				},
			],
		},
		onClose: fn(),
		onPreviewDays: fn(),
		onApplied: fn(),
	},
} satisfies Meta<typeof RosterSidePanelSlot>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A chosen shift on a read-only roster. */
export const ShiftDetails: Story = {};

/** A chosen day on a roster the viewer may change. */
export const DayEditor: Story = {
	args: {
		roster: slotRosterFixture({ cell: "m-1|2026-10-13" }, true),
		editing: slotEditingFixture(),
	},
};

/** An open list, as Changed shows it. */
export const List: Story = {
	args: {
		roster: {
			...slotRosterFixture({}),
			sidePanel: "list",
			openList: "changes",
		},
	},
};

/** Find cover for a short shift, on a roster that may be changed (its list loads from the API). */
export const FindCover: Story = {
	args: {
		roster: slotRosterFixture({ cover: "front-desk-am-copy|2026-10-17" }, true),
		editing: slotEditingFixture(),
		onCloseCover: fn(),
	},
};
