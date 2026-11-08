import type { Meta, StoryObj } from "@storybook/react-vite";
import { ImportResultPanel } from "@/features/people/ImportResultPanel";
import type { MemberImport } from "@/features/people/import/api";

const finished: MemberImport = {
	importId: "i-1",
	status: "COMPLETED",
	requestedBy: "Moses Lee",
	sendInvitations: false,
	totalRows: 3,
	processedRows: 3,
	addedRows: 1,
	invitePendingRows: 0,
	skippedRows: 1,
	skippedInvalidRows: 0,
	failedRows: 1,
	resolvedRows: 0,
	correctedRows: 0,
	invitablePeople: null,
	invitationsLeftToday: null,
	createdAt: "2026-11-04T08:00:00Z",
	finishedAt: "2026-11-04T08:01:00Z",
	rows: [
		{
			rowNumber: 2,
			result: "SKIPPED_EXISTS",
			code: "ALREADY_MEMBER",
			membershipId: null,
			name: null,
			email: null,
			resolved: false,
			resolvedMembershipId: null,
			resolvedAt: null,
		},
		{
			rowNumber: 3,
			result: "FAILED_ACCOUNT",
			code: "EMAIL_ALREADY_REGISTERED",
			membershipId: null,
			name: "Lim Kok Leong",
			email: "kl.lim@example.com",
			resolved: false,
			resolvedMembershipId: null,
			resolvedAt: null,
		},
	],
};

const meta = {
	title: "Features/People/ImportResultPanel",
	component: ImportResultPanel,
	parameters: { layout: "padded" },
	args: { memberImport: finished },
} satisfies Meta<typeof ImportResultPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Finished: Story = {};

export const AddedSince: Story = {
	args: {
		memberImport: {
			...finished,
			resolvedRows: 1,
			rows: finished.rows.map((row) =>
				row.result === "FAILED_ACCOUNT"
					? {
							...row,
							resolved: true,
							resolvedMembershipId: "m-9",
							resolvedAt: "2026-11-05T09:00:00Z",
						}
					: row
			),
		},
	},
};

export const Stopped: Story = {
	args: {
		memberImport: {
			...finished,
			status: "FAILED",
			totalRows: 5,
		},
	},
};

export const Running: Story = {
	args: {
		memberImport: {
			...finished,
			status: "RUNNING",
			processedRows: 1,
			finishedAt: null,
		},
	},
};
