import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	rosterChangePreviewFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import { UndoRosterChangeDialog } from "@/features/scheduling/UndoRosterChangeDialog";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/UndoRosterChangeDialog",
	component: UndoRosterChangeDialog,
	args: {
		submitting: false,
		preview: rosterChangePreviewFixture({
			expectedRevision: 2,
			checks: [
				rosterCheckFixture({
					code: "LEAVE_APPROVED",
					severity: "NEEDS_REMARK",
					membershipId: "m-1",
				}),
			],
			needsAcknowledgement: true,
			needsRemark: true,
			checksFingerprint: "e".repeat(64),
		}),
		onConfirm: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof UndoRosterChangeDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Leave approved since the edit, on a schedule generated with leave ignored: tick and remark. */
export const NeedsARemark: Story = {};
