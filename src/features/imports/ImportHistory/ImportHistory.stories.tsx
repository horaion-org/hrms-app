import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ImportHistory } from "@/features/imports/ImportHistory";

const meta = {
	title: "Features/Imports/ImportHistory",
	component: ImportHistory,
	parameters: { layout: "padded" },
	args: {
		onOpen: fn(),
		entries: [
			{
				kind: "PEOPLE",
				importRecord: {
					importId: "p-1",
					status: "COMPLETED",
					requestedBy: "Moses Lee",
					sendInvitations: false,
					totalRows: 48,
					processedRows: 48,
					addedRows: 45,
					invitePendingRows: 0,
					skippedRows: 0,
					skippedInvalidRows: 0,
					failedRows: 3,
					resolvedRows: 1,
					correctedRows: 0,
					invitablePeople: null,
					invitationsLeftToday: null,
					createdAt: "2026-11-04T03:05:00Z",
					finishedAt: "2026-11-04T03:07:00Z",
					rows: [],
				},
			},
			{
				kind: "ORGANISATION",
				importRecord: {
					importId: "o-1",
					status: "COMPLETED",
					requestedBy: "Moses Lee",
					createdAt: "2026-11-04T02:42:00Z",
					finishedAt: "2026-11-04T02:42:01Z",
					totalRows: 61,
					createdRows: 58,
					skippedRows: 3,
					created: { branches: 4, departments: 18, jobTitles: 36 },
					skipped: { branches: 1, departments: 2, jobTitles: 0 },
					rows: [],
				},
			},
		],
	},
} satisfies Meta<typeof ImportHistory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { entries: [] } };

export const PartlyFailed: Story = { args: { failed: true } };
