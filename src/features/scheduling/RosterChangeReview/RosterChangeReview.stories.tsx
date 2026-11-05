import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RosterChangeReview } from "@/features/scheduling/RosterChangeReview";
import {
	rosterChangePreviewFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterChangeReview",
	component: RosterChangeReview,
	args: {
		names: {
			member: (): string => "Aisha Rahman",
			shift: (): string => "Front Desk AM",
			day: (): string => "Mon, Oct 12",
		},
		preview: rosterChangePreviewFixture(),
		remark: "",
		ticked: false,
		onRemarkChange: fn(),
		onTickedChange: fn(),
	},
} satisfies Meta<typeof RosterChangeReview>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A change nothing stands against: before → after and the coverage note. */
export const Default: Story = {};

/** Approved leave on a schedule generated with leave ignored: a tick and a remark. */
export const NeedsARemark: Story = {
	args: {
		preview: rosterChangePreviewFixture({
			checks: [
				rosterCheckFixture({
					code: "LEAVE_APPROVED",
					severity: "NEEDS_REMARK",
				}),
			],
			needsAcknowledgement: true,
			needsRemark: true,
			checksFingerprint: "f".repeat(64),
		}),
	},
};

/** Still checking. */
export const Checking: Story = { args: { preview: undefined } };
